// Format Excel time value (decimal) to HH:MM AM/PM
function formatExcelTime(timeValue) {
    if (typeof timeValue === 'number') {
        const hours = Math.floor(timeValue * 24);
        const minutes = Math.floor((timeValue * 24 - hours) * 60);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    return timeValue; // Return as-is if not a number
}

document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('uploadBtn');
    const excelFileInput = document.getElementById('excelFile');
    const scheduleDateInput = document.getElementById('scheduleDate');
    const adminMessageInput = document.getElementById('adminMessage');
    const shareLinkContainer = document.getElementById('shareLinkContainer');
    const copyBtn = document.getElementById('copyBtn');
    const statusContainer = document.getElementById('statusContainer');
    const historyContainer = document.getElementById('historyContainer');
    const BASE_URL = 'https://schedul-1754fee4a143.herokuapp.com';

    let currentScheduleId = null;
    let refreshInterval = null;

    // Upload Excel file
    uploadBtn.addEventListener('click', async function() {
        const file = excelFileInput.files[0];
        const message = adminMessageInput.value;

        if (!file) {
            alert('Please select an Excel file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (message) formData.append('message', message);

        try {
            const response = await fetch(`${BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok) {
                // Use and log the date from server response
                console.log('Server response:', result);
                if (result.date) {
                    const dateObj = new Date(result.date);
                    console.log('Parsed date:', dateObj.toISOString());
                    currentScheduleId = dateObj.toISOString().split('T')[0];
                } else {
                    currentScheduleId = new Date().toISOString().split('T')[0];
                }
                console.log('Using schedule date:', currentScheduleId);
                updateShareLink();
                startStatusUpdates();
                alert(`Schedule uploaded successfully! ${result.count} employees added.`);
            } else {
                alert(`Error: ${result.error || 'Failed to process file'}`);
            }
        } catch (err) {
            alert('Failed to connect to server');
            console.error(err);
        }
    });

    // Generate shareable link
    function updateShareLink() {
        if (!currentScheduleId) return;
        const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
        // Convert to ISO date format (YYYY-MM-DD) for API compatibility
        const formattedDate = new Date(currentScheduleId).toISOString().split('T')[0];
        const link = `${baseUrl}/index.html?schedule=${formattedDate}`;
        shareLinkContainer.textContent = link;
    }

    // Copy link to clipboard
    copyBtn.addEventListener('click', function() {
        const link = shareLinkContainer.textContent;
        if (link) {
            navigator.clipboard.writeText(link)
                .then(() => alert('Link copied to clipboard!'))
                .catch(err => console.error('Failed to copy:', err));
        }
    });

    // Fetch and display confirmation status
    async function updateStatusDisplay() {
        if (!currentScheduleId) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/employees/${currentScheduleId}`);
            const employees = await response.json();

            statusContainer.innerHTML = employees.map(emp => `
                <div class="employee-card ${emp.confirmed ? 'confirmed' : 'pending'}">
                    <strong>${emp.name}</strong>
                    <div>ID: ${emp.employeeId}</div>
                    <div>Date: ${new Date(emp.date).toLocaleDateString('en-US', {timeZone: 'UTC'})}</div>
                    <div>Start Time: ${formatExcelTime(emp.startTime)}</div>
                    <div>Status: ${emp.confirmed ? 
                        `Confirmed at ${new Date(emp.timestamp).toLocaleString()}` : 
                        'Not confirmed'}</div>
                    ${emp.note ? `<div>Note: ${emp.note}</div>` : ''}
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching status:', err);
        }
    }

    // Load and display historical schedules
    async function loadHistoricalSchedules() {
        try {
            const response = await fetch(`${BASE_URL}/api/uploads`);
            const uploads = await response.json();
            
            historyContainer.innerHTML = uploads.map(upload => `
                <div class="employee-card" onclick="loadSchedule('${upload.date}')">
                    <strong>${new Date(upload.date).toLocaleDateString()}</strong>
                    <div>Uploaded: ${new Date(upload.uploadDate).toLocaleString()}</div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading history:', err);
        }
    }

    // Load a specific schedule
    function loadSchedule(date) {
        currentScheduleId = date;
        updateShareLink();
        startStatusUpdates();
    }

    // Start auto-refresh
    function startStatusUpdates() {
        clearInterval(refreshInterval);
        updateStatusDisplay();
        refreshInterval = setInterval(updateStatusDisplay, 5000);
    }

    // Initialize if there's a schedule in URL
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleParam = urlParams.get('schedule');
    if (scheduleParam) {
        currentScheduleId = scheduleParam;
        updateShareLink();
        startStatusUpdates();
    }
    
    // Load historical schedules
    loadHistoricalSchedules();
});
