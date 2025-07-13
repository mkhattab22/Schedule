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
    const employeeList = document.getElementById('employeeList');
    const searchInput = document.getElementById('searchInput');
    let allEmployees = [];

    function filterEmployees(searchTerm) {
        const filtered = allEmployees.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderEmployeeList(filtered);
    }

    function renderEmployeeList(employees) {
        employeeList.innerHTML = employees.map(emp => `
            <div class="employee-item" data-id="${emp.employeeId}">
                ${emp.name} - ${formatExcelTime(emp.startTime)}
            </div>
        `).join('');

        // Add click handlers to each employee item
        document.querySelectorAll('.employee-item').forEach(item => {
            item.addEventListener('click', function() {
                selectedEmployee = allEmployees.find(e => e.employeeId === this.dataset.id);
                idVerificationSection.style.display = 'block';
                employeeIdInput.value = '';
                verifyErrorMsg.textContent = '';
            });
        });
    }

    searchInput.addEventListener('input', (e) => {
        filterEmployees(e.target.value);
    });
    const verifyBtn = document.getElementById('verifyBtn');
    const employeeIdInput = document.getElementById('employeeId');
    const errorMsg = document.getElementById('errorMsg');
    const verifyErrorMsg = document.getElementById('verifyErrorMsg');
    const employeeInfo = document.getElementById('employeeInfo');
    const idVerificationSection = document.getElementById('idVerificationSection');
    const confirmationSection = document.getElementById('confirmationSection');
    const confirmBtn = document.getElementById('confirmBtn');
    const confirmationNote = document.getElementById('confirmationNote');
    const successMsg = document.getElementById('successMsg');
    const BASE_URL = 'https://schedul-1754fee4a143.herokuapp.com';

    const urlParams = new URLSearchParams(window.location.search);
    const scheduleDate = urlParams.get('schedule');
    let selectedEmployee = null;

    // Load all employees for the schedule
    async function loadEmployees() {
        try {
            console.log(`Fetching schedule for date: ${scheduleDate}`);
            const response = await fetch(`${BASE_URL}/api/employees/${scheduleDate}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const employees = await response.json();
            console.log('API response:', employees);
            
            if (!employees || employees.length === 0) {
                errorMsg.textContent = 'No schedule found for this date';
                return;
            }

            // Extract date from first employee (all have same date)
            const displayDate = employees[0]?.date 
                ? new Date(employees[0].date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })
                : 'No date';

            document.querySelector('#nameListSection h2').textContent = 
                `Scheduled Employees - ${displayDate}`;
            
            allEmployees = employees;
            renderEmployeeList(employees);
        } catch (err) {
            errorMsg.textContent = 'Failed to load schedule. Please try again later.';
            console.error(err);
        }
    }

    // Verify employee ID
    verifyBtn.addEventListener('click', function() {
        const enteredId = employeeIdInput.value.trim();
        if (!enteredId) {
            verifyErrorMsg.textContent = 'Please enter your employee ID';
            return;
        }

        if (enteredId === selectedEmployee.employeeId) {
            employeeInfo.innerHTML = `
                <div><strong>Name:</strong> ${selectedEmployee.name}</div>
                <div><strong>ID:</strong> ${selectedEmployee.employeeId}</div>
                <div><strong>Date:</strong> ${new Date(selectedEmployee.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                })}</div>
                <div><strong>Start Time:</strong> ${formatExcelTime(selectedEmployee.startTime)}</div>
            `;
            idVerificationSection.style.display = 'none';
            confirmationSection.style.display = 'block';
            verifyErrorMsg.textContent = '';
        } else {
            verifyErrorMsg.textContent = 'ID does not match. Please try again.';
        }
    });

    // Confirm attendance
    confirmBtn.addEventListener('click', async function() {
        try {
            const response = await fetch(`${BASE_URL}/api/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    employeeId: selectedEmployee.employeeId,
                    note: confirmationNote.value.trim()
                })
            });

            if (response.ok) {
                successMsg.textContent = 'Confirmation successful! Thank you.';
                setTimeout(() => {
                    successMsg.textContent = '';
                    confirmationSection.style.display = 'none';
                }, 3000);
            } else {
                verifyErrorMsg.textContent = 'Failed to confirm. Please try again.';
            }
        } catch (err) {
            verifyErrorMsg.textContent = 'Failed to connect to server';
            console.error(err);
        }
    });

    // Initialize
    loadEmployees();
});
