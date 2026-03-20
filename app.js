/* === Franklin Covey Daily Planner — App Logic === */

(function () {
    'use strict';

    const STORAGE_KEY = 'fcplanner_data';
    let currentDate = getTodayStr();
    let data = null;

    /* ===========================
       DATA LAYER
       =========================== */

    function getDefaultData() {
        return {
            days: {},
            settings: {
                lastVisitedDate: null,
                autoRollover: true
            }
        };
    }

    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.days && parsed.settings) return parsed;
            }
        } catch (e) {
            console.warn('Failed to load planner data, starting fresh.', e);
        }
        return getDefaultData();
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getDayData(dateStr) {
        if (!data.days[dateStr]) {
            data.days[dateStr] = { tasks: [], notes: '' };
        }
        return data.days[dateStr];
    }

    /* ===========================
       UTILITIES
       =========================== */

    function getTodayStr() {
        return toDateStr(new Date());
    }

    function toDateStr(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseDate(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function addDays(dateStr, n) {
        const d = parseDate(dateStr);
        d.setDate(d.getDate() + n);
        return toDateStr(d);
    }

    function formatDateDisplay(dateStr) {
        const d = parseDate(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function generateId() {
        return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    }

    function getNextNumber(tasks, priority) {
        let max = 0;
        for (const t of tasks) {
            if (t.priority === priority && t.number > max) max = t.number;
        }
        return max + 1;
    }

    function sortTasks(tasks) {
        const order = { A: 0, B: 1, C: 2 };
        return tasks.slice().sort((a, b) => {
            if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
            return a.number - b.number;
        });
    }

    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    /* ===========================
       TASK CRUD
       =========================== */

    function addTask(priority, text) {
        const day = getDayData(currentDate);
        const task = {
            id: generateId(),
            priority: priority,
            number: getNextNumber(day.tasks, priority),
            text: text,
            status: 'open',
            forwardedTo: null,
            createdAt: new Date().toISOString()
        };
        day.tasks.push(task);
        saveData();
        renderDay();
    }

    function updateTaskText(taskId, newText) {
        const day = getDayData(currentDate);
        const task = day.tasks.find(t => t.id === taskId);
        if (task && newText.trim()) {
            task.text = newText.trim();
            saveData();
        }
    }

    function cycleTaskStatus(taskId) {
        const day = getDayData(currentDate);
        const task = day.tasks.find(t => t.id === taskId);
        if (!task) return;
        const cycle = { open: 'completed', completed: 'cancelled', cancelled: 'open' };
        // Don't cycle forwarded tasks
        if (task.status === 'forwarded') return;
        task.status = cycle[task.status] || 'open';
        saveData();
        renderDay();
    }

    function changePriority(taskId, newPriority) {
        const day = getDayData(currentDate);
        const task = day.tasks.find(t => t.id === taskId);
        if (!task || task.priority === newPriority) return;
        task.priority = newPriority;
        task.number = getNextNumber(day.tasks.filter(t => t.id !== taskId), newPriority);
        renumberPriority(day.tasks, task.priority);
        saveData();
        renderDay();
    }

    function renumberPriority(tasks, priority) {
        const group = tasks.filter(t => t.priority === priority);
        group.sort((a, b) => a.number - b.number);
        group.forEach((t, i) => { t.number = i + 1; });
    }

    function deleteTask(taskId) {
        const day = getDayData(currentDate);
        const idx = day.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            const removed = day.tasks.splice(idx, 1)[0];
            renumberPriority(day.tasks, removed.priority);
            saveData();
            renderDay();
        }
    }

    function moveTask(taskId, direction) {
        const day = getDayData(currentDate);
        const task = day.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Get tasks in the same priority group, sorted by number
        const group = day.tasks
            .filter(t => t.priority === task.priority)
            .sort((a, b) => a.number - b.number);

        const idx = group.findIndex(t => t.id === taskId);
        if (idx === -1) return;

        const swapIdx = idx + direction; // -1 for up, +1 for down
        if (swapIdx < 0 || swapIdx >= group.length) return;

        // Swap numbers
        const tmp = task.number;
        task.number = group[swapIdx].number;
        group[swapIdx].number = tmp;

        saveData();
        renderDay();
    }

    /* ===========================
       FORWARDING
       =========================== */

    function forwardTask(taskId, targetDateStr, sourceDateStr) {
        const srcDate = sourceDateStr || currentDate;
        const srcDay = getDayData(srcDate);
        const task = srcDay.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Mark original as forwarded
        task.status = 'forwarded';
        task.forwardedTo = targetDateStr;

        // Create copy on target date
        const targetDay = getDayData(targetDateStr);
        const newTask = {
            id: generateId(),
            priority: task.priority,
            number: getNextNumber(targetDay.tasks, task.priority),
            text: task.text,
            status: 'open',
            forwardedTo: null,
            createdAt: new Date().toISOString()
        };
        targetDay.tasks.push(newTask);
        saveData();
    }

    /* ===========================
       AUTO-ROLLOVER
       =========================== */

    function checkAndRunRollover() {
        const today = getTodayStr();
        const lastDate = data.settings.lastVisitedDate;

        if (!lastDate) {
            data.settings.lastVisitedDate = today;
            saveData();
            return;
        }

        if (lastDate >= today) {
            data.settings.lastVisitedDate = today;
            saveData();
            return;
        }

        // Gather open tasks from lastDate through yesterday
        let rolledCount = 0;
        let d = lastDate;
        while (d < today) {
            const day = data.days[d];
            if (day) {
                const openTasks = day.tasks.filter(t => t.status === 'open');
                for (const task of openTasks) {
                    forwardTask(task.id, today, d);
                    rolledCount++;
                }
            }
            d = addDays(d, 1);
        }

        data.settings.lastVisitedDate = today;
        saveData();

        if (rolledCount > 0) {
            showNotification(`${rolledCount} task${rolledCount > 1 ? 's' : ''} rolled over to today.`);
        }
    }

    /* ===========================
       NAVIGATION
       =========================== */

    function navigateToDate(dateStr) {
        currentDate = dateStr;
        window.location.hash = dateStr;
        renderDay();
    }

    function goToPreviousDay() {
        navigateToDate(addDays(currentDate, -1));
    }

    function goToNextDay() {
        navigateToDate(addDays(currentDate, 1));
    }

    function goToToday() {
        navigateToDate(getTodayStr());
    }

    /* ===========================
       RENDERING
       =========================== */

    function renderDay() {
        const day = getDayData(currentDate);
        const sorted = sortTasks(day.tasks);

        // Update header
        document.getElementById('current-date-label').textContent = formatDateDisplay(currentDate);

        // Date badge
        const badge = document.getElementById('date-badge');
        const today = getTodayStr();
        badge.classList.remove('today', 'past', 'future', 'hidden');
        if (currentDate === today) {
            badge.textContent = 'Today';
            badge.classList.add('today');
        } else if (currentDate < today) {
            badge.textContent = 'Past';
            badge.classList.add('past');
        } else {
            badge.textContent = 'Future';
            badge.classList.add('future');
        }

        // Task summary
        const total = day.tasks.length;
        const completed = day.tasks.filter(t => t.status === 'completed').length;
        const summaryEl = document.getElementById('task-summary');
        if (total > 0) {
            summaryEl.textContent = `${completed} of ${total} task${total !== 1 ? 's' : ''} completed`;
        } else {
            summaryEl.textContent = '';
        }

        // Task list
        const listEl = document.getElementById('task-list');
        listEl.innerHTML = '';

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No tasks for this day. Add one below.';
            listEl.appendChild(empty);
        } else {
            for (const task of sorted) {
                listEl.appendChild(createTaskRow(task));
            }
        }

        // Notes
        const notesEl = document.getElementById('daily-notes');
        notesEl.value = day.notes || '';

        // Update date picker value
        document.getElementById('date-picker').value = currentDate;
    }

    function createTaskRow(task) {
        const row = document.createElement('div');
        row.className = `task-row status-${task.status}`;
        row.dataset.id = task.id;

        // Priority badge
        const priCol = document.createElement('div');
        priCol.className = 'col-priority';
        const priBadge = document.createElement('span');
        priBadge.className = `priority-badge priority-${task.priority}`;
        priBadge.textContent = task.priority;
        priBadge.title = 'Click to change priority';
        priBadge.addEventListener('click', (e) => showPriorityDropdown(e, task.id, task.priority));
        priCol.appendChild(priBadge);

        // Number
        const numCol = document.createElement('div');
        numCol.className = 'col-number';
        const numSpan = document.createElement('span');
        numSpan.className = 'task-number';
        numSpan.textContent = task.number;
        numCol.appendChild(numSpan);

        // Task text (textarea for wrapping)
        const taskCol = document.createElement('div');
        taskCol.className = 'col-task';
        const textArea = document.createElement('textarea');
        textArea.className = 'task-text';
        textArea.value = task.text;
        textArea.rows = 1;
        textArea.readOnly = task.status === 'forwarded';
        textArea.addEventListener('blur', () => updateTaskText(task.id, textArea.value));
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textArea.blur();
            }
        });
        // Auto-resize height
        function autoResize() {
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';
        }
        textArea.addEventListener('input', autoResize);
        // Resize on next frame so it measures correctly after DOM insertion
        requestAnimationFrame(autoResize);
        taskCol.appendChild(textArea);

        if (task.status === 'forwarded' && task.forwardedTo) {
            const fwdInfo = document.createElement('span');
            fwdInfo.className = 'forwarded-info';
            fwdInfo.textContent = `\u2192 ${task.forwardedTo}`;
            fwdInfo.title = `Forwarded to ${formatDateDisplay(task.forwardedTo)}`;
            taskCol.appendChild(fwdInfo);
        }

        // Actions
        const actCol = document.createElement('div');
        actCol.className = 'col-actions';
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        // Reorder buttons
        const day = getDayData(currentDate);
        const group = day.tasks
            .filter(t => t.priority === task.priority)
            .sort((a, b) => a.number - b.number);
        const groupIdx = group.findIndex(t => t.id === task.id);

        const reorderDiv = document.createElement('div');
        reorderDiv.className = 'reorder-btns';

        const upBtn = document.createElement('button');
        upBtn.className = 'reorder-btn';
        upBtn.textContent = '\u25B2'; // ▲
        upBtn.title = 'Move up';
        upBtn.disabled = groupIdx <= 0;
        upBtn.addEventListener('click', () => moveTask(task.id, -1));
        reorderDiv.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.className = 'reorder-btn';
        downBtn.textContent = '\u25BC'; // ▼
        downBtn.title = 'Move down';
        downBtn.disabled = groupIdx >= group.length - 1;
        downBtn.addEventListener('click', () => moveTask(task.id, 1));
        reorderDiv.appendChild(downBtn);

        actionsDiv.appendChild(reorderDiv);

        // Status button
        const statusBtn = document.createElement('button');
        statusBtn.className = `status-btn status-${task.status}`;
        statusBtn.title = `Status: ${task.status} (click to change)`;
        const statusIcons = {
            open: '\u25CB',       // ○
            completed: '\u2713',  // ✓
            cancelled: '\u2715',  // ✕
            forwarded: '\u2192'   // →
        };
        statusBtn.textContent = statusIcons[task.status] || '\u25CB';
        statusBtn.addEventListener('click', () => cycleTaskStatus(task.id));
        actionsDiv.appendChild(statusBtn);

        // Forward button (only for open tasks)
        const fwdBtn = document.createElement('button');
        fwdBtn.className = `forward-btn${task.status !== 'open' ? ' hidden' : ''}`;
        fwdBtn.title = 'Forward to another day';
        fwdBtn.textContent = '\u21AA'; // ↪
        fwdBtn.addEventListener('click', () => showForwardPicker(task.id, row));
        actionsDiv.appendChild(fwdBtn);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Delete task';
        delBtn.textContent = '\uD83D\uDDD1'; // 🗑
        delBtn.addEventListener('click', () => {
            if (confirm('Delete this task?')) deleteTask(task.id);
        });
        actionsDiv.appendChild(delBtn);

        actCol.appendChild(actionsDiv);

        row.appendChild(priCol);
        row.appendChild(numCol);
        row.appendChild(taskCol);
        row.appendChild(actCol);

        return row;
    }

    /* ===========================
       FORWARD PICKER
       =========================== */

    function showForwardPicker(taskId, rowElement) {
        // Remove any existing picker
        const existing = document.querySelector('.forward-picker');
        if (existing) existing.remove();

        const picker = document.createElement('div');
        picker.className = 'forward-picker';

        const label = document.createElement('span');
        label.textContent = 'Forward to: ';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.min = addDays(currentDate, 1);
        dateInput.value = addDays(currentDate, 1);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'fwd-confirm';
        confirmBtn.textContent = 'Forward';
        confirmBtn.addEventListener('click', () => {
            if (dateInput.value && dateInput.value > currentDate) {
                forwardTask(taskId, dateInput.value);
                picker.remove();
                renderDay();
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'fwd-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => picker.remove());

        picker.appendChild(label);
        picker.appendChild(dateInput);
        picker.appendChild(confirmBtn);
        picker.appendChild(cancelBtn);

        rowElement.after(picker);
    }

    /* ===========================
       PRIORITY DROPDOWN
       =========================== */

    function showPriorityDropdown(event, taskId, currentPriority) {
        closePriorityDropdown();

        const dropdown = document.createElement('div');
        dropdown.className = 'priority-dropdown';
        dropdown.id = 'priority-dropdown';

        const priorities = [
            { value: 'A', label: 'A — Vital' },
            { value: 'B', label: 'B — Important' },
            { value: 'C', label: 'C — Nice to do' }
        ];

        for (const p of priorities) {
            if (p.value === currentPriority) continue;
            const btn = document.createElement('button');
            btn.textContent = p.label;
            btn.addEventListener('click', () => {
                changePriority(taskId, p.value);
                closePriorityDropdown();
            });
            dropdown.appendChild(btn);
        }

        const rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.left = rect.left + 'px';

        document.body.appendChild(dropdown);

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closePriorityDropdownOnOutside);
        }, 0);
    }

    function closePriorityDropdown() {
        const el = document.getElementById('priority-dropdown');
        if (el) el.remove();
        document.removeEventListener('click', closePriorityDropdownOnOutside);
    }

    function closePriorityDropdownOnOutside(e) {
        const dd = document.getElementById('priority-dropdown');
        if (dd && !dd.contains(e.target)) {
            closePriorityDropdown();
        }
    }

    /* ===========================
       NOTIFICATION
       =========================== */

    function showNotification(text) {
        const el = document.getElementById('notification');
        const textEl = document.getElementById('notification-text');
        textEl.textContent = text;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 6000);
    }

    /* ===========================
       EVENT BINDING & INIT
       =========================== */

    function bindEvents() {
        // Navigation
        document.getElementById('prev-day').addEventListener('click', goToPreviousDay);
        document.getElementById('next-day').addEventListener('click', goToNextDay);
        document.getElementById('go-today').addEventListener('click', goToToday);

        // Date picker (click on date label)
        const dateLabel = document.getElementById('current-date-label');
        const datePicker = document.getElementById('date-picker');
        dateLabel.addEventListener('click', () => {
            datePicker.showPicker ? datePicker.showPicker() : datePicker.click();
        });
        datePicker.addEventListener('change', () => {
            if (datePicker.value) navigateToDate(datePicker.value);
        });

        // Notification close
        document.getElementById('notification-close').addEventListener('click', () => {
            document.getElementById('notification').classList.add('hidden');
        });

        // Add task form
        document.getElementById('add-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const priorityEl = document.getElementById('new-task-priority');
            const textEl = document.getElementById('new-task-text');
            const text = textEl.value.trim();
            if (!text) return;
            addTask(priorityEl.value, text);
            textEl.value = '';
            textEl.focus();
        });

        // Notes auto-save
        const notesEl = document.getElementById('daily-notes');
        const saveNotes = debounce(() => {
            const day = getDayData(currentDate);
            day.notes = notesEl.value;
            saveData();
        }, 500);
        notesEl.addEventListener('input', saveNotes);
        notesEl.addEventListener('blur', () => {
            const day = getDayData(currentDate);
            day.notes = notesEl.value;
            saveData();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (e.key === 'ArrowLeft') { e.preventDefault(); goToPreviousDay(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); goToNextDay(); }
            if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToToday(); }
        });

        // Hash navigation (back/forward)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash) && hash !== currentDate) {
                currentDate = hash;
                renderDay();
            }
        });
    }

    function init() {
        data = loadData();

        // Check URL hash for initial date
        const hash = window.location.hash.slice(1);
        if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
            currentDate = hash;
        }

        // Run rollover before first render
        checkAndRunRollover();

        bindEvents();
        renderDay();
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
