document.addEventListener('DOMContentLoaded', () => {
    const state = {
        workers: ['Worker 1']
    };

    const elements = {
        workersList: document.getElementById('workersList'),
        addWorkerBtn: document.getElementById('addWorkerBtn'),
        generateBtn: document.getElementById('generateBtn'),
        saveBtn: document.getElementById('saveBtn'),
        yearInput: document.getElementById('yearInput'),
        container: document.getElementById('calendarContainer')
    };

    // Render initial workers
    renderWorkers();

    // Event listeners
    elements.addWorkerBtn.addEventListener('click', () => {
        state.workers.push(`Worker ${state.workers.length + 1}`);
        renderWorkers();
    });

    elements.generateBtn.addEventListener('click', generateCalendars);
    elements.saveBtn.addEventListener('click', saveConfiguration);

    function renderWorkers() {
        elements.workersList.innerHTML = '';
        state.workers.forEach((worker, index) => {
            const row = document.createElement('div');
            row.className = 'worker-row';
            row.innerHTML = `
                <input type="text" class="input-field worker-name-input" value="${worker}" data-index="${index}">
                <button class="icon-btn remove-btn" ${state.workers.length === 1 ? 'disabled' : ''}>×</button>
            `;

            // Update state on input change
            const input = row.querySelector('input');
            input.addEventListener('change', (e) => {
                state.workers[index] = e.target.value;
            });

            // Remove handler
            const removeBtn = row.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => {
                if (state.workers.length > 1) {
                    state.workers.splice(index, 1);
                    renderWorkers();
                }
            });

            elements.workersList.appendChild(row);
        });
    }

    async function generateCalendars() {
        const year = parseInt(elements.yearInput.value);
        elements.generateBtn.textContent = 'Generating...';
        elements.generateBtn.disabled = true;

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: year,
                    workers: state.workers.filter(w => w.trim() !== '')
                })
            });

            const data = await response.json();
            if (data.calendars) {
                renderCalendars(data.calendars);
            } else if (data.error) {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to generate calendar. Check console for details.');
        } finally {
            elements.generateBtn.textContent = 'Generate Schedule';
            elements.generateBtn.disabled = false;
        }
    }

    function renderCalendars(calendars) {
        elements.container.innerHTML = '';

        calendars.forEach(cal => {
            const wrapper = document.createElement('div');
            wrapper.className = 'calendar-wrapper';

            // Generate stats
            const days = cal.data.days;
            const workDays = days.filter(d => d.is_work_day).length;
            const restDays = days.filter(d => d.is_rest_day).length;

            wrapper.innerHTML = `
                <div class="worker-title">
                    ${cal.worker} 
                    <span class="worker-badge">${cal.data.year}</span>
                    <span class="worker-badge" style="margin-left:auto">Work: ${workDays}</span>
                    <span class="worker-badge">Rest: ${restDays}</span>
                </div>
                <div class="months-grid">
                    ${renderMonths(days)}
                </div>
            `;
            elements.container.appendChild(wrapper);
        });
    }

    function renderMonths(days) {
        // Group by month
        const months = {};
        for (let i = 1; i <= 12; i++) months[i] = [];

        days.forEach(day => {
            const month = parseInt(day.date.split('-')[1]);
            months[month].push(day);
        });

        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        return Object.entries(months).map(([mStr, mDays]) => {
            const m = parseInt(mStr);
            // Determine start day of week for padding
            if (mDays.length === 0) return '';

            const firstDateStr = mDays[0].date;
            // Create date object manually to avoid TZ issues
            const [y, mo, d] = firstDateStr.split('-').map(Number);
            const firstDate = new Date(y, mo - 1, d);
            const startDay = firstDate.getDay(); // 0 is Sunday

            let html = `
                <div class="month-card">
                    <div class="month-name">${monthNames[m - 1]}</div>
                    <div class="days-grid">
                        ${'<div class="day-cell empty"></div>'.repeat(startDay)}
                        ${mDays.map(d => {
                let typeClass = '';
                if (d.day_type === 'WORK') typeClass = 'work';
                else if (d.day_type === 'REST') typeClass = 'rest';
                else if (d.day_type === 'ORDERING') typeClass = 'ordering';
                else if (d.day_type === 'HOLIDAY' || d.day_type === 'WORKING_HOLIDAY') typeClass = 'holiday';

                const dayNum = d.date.split('-')[2];
                return `<div class="day-cell ${typeClass}" title="${d.date} - ${d.day_type}">${parseInt(dayNum)}</div>`;
            }).join('')}
                    </div>
                </div>
            `;
            return html;
        }).join('');
    }

    async function saveConfiguration() {
        const originalText = elements.saveBtn.textContent;
        elements.saveBtn.textContent = 'Saving...';
        elements.saveBtn.disabled = true;

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workers: state.workers, year: elements.yearInput.value })
            });
            const data = await response.json();
            alert(data.message);
        } catch (e) {
            alert('Error saving configuration');
        } finally {
            elements.saveBtn.textContent = originalText;
            elements.saveBtn.disabled = false;
        }
    }
});
