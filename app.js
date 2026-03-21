/* === Franklin Covey Daily Planner — App Logic === */

(function () {
    'use strict';

    const STORAGE_KEY = 'fcplanner_data';
    let currentDate = getTodayStr();
    let data = null;
    let currentUser = null;
    let db = null;
    let syncEnabled = false;
    let syncDebounceTimer = null;

    /* ===========================
       DATA LAYER
       =========================== */

    function getDefaultData() {
        return {
            days: {},
            settings: {
                lastVisitedDate: null,
                autoRollover: true,
                theme: 'classic'
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
        scheduleSyncToCloud();
    }

    function getDayData(dateStr) {
        if (!data.days[dateStr]) {
            data.days[dateStr] = { tasks: [], notes: '' };
        }
        return data.days[dateStr];
    }

    /* ===========================
       FIREBASE SYNC
       =========================== */

    function isFirebaseAvailable() {
        return typeof firebase !== 'undefined' &&
               firebase.apps &&
               firebase.apps.length > 0 &&
               firebase.app().options.apiKey !== 'YOUR_API_KEY';
    }

    function initFirebase() {
        if (!isFirebaseAvailable()) {
            console.log('Firebase not configured — running in offline mode.');
            return;
        }

        db = firebase.firestore();

        firebase.auth().onAuthStateChanged(function (user) {
            currentUser = user;
            if (user) {
                syncEnabled = true;
                updateAuthUI(user);
                syncFromCloud().then(function () {
                    checkAndRunRollover();
                    renderDay();
                });
            } else {
                syncEnabled = false;
                updateAuthUI(null);
            }
        });
    }

    function signIn() {
        if (!isFirebaseAvailable()) {
            showNotification('Firebase not configured. See firebase-config.js for setup instructions.');
            return;
        }
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch(function (err) {
            console.error('Sign-in failed:', err);
            showNotification('Sign-in failed: ' + err.message);
        });
    }

    function signOut() {
        if (!isFirebaseAvailable()) return;
        firebase.auth().signOut().catch(function (err) {
            console.error('Sign-out failed:', err);
        });
    }

    function scheduleSyncToCloud() {
        if (!syncEnabled || !currentUser) return;
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(function () {
            syncToCloud();
        }, 1000);
    }

    function syncToCloud() {
        if (!syncEnabled || !currentUser || !db) return;

        setSyncStatus('syncing');

        var userDocRef = db.collection('planners').doc(currentUser.uid);

        // Store settings in main doc
        var settingsPayload = {
            settings: data.settings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        var batch = db.batch();
        batch.set(userDocRef, settingsPayload, { merge: true });

        // Write each day as a subcollection document
        var dayKeys = Object.keys(data.days);
        // Firestore batches max 500 writes — chunk if needed
        var batchPromises = [];
        var currentBatch = batch;
        var writeCount = 1; // 1 for the settings doc

        for (var i = 0; i < dayKeys.length; i++) {
            var dateStr = dayKeys[i];
            var dayDoc = userDocRef.collection('days').doc(dateStr);
            currentBatch.set(dayDoc, data.days[dateStr]);
            writeCount++;

            if (writeCount >= 490) {
                batchPromises.push(currentBatch.commit());
                currentBatch = db.batch();
                writeCount = 0;
            }
        }

        batchPromises.push(currentBatch.commit());

        Promise.all(batchPromises)
            .then(function () {
                setSyncStatus('synced');
            })
            .catch(function (err) {
                console.error('Sync to cloud failed:', err);
                setSyncStatus('error');
            });
    }

    function syncFromCloud() {
        if (!currentUser || !db) return Promise.resolve();

        setSyncStatus('syncing');

        var userDocRef = db.collection('planners').doc(currentUser.uid);

        return userDocRef.get().then(function (doc) {
            var cloudSettings = null;
            if (doc.exists && doc.data().settings) {
                cloudSettings = doc.data().settings;
            }

            // Fetch all day documents
            return userDocRef.collection('days').get().then(function (snapshot) {
                var cloudDays = {};
                snapshot.forEach(function (dayDoc) {
                    cloudDays[dayDoc.id] = dayDoc.data();
                });

                // Merge: cloud data wins for days that exist in cloud,
                // local-only days are preserved
                mergeData(cloudDays, cloudSettings);
                saveDataLocalOnly();
                setSyncStatus('synced');
            });
        }).catch(function (err) {
            console.error('Sync from cloud failed:', err);
            setSyncStatus('error');
        });
    }

    function mergeData(cloudDays, cloudSettings) {
        // Merge days: for each day, take whichever has more tasks
        // or merge by task ID (union of all tasks, cloud version wins for conflicts)
        var allDates = new Set(Object.keys(data.days).concat(Object.keys(cloudDays)));

        allDates.forEach(function (dateStr) {
            var local = data.days[dateStr];
            var cloud = cloudDays[dateStr];

            if (!local && cloud) {
                // Cloud only — take it
                data.days[dateStr] = normalizeDayData(cloud);
            } else if (local && !cloud) {
                // Local only — keep it (will sync up on next save)
            } else if (local && cloud) {
                // Both exist — merge by task ID
                var mergedTasks = mergeTasks(local.tasks || [], cloud.tasks || []);
                data.days[dateStr] = {
                    tasks: mergedTasks,
                    notes: (cloud.notes || local.notes || '')
                };
            }
        });

        // Merge settings — prefer cloud's lastVisitedDate if more recent
        if (cloudSettings) {
            if (cloudSettings.lastVisitedDate && (!data.settings.lastVisitedDate ||
                cloudSettings.lastVisitedDate > data.settings.lastVisitedDate)) {
                data.settings.lastVisitedDate = cloudSettings.lastVisitedDate;
            }
        }
    }

    function normalizeDayData(dayData) {
        // Firestore stores arrays of objects; ensure tasks array has proper structure
        var tasks = [];
        if (Array.isArray(dayData.tasks)) {
            tasks = dayData.tasks.map(function (t) {
                return {
                    id: t.id || generateId(),
                    priority: t.priority || 'C',
                    number: t.number || 1,
                    text: t.text || '',
                    status: t.status || 'open',
                    forwardedTo: t.forwardedTo || null,
                    createdAt: t.createdAt || new Date().toISOString()
                };
            });
        }
        return {
            tasks: tasks,
            notes: dayData.notes || ''
        };
    }

    function mergeTasks(localTasks, cloudTasks) {
        // Build a map by task ID; cloud version wins for duplicates
        var taskMap = {};
        for (var i = 0; i < localTasks.length; i++) {
            taskMap[localTasks[i].id] = localTasks[i];
        }
        for (var j = 0; j < cloudTasks.length; j++) {
            taskMap[cloudTasks[j].id] = cloudTasks[j];
        }
        return Object.keys(taskMap).map(function (id) { return taskMap[id]; });
    }

    function saveDataLocalOnly() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    /* ===========================
       AUTH UI
       =========================== */

    function updateAuthUI(user) {
        var signInBtn = document.getElementById('sign-in-btn');
        var signOutBtn = document.getElementById('sign-out-btn');
        var authLabel = document.getElementById('auth-label');

        if (user) {
            signInBtn.classList.add('hidden');
            signOutBtn.classList.remove('hidden');
            authLabel.textContent = user.displayName || user.email || 'Signed in';
        } else {
            signInBtn.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
            authLabel.textContent = 'Offline mode';
            setSyncStatus('offline');
        }
    }

    function setSyncStatus(status) {
        var indicator = document.getElementById('sync-indicator');
        indicator.classList.remove('sync-offline', 'sync-syncing', 'sync-synced', 'sync-error');

        switch (status) {
            case 'syncing':
                indicator.classList.add('sync-syncing');
                indicator.title = 'Syncing...';
                break;
            case 'synced':
                indicator.classList.add('sync-synced');
                indicator.title = 'Synced to cloud';
                break;
            case 'error':
                indicator.classList.add('sync-error');
                indicator.title = 'Sync error — changes saved locally';
                break;
            default:
                indicator.classList.add('sync-offline');
                indicator.title = 'Not signed in — data stored locally only';
        }
    }

    /* ===========================
       UTILITIES
       =========================== */

    function getTodayStr() {
        return toDateStr(new Date());
    }

    function toDateStr(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function parseDate(str) {
        var parts = str.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function addDays(dateStr, n) {
        var d = parseDate(dateStr);
        d.setDate(d.getDate() + n);
        return toDateStr(d);
    }

    function formatDateDisplay(dateStr) {
        var d = parseDate(dateStr);
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
        var max = 0;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].priority === priority && tasks[i].number > max) max = tasks[i].number;
        }
        return max + 1;
    }

    function sortTasks(tasks) {
        var order = { A: 0, B: 1, C: 2 };
        return tasks.slice().sort(function (a, b) {
            if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
            return a.number - b.number;
        });
    }

    function debounce(fn, ms) {
        var timer;
        return function () {
            var args = arguments;
            var context = this;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(context, args); }, ms);
        };
    }

    /* ===========================
       TASK CRUD
       =========================== */

    function addTask(priority, text) {
        var day = getDayData(currentDate);
        var task = {
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
        var day = getDayData(currentDate);
        var task = day.tasks.find(function (t) { return t.id === taskId; });
        if (task && newText.trim()) {
            task.text = newText.trim();
            saveData();
        }
    }

    function cycleTaskStatus(taskId) {
        var day = getDayData(currentDate);
        var task = day.tasks.find(function (t) { return t.id === taskId; });
        if (!task) return;
        var cycle = { open: 'completed', completed: 'cancelled', cancelled: 'open' };
        if (task.status === 'forwarded') return;
        task.status = cycle[task.status] || 'open';
        saveData();
        renderDay();
    }

    function changePriority(taskId, newPriority) {
        var day = getDayData(currentDate);
        var task = day.tasks.find(function (t) { return t.id === taskId; });
        if (!task || task.priority === newPriority) return;
        task.priority = newPriority;
        task.number = getNextNumber(day.tasks.filter(function (t) { return t.id !== taskId; }), newPriority);
        renumberPriority(day.tasks, task.priority);
        saveData();
        renderDay();
    }

    function renumberPriority(tasks, priority) {
        var group = tasks.filter(function (t) { return t.priority === priority; });
        group.sort(function (a, b) { return a.number - b.number; });
        group.forEach(function (t, i) { t.number = i + 1; });
    }

    function deleteTask(taskId) {
        var day = getDayData(currentDate);
        var idx = day.tasks.findIndex(function (t) { return t.id === taskId; });
        if (idx !== -1) {
            var removed = day.tasks.splice(idx, 1)[0];
            renumberPriority(day.tasks, removed.priority);
            saveData();
            renderDay();
        }
    }

    function moveTask(taskId, direction) {
        var day = getDayData(currentDate);
        var task = day.tasks.find(function (t) { return t.id === taskId; });
        if (!task) return;

        var group = day.tasks
            .filter(function (t) { return t.priority === task.priority; })
            .sort(function (a, b) { return a.number - b.number; });

        var idx = group.findIndex(function (t) { return t.id === taskId; });
        if (idx === -1) return;

        var swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= group.length) return;

        var tmp = task.number;
        task.number = group[swapIdx].number;
        group[swapIdx].number = tmp;

        saveData();
        renderDay();
    }

    /* ===========================
       FORWARDING
       =========================== */

    function forwardTask(taskId, targetDateStr, sourceDateStr) {
        var srcDate = sourceDateStr || currentDate;
        var srcDay = getDayData(srcDate);
        var task = srcDay.tasks.find(function (t) { return t.id === taskId; });
        if (!task) return;

        task.status = 'forwarded';
        task.forwardedTo = targetDateStr;

        var targetDay = getDayData(targetDateStr);
        var newTask = {
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
        var today = getTodayStr();
        var lastDate = data.settings.lastVisitedDate;

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

        var rolledCount = 0;
        var d = lastDate;
        while (d < today) {
            var day = data.days[d];
            if (day) {
                var openTasks = day.tasks.filter(function (t) { return t.status === 'open'; });
                for (var i = 0; i < openTasks.length; i++) {
                    forwardTask(openTasks[i].id, today, d);
                    rolledCount++;
                }
            }
            d = addDays(d, 1);
        }

        data.settings.lastVisitedDate = today;
        saveData();

        if (rolledCount > 0) {
            showNotification(rolledCount + ' task' + (rolledCount > 1 ? 's' : '') + ' rolled over to today.');
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
        var day = getDayData(currentDate);
        var sorted = sortTasks(day.tasks);

        document.getElementById('current-date-label').textContent = formatDateDisplay(currentDate);

        var badge = document.getElementById('date-badge');
        var today = getTodayStr();
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

        var total = day.tasks.length;
        var completed = day.tasks.filter(function (t) { return t.status === 'completed'; }).length;
        var summaryEl = document.getElementById('task-summary');
        if (total > 0) {
            summaryEl.textContent = completed + ' of ' + total + ' task' + (total !== 1 ? 's' : '') + ' completed';
        } else {
            summaryEl.textContent = '';
        }

        var listEl = document.getElementById('task-list');
        listEl.innerHTML = '';

        if (sorted.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No tasks for this day. Add one below.';
            listEl.appendChild(empty);
        } else {
            for (var i = 0; i < sorted.length; i++) {
                listEl.appendChild(createTaskRow(sorted[i]));
            }
        }

        var notesEl = document.getElementById('daily-notes');
        notesEl.value = day.notes || '';

        document.getElementById('date-picker').value = currentDate;
    }

    function createTaskRow(task) {
        var row = document.createElement('div');
        row.className = 'task-row status-' + task.status;
        row.dataset.id = task.id;

        // Priority badge
        var priCol = document.createElement('div');
        priCol.className = 'col-priority';
        var priBadge = document.createElement('span');
        priBadge.className = 'priority-badge priority-' + task.priority;
        priBadge.textContent = task.priority;
        priBadge.title = 'Click to change priority';
        priBadge.addEventListener('click', function (e) { showPriorityDropdown(e, task.id, task.priority); });
        priCol.appendChild(priBadge);

        // Number
        var numCol = document.createElement('div');
        numCol.className = 'col-number';
        var numSpan = document.createElement('span');
        numSpan.className = 'task-number';
        numSpan.textContent = task.number;
        numCol.appendChild(numSpan);

        // Task text (textarea for wrapping)
        var taskCol = document.createElement('div');
        taskCol.className = 'col-task';
        var textArea = document.createElement('textarea');
        textArea.className = 'task-text';
        textArea.value = task.text;
        textArea.rows = 1;
        textArea.readOnly = task.status === 'forwarded';
        textArea.addEventListener('blur', function () { updateTaskText(task.id, textArea.value); });
        textArea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textArea.blur();
            }
        });
        function autoResize() {
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';
        }
        textArea.addEventListener('input', autoResize);
        requestAnimationFrame(autoResize);
        taskCol.appendChild(textArea);

        if (task.status === 'forwarded' && task.forwardedTo) {
            var fwdInfo = document.createElement('span');
            fwdInfo.className = 'forwarded-info';
            fwdInfo.textContent = '\u2192 ' + task.forwardedTo;
            fwdInfo.title = 'Forwarded to ' + formatDateDisplay(task.forwardedTo);
            taskCol.appendChild(fwdInfo);
        }

        // Actions
        var actCol = document.createElement('div');
        actCol.className = 'col-actions';
        var actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        // Reorder buttons
        var day = getDayData(currentDate);
        var group = day.tasks
            .filter(function (t) { return t.priority === task.priority; })
            .sort(function (a, b) { return a.number - b.number; });
        var groupIdx = group.findIndex(function (t) { return t.id === task.id; });

        var reorderDiv = document.createElement('div');
        reorderDiv.className = 'reorder-btns';

        var upBtn = document.createElement('button');
        upBtn.className = 'reorder-btn';
        upBtn.textContent = '\u25B2';
        upBtn.title = 'Move up';
        upBtn.disabled = groupIdx <= 0;
        upBtn.addEventListener('click', function () { moveTask(task.id, -1); });
        reorderDiv.appendChild(upBtn);

        var downBtn = document.createElement('button');
        downBtn.className = 'reorder-btn';
        downBtn.textContent = '\u25BC';
        downBtn.title = 'Move down';
        downBtn.disabled = groupIdx >= group.length - 1;
        downBtn.addEventListener('click', function () { moveTask(task.id, 1); });
        reorderDiv.appendChild(downBtn);

        actionsDiv.appendChild(reorderDiv);

        // Status button
        var statusBtn = document.createElement('button');
        statusBtn.className = 'status-btn status-' + task.status;
        statusBtn.title = 'Status: ' + task.status + ' (click to change)';
        var statusIcons = {
            open: '\u25CB',
            completed: '\u2713',
            cancelled: '\u2715',
            forwarded: '\u2192'
        };
        statusBtn.textContent = statusIcons[task.status] || '\u25CB';
        statusBtn.addEventListener('click', function () { cycleTaskStatus(task.id); });
        actionsDiv.appendChild(statusBtn);

        // Forward button
        var fwdBtn = document.createElement('button');
        fwdBtn.className = 'forward-btn' + (task.status !== 'open' ? ' invisible' : '');
        fwdBtn.title = 'Forward to another day';
        fwdBtn.textContent = '\u21AA';
        fwdBtn.addEventListener('click', function () { showForwardPicker(task.id, row); });
        actionsDiv.appendChild(fwdBtn);

        // Delete button
        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Delete task';
        delBtn.textContent = '\uD83D\uDDD1';
        delBtn.addEventListener('click', function () {
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
        var existing = document.querySelector('.forward-picker');
        if (existing) existing.remove();

        var picker = document.createElement('div');
        picker.className = 'forward-picker';

        var label = document.createElement('span');
        label.textContent = 'Forward to: ';

        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.min = addDays(currentDate, 1);
        dateInput.value = addDays(currentDate, 1);

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'fwd-confirm';
        confirmBtn.textContent = 'Forward';
        confirmBtn.addEventListener('click', function () {
            if (dateInput.value && dateInput.value > currentDate) {
                forwardTask(taskId, dateInput.value);
                picker.remove();
                renderDay();
            }
        });

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'fwd-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function () { picker.remove(); });

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

        var dropdown = document.createElement('div');
        dropdown.className = 'priority-dropdown';
        dropdown.id = 'priority-dropdown';

        var priorities = [
            { value: 'A', label: 'A \u2014 Vital' },
            { value: 'B', label: 'B \u2014 Important' },
            { value: 'C', label: 'C \u2014 Nice to do' }
        ];

        for (var i = 0; i < priorities.length; i++) {
            if (priorities[i].value === currentPriority) continue;
            (function (p) {
                var btn = document.createElement('button');
                btn.textContent = p.label;
                btn.addEventListener('click', function () {
                    changePriority(taskId, p.value);
                    closePriorityDropdown();
                });
                dropdown.appendChild(btn);
            })(priorities[i]);
        }

        var rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.left = rect.left + 'px';

        document.body.appendChild(dropdown);

        setTimeout(function () {
            document.addEventListener('click', closePriorityDropdownOnOutside);
        }, 0);
    }

    function closePriorityDropdown() {
        var el = document.getElementById('priority-dropdown');
        if (el) el.remove();
        document.removeEventListener('click', closePriorityDropdownOnOutside);
    }

    function closePriorityDropdownOnOutside(e) {
        var dd = document.getElementById('priority-dropdown');
        if (dd && !dd.contains(e.target)) {
            closePriorityDropdown();
        }
    }

    /* ===========================
       NOTIFICATION
       =========================== */

    function showNotification(text) {
        var el = document.getElementById('notification');
        var textEl = document.getElementById('notification-text');
        textEl.textContent = text;
        el.classList.remove('hidden');
        setTimeout(function () { el.classList.add('hidden'); }, 6000);
    }

    /* ===========================
       EVENT BINDING & INIT
       =========================== */

    function bindEvents() {
        document.getElementById('prev-day').addEventListener('click', goToPreviousDay);
        document.getElementById('next-day').addEventListener('click', goToNextDay);
        document.getElementById('go-today').addEventListener('click', goToToday);

        var dateLabel = document.getElementById('current-date-label');
        var datePicker = document.getElementById('date-picker');
        dateLabel.addEventListener('click', function () {
            datePicker.showPicker ? datePicker.showPicker() : datePicker.click();
        });
        datePicker.addEventListener('change', function () {
            if (datePicker.value) navigateToDate(datePicker.value);
        });

        document.getElementById('notification-close').addEventListener('click', function () {
            document.getElementById('notification').classList.add('hidden');
        });

        document.getElementById('new-task-text').addEventListener('paste', function (e) {
            var clipboardData = e.clipboardData || window.clipboardData;
            var pasted = clipboardData.getData('text');
            // Match lines starting with bullet characters: •, -, *, ●, ◦, ▪, ▸, or numbered like "1." "2)"
            var lines = pasted.split(/\r?\n/);
            var bulletPattern = /^\s*(?:[•\-\*●◦▪▸►‣⁃]|\d+[\.\):])\s+/;
            var items = [];
            for (var i = 0; i < lines.length; i++) {
                if (bulletPattern.test(lines[i])) {
                    var text = lines[i].replace(bulletPattern, '').trim();
                    if (text) items.push(text);
                }
            }
            if (items.length > 1) {
                e.preventDefault();
                var priority = document.getElementById('new-task-priority').value;
                for (var j = 0; j < items.length; j++) {
                    addTask(priority, items[j]);
                }
                this.value = '';
                this.focus();
            }
        });

        document.getElementById('add-task-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var priorityEl = document.getElementById('new-task-priority');
            var textEl = document.getElementById('new-task-text');
            var text = textEl.value.trim();
            if (!text) return;
            addTask(priorityEl.value, text);
            textEl.value = '';
            textEl.focus();
        });

        var notesEl = document.getElementById('daily-notes');
        var saveNotes = debounce(function () {
            var day = getDayData(currentDate);
            day.notes = notesEl.value;
            saveData();
        }, 500);
        notesEl.addEventListener('input', saveNotes);
        notesEl.addEventListener('blur', function () {
            var day = getDayData(currentDate);
            day.notes = notesEl.value;
            saveData();
        });

        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); goToPreviousDay(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); goToNextDay(); }
            if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToToday(); }
        });

        window.addEventListener('hashchange', function () {
            var hash = window.location.hash.slice(1);
            if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash) && hash !== currentDate) {
                currentDate = hash;
                renderDay();
            }
        });

        // Auth buttons
        document.getElementById('sign-in-btn').addEventListener('click', signIn);
        document.getElementById('sign-out-btn').addEventListener('click', signOut);

        // Theme buttons
        var themeBtns = document.querySelectorAll('.theme-btn');
        for (var i = 0; i < themeBtns.length; i++) {
            themeBtns[i].addEventListener('click', function () {
                applyTheme(this.getAttribute('data-theme'));
                data.settings.theme = this.getAttribute('data-theme');
                saveData();
            });
        }
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        var btns = document.querySelectorAll('.theme-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-theme') === theme) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
    }

    function init() {
        data = loadData();
        applyTheme(data.settings.theme || 'classic');

        var hash = window.location.hash.slice(1);
        if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
            currentDate = hash;
        }

        checkAndRunRollover();
        bindEvents();
        renderDay();

        // Initialize Firebase (async — won't block first render)
        initFirebase();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
