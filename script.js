document.addEventListener('DOMContentLoaded', function() {
    const processBtn = document.getElementById('processBtn');
    const excelFileInput = document.getElementById('excelFile');
    const dateInput = document.getElementById('scheduleDate');
    const linksContainer = document.getElementById('linksContainer');
    const statusContainer = document.getElementById('statusContainer');
    const resultsSection = document.querySelector('.results-section');
    const BASE_URL = 'https://schedul-1754fee4a143.herokuapp.com';

    // Real-time updates via polling
    let refreshInterval;
    let currentDate = '';

    async function fetchConfirmations(date) {
        try {
            const response = await fetch(`${BASE_URL}/api/employees/${date}`);
            return await response.json();
        } catch (err) {
            console.error('Error fetching confirmations:', err);
            return [];
        }
    }

    async function updateStatusDisplay() {
        const employees = await fetchConfirmations(currentDate);
        statusContainer.innerHTML = employees
            .map(emp => `
                <div class="employee-status ${emp.confirmed ? 'confirmed' : 'pending'}">
                    <span>${emp.name}</span>
                    ${emp.confirmed ? 
                        `<span class="timestamp">Confirmed at ${new Date(emp.timestamp).toLocaleTimeString()}</span>` : 
                        '<span class="pending">Pending</span>'}
                    ${emp.note ? `<div class="note">Note: ${emp.note}</div>` : ''}
                </div>
            `)
            .join('');
    }

    // Process Excel file and upload to backend
    processBtn.addEventListener('click', async function() {
        const file = excelFileInput.files[0];
        currentDate = dateInput.value || new Date().toISOString().split('T')[0];
        
        if (!file) {
            alert('Please select an Excel file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('date', currentDate);

        try {
            const response = await fetch(`${BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (response.ok) {
                // Generate WhatsApp links
                const employees = await fetchConfirmations(currentDate);
                linksContainer.innerHTML = employees
                    .map(emp => `
                        <a href="https://wa.me/?text=Confirm%20your%20shift%20${encodeURIComponent(emp.name)}%20-%20${window.location.href}?id=${emp.employeeId}"
                           class="whatsapp-link" target="_blank">
                           Send to ${emp.name}
                        </a><br>
                    `)
                    .join('');

                resultsSection.style.display = 'block';
                // Start polling for updates
                clearInterval(refreshInterval);
                refreshInterval = setInterval(updateStatusDisplay, 5000);
                updateStatusDisplay();
            } else {
                alert(`Error: ${result.error || 'Failed to process file'}`);
            }
        } catch (err) {
            alert('Failed to connect to server');
            console.error(err);
        }
    });

    // Handle confirmation from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = urlParams.get('id');
    if (employeeId) {
        document.getElementById('confirmationSection').style.display = 'block';
        document.getElementById('confirmBtn').addEventListener('click', async function() {
            const note = document.getElementById('confirmationNote').value;
            try {
                await fetch(`${BASE_URL}/api/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employeeId, note })
                });
                alert('Confirmation recorded!');
            } catch (err) {
                alert('Failed to confirm');
            }
        });
    }
});
