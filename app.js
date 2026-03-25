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

    /* Google Calendar state */
    const GCAL_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
    const GCAL_CONNECTED_KEY = 'fcplanner_gcal_connected';
    let gCalAccessToken = null;
    let calendarEvents = [];

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
            data.days[dateStr] = { tasks: [], notes: '', deletedTaskIds: [], deletedCalendarEventIds: [] };
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

        // Keep the user signed in across page reloads and browser restarts
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        firebase.auth().onAuthStateChanged(function (user) {
            currentUser = user;
            if (user) {
                syncEnabled = true;
                updateAuthUI(user);
                // Restore Google Calendar token from localStorage
                var savedToken = localStorage.getItem('gCalAccessToken');
                if (savedToken && !gCalAccessToken) {
                    gCalAccessToken = savedToken;
                    updateCalendarSyncUI(true);
                }
                syncFromCloud().then(function () {
                    checkAndRunRollover();
                    renderDay();
                    // Auto-fetch calendar events if token is available
                    if (gCalAccessToken) {
                        fetchCalendarEvents();
                    } else if (localStorage.getItem(GCAL_CONNECTED_KEY) === 'true') {
                        // User previously connected calendar — silently re-acquire token
                        refreshCalendarToken();
                    }
                });
            } else {
                syncEnabled = false;
                updateAuthUI(null);
            }
        });
    }

    function handleSignInResult(result) {
        if (result && result.user) {
            currentUser = result.user;
            syncEnabled = true;
            updateAuthUI(result.user);
        }
        if (result && result.credential && result.credential.accessToken) {
            gCalAccessToken = result.credential.accessToken;
            localStorage.setItem('gCalAccessToken', gCalAccessToken);
            localStorage.setItem(GCAL_CONNECTED_KEY, 'true');
            updateCalendarSyncUI(true);
            fetchCalendarEvents();
        }
    }

    function signIn() {
        if (!isFirebaseAvailable()) {
            showNotification('Firebase not configured. See firebase-config.js for setup instructions.');
            return;
        }
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(GCAL_SCOPES);
        firebase.auth().signInWithPopup(provider).then(handleSignInResult).catch(function (err) {
            console.error('Sign-in failed:', err);
            if (err.code === 'auth/popup-blocked') {
                showNotification('Please allow popups for this site to sign in.');
            } else if (err.code !== 'auth/popup-closed-by-user') {
                showNotification('Sign-in failed: ' + err.message);
            }
        });
    }

    function signOut() {
        if (!isFirebaseAvailable()) return;
        gCalAccessToken = null;
        localStorage.removeItem('gCalAccessToken');
        localStorage.removeItem(GCAL_CONNECTED_KEY);
        updateCalendarSyncUI(false);
        firebase.auth().signOut().catch(function (err) {
            console.error('Sign-out failed:', err);
        });
    }

    function refreshCalendarToken() {
        if (!currentUser) return;
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(GCAL_SCOPES);
        currentUser.reauthenticateWithPopup(provider).then(function (result) {
            if (result.credential && result.credential.accessToken) {
                gCalAccessToken = result.credential.accessToken;
                localStorage.setItem('gCalAccessToken', gCalAccessToken);
                updateCalendarSyncUI(true);
                fetchCalendarEvents();
            }
        }).catch(function (err) {
            console.error('Calendar token refresh failed:', err);
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
                // Combine deleted IDs from both local and cloud
                var localDeleted = local.deletedTaskIds || [];
                var cloudDeleted = cloud.deletedTaskIds || [];
                var allDeletedMap = {};
                localDeleted.concat(cloudDeleted).forEach(function (id) { allDeletedMap[id] = true; });
                var mergedDeletedIds = Object.keys(allDeletedMap);

                var localDeletedCal = local.deletedCalendarEventIds || [];
                var cloudDeletedCal = cloud.deletedCalendarEventIds || [];
                var allDeletedCalMap = {};
                localDeletedCal.concat(cloudDeletedCal).forEach(function (id) { allDeletedCalMap[id] = true; });
                var mergedDeletedCalIds = Object.keys(allDeletedCalMap);

                // Both exist — merge by task ID, excluding deleted tasks
                var mergedTasks = mergeTasks(local.tasks || [], cloud.tasks || [], mergedDeletedIds);
                data.days[dateStr] = {
                    tasks: mergedTasks,
                    notes: (cloud.notes || local.notes || ''),
                    deletedTaskIds: mergedDeletedIds,
                    deletedCalendarEventIds: mergedDeletedCalIds
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
                var task = {
                    id: t.id || generateId(),
                    priority: t.priority || 'C',
                    number: t.number || 1,
                    text: t.text || '',
                    status: t.status || 'open',
                    forwardedTo: t.forwardedTo || null,
                    createdAt: t.createdAt || new Date().toISOString()
                };
                if (t.calendarEventId) {
                    task.calendarEventId = t.calendarEventId;
                }
                return task;
            });
        }
        return {
            tasks: tasks,
            notes: dayData.notes || '',
            deletedTaskIds: dayData.deletedTaskIds || [],
            deletedCalendarEventIds: dayData.deletedCalendarEventIds || []
        };
    }

    function mergeTasks(localTasks, cloudTasks, deletedTaskIds) {
        // Build a set of deleted task IDs for O(1) lookup
        var deletedSet = {};
        if (deletedTaskIds) {
            for (var k = 0; k < deletedTaskIds.length; k++) {
                deletedSet[deletedTaskIds[k]] = true;
            }
        }
        // Build a map by task ID; cloud version wins for duplicates
        var taskMap = {};
        for (var i = 0; i < localTasks.length; i++) {
            if (!deletedSet[localTasks[i].id]) {
                taskMap[localTasks[i].id] = localTasks[i];
            }
        }
        for (var j = 0; j < cloudTasks.length; j++) {
            if (!deletedSet[cloudTasks[j].id]) {
                taskMap[cloudTasks[j].id] = cloudTasks[j];
            }
        }
        // Deduplicate by content — if two tasks have the same text, keep the cloud version
        var contentMap = {};
        var result = [];
        var tasks = Object.keys(taskMap).map(function (id) { return taskMap[id]; });
        for (var m = 0; m < tasks.length; m++) {
            var contentKey = tasks[m].priority + '|' + tasks[m].text.trim().toLowerCase();
            if (!contentMap[contentKey]) {
                contentMap[contentKey] = true;
                result.push(tasks[m]);
            }
        }
        return result;
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
        var calSyncBtn = document.getElementById('calendar-sync-btn');
        var calViewSyncBtn = document.getElementById('cal-view-sync-btn');
        var sbUserName = document.getElementById('sb-user-name');
        var sbAvatar = document.getElementById('sb-avatar');

        if (user) {
            signInBtn.classList.add('hidden');
            signOutBtn.classList.remove('hidden');
            if (calSyncBtn) calSyncBtn.classList.remove('hidden');
            if (calViewSyncBtn) calViewSyncBtn.classList.remove('hidden');
            var firstName = (user.displayName || '').split(' ')[0];
            var email = user.email || '';
            authLabel.textContent = email && firstName ? email + ' (' + firstName + ')' : email || user.displayName || 'Signed in';
            if (sbUserName) sbUserName.textContent = user.displayName || email || 'Signed in';
            if (sbAvatar) sbAvatar.textContent = (firstName || email || '?').charAt(0).toUpperCase();
            setSyncStatus('synced');
        } else {
            signInBtn.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
            if (calSyncBtn) calSyncBtn.classList.add('hidden');
            if (calViewSyncBtn) calViewSyncBtn.classList.add('hidden');
            authLabel.textContent = 'Offline mode';
            if (sbUserName) sbUserName.textContent = 'Not signed in';
            if (sbAvatar) sbAvatar.textContent = '?';
            setSyncStatus('offline');
        }
    }

    function setSyncStatus(status) {
        var indicator = document.getElementById('sync-indicator');
        indicator.classList.remove('sync-offline', 'sync-syncing', 'sync-synced', 'sync-error');

        var sbIcon = document.getElementById('sb-sync-icon');
        var sbLabel = document.getElementById('sb-sync-label');
        var navSync = document.getElementById('nav-sync');

        // Toggle offline highlight class on the nav item (used by mobile CSS)
        if (navSync) {
            navSync.classList.toggle('sync-offline', status !== 'syncing' && status !== 'synced' && status !== 'error');
        }

        switch (status) {
            case 'syncing':
                indicator.classList.add('sync-syncing');
                indicator.title = 'Syncing...';
                if (sbLabel) sbLabel.textContent = 'Syncing...';
                if (sbIcon) sbIcon.style.color = 'var(--gh-amber-400)';
                break;
            case 'synced':
                indicator.classList.add('sync-synced');
                indicator.title = 'Synced to cloud';
                if (sbLabel) sbLabel.textContent = 'Synced';
                if (sbIcon) sbIcon.style.color = 'var(--gh-sage-400)';
                break;
            case 'error':
                indicator.classList.add('sync-error');
                indicator.title = 'Sync error — changes saved locally';
                if (sbLabel) sbLabel.textContent = 'Sync error';
                if (sbIcon) sbIcon.style.color = 'var(--gh-coral-400)';
                break;
            default:
                indicator.classList.add('sync-offline');
                indicator.title = 'Not signed in — data stored locally only';
                if (sbLabel) sbLabel.textContent = 'Sign in';
                if (sbIcon) sbIcon.style.color = 'var(--gh-teal-400)';
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
            var aDone = a.status === 'completed' ? 1 : 0;
            var bDone = b.status === 'completed' ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;
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
        var wasAllComplete = isAllCompleted(day);
        task.status = cycle[task.status] || 'open';
        saveData();
        renderDay();
        animateStatusChange(taskId, task.status);
        if (!wasAllComplete && isAllCompleted(day)) {
            triggerConfetti();
        }
    }

    function animateStatusChange(taskId, newStatus) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var row = document.querySelector('.task-item[data-id="' + taskId + '"]');
        if (!row) return;

        function addAnim(el, cls) {
            el.classList.remove(cls);
            void el.offsetWidth;
            el.classList.add(cls);
            el.addEventListener('animationend', function handler() {
                el.classList.remove(cls);
                el.removeEventListener('animationend', handler);
            });
        }

        if (newStatus === 'completed') {
            var btn = row.querySelector('.task-checkbox');
            if (btn) addAnim(btn, 'anim-complete-pop');
            addAnim(row, 'anim-row-complete');
        } else if (newStatus === 'cancelled') {
            addAnim(row, 'anim-row-cancel');
        }
    }

    function isAllCompleted(day) {
        var actionable = day.tasks.filter(function (t) {
            return t.status !== 'cancelled' && t.status !== 'forwarded';
        });
        if (actionable.length === 0) return false;
        return actionable.every(function (t) { return t.status === 'completed'; });
    }

    function isDayCompleted(dateStr) {
        var dayData = data.days[dateStr];
        if (!dayData || !dayData.tasks || dayData.tasks.length === 0) return false;
        return isAllCompleted(dayData);
    }

    function triggerConfetti() {
        var canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        canvas.classList.add('active');

        var colors = (typeof GoldenHourTokens !== 'undefined') ? GoldenHourTokens.confetti : ['#FFB932', '#1A3A3A', '#3D9A65', '#F06650', '#FFCB66', '#5C9E9E', '#D49A1A', '#8CB3B3'];
        var particles = [];
        for (var i = 0; i < 60; i++) {
            particles.push({
                x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 300,
                y: window.innerHeight * 0.4,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 12 - 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 5 + 3,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }

        var start = performance.now();
        var duration = 2200;
        var raf;

        function frame(now) {
            var elapsed = now - start;
            if (elapsed > duration) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.classList.remove('active');
                return;
            }
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            var fade = elapsed > 1600 ? 1 - (elapsed - 1600) / 600 : 1;

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.vy += 0.25;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.globalAlpha = fade;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
    }

    function calculateStreak() {
        var today = getTodayStr();
        var checkDate = today;
        var streak = 0;
        var looked = 0;

        while (looked < 400) {
            var dayData = data.days[checkDate];
            if (dayData && dayData.tasks && dayData.tasks.length > 0) {
                if (isDayCompleted(checkDate)) {
                    streak++;
                } else {
                    break;
                }
            }
            checkDate = addDays(checkDate, -1);
            looked++;
        }
        return streak;
    }

    function renderStreak() {
        // Update hidden backward-compat element
        var el = document.getElementById('streak-display');
        var streak = calculateStreak();
        if (el) {
            if (streak > 0) {
                el.innerHTML = '<span>\uD83D\uDD25</span> <span class="streak-count">' + streak + '</span> day' + (streak !== 1 ? 's' : '') + ' streak';
            } else {
                el.textContent = '';
            }
        }
        // Update right-panel streak card
        var numEl = document.getElementById('streak-num');
        var subEl = document.getElementById('streak-sub');
        if (numEl) numEl.textContent = streak;
        if (subEl) subEl.textContent = streak > 0 ? streak + ' day' + (streak !== 1 ? 's' : '') + ' in a row!' : 'Complete all tasks to start a streak';
    }

    function getWeekDates(dateStr) {
        var d = parseDate(dateStr);
        var dayOfWeek = d.getDay();
        var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        var monday = new Date(d);
        monday.setDate(d.getDate() + mondayOffset);
        var dates = [];
        for (var i = 0; i < 7; i++) {
            var day = new Date(monday);
            day.setDate(monday.getDate() + i);
            dates.push(toDateStr(day));
        }
        return dates;
    }

    function getCompletionPercent(dateStr) {
        var dayData = data.days[dateStr];
        if (!dayData || !dayData.tasks || dayData.tasks.length === 0) return -1;
        var total = dayData.tasks.length;
        var completed = dayData.tasks.filter(function (t) { return t.status === 'completed'; }).length;
        return Math.round((completed / total) * 100);
    }

    function renderHeatmap() {
        var container = document.getElementById('weekly-heatmap');
        if (!container) return;
        container.innerHTML = '';

        var weekDates = getWeekDates(currentDate);
        var today = getTodayStr();
        var dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

        for (var i = 0; i < 7; i++) {
            var dateStr = weekDates[i];
            var pct = getCompletionPercent(dateStr);

            var col = document.createElement('div');
            col.className = 'heatmap-col';

            var label = document.createElement('div');
            label.className = 'heatmap-label';
            label.textContent = dayLabels[i];

            var square = document.createElement('div');
            square.className = 'heatmap-day';
            square.title = formatDateDisplay(dateStr) + (pct >= 0 ? ' \u2014 ' + pct + '%' : ' \u2014 no tasks');

            if (pct < 0) {
                square.classList.add('no-tasks');
            } else if (pct === 0) {
                square.classList.add('pct-0');
            } else if (pct <= 25) {
                square.classList.add('pct-25');
            } else if (pct <= 50) {
                square.classList.add('pct-50');
            } else if (pct < 100) {
                square.classList.add('pct-75');
            } else {
                square.classList.add('pct-100');
            }

            if (dateStr === today) {
                square.classList.add('is-today');
            }
            if (dateStr === currentDate) {
                square.classList.add('is-current');
            }

            (function (ds) {
                square.addEventListener('click', function () {
                    navigateToDate(ds);
                });
            })(dateStr);

            col.appendChild(label);
            col.appendChild(square);
            container.appendChild(col);
        }
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
            var wasAllComplete = isAllCompleted(day);
            var removed = day.tasks.splice(idx, 1)[0];
            if (!day.deletedTaskIds) day.deletedTaskIds = [];
            day.deletedTaskIds.push(removed.id);
            if (removed.calendarEventId) {
                if (!day.deletedCalendarEventIds) day.deletedCalendarEventIds = [];
                day.deletedCalendarEventIds.push(removed.calendarEventId);
            }
            renumberPriority(day.tasks, removed.priority);
            saveData();
            renderDay();
            if (!wasAllComplete && isAllCompleted(day)) {
                triggerConfetti();
            }
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

        var wasAllComplete = isAllCompleted(srcDay);

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

        if (!wasAllComplete && isAllCompleted(srcDay)) {
            triggerConfetti();
        }
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
        if (gCalAccessToken) {
            fetchCalendarEvents();
        } else {
            calendarEvents = [];
            renderCalendarView();
        }
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
        var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update hidden backward-compat element
        var summaryEl = document.getElementById('task-summary');
        if (total > 0) {
            summaryEl.textContent = completed + ' of ' + total + ' task' + (total !== 1 ? 's' : '') + ' completed';
        } else {
            summaryEl.textContent = '';
        }

        // Update progress summary card
        updateProgressSummary(total, completed, pct);
        updateProgressRing(pct);
        updateSidebarBadge(total - completed);

        // Group tasks by priority and render
        var container = document.getElementById('task-groups');
        container.innerHTML = '';

        if (sorted.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No tasks for this day. Add one below.';
            container.appendChild(empty);
        } else {
            var groups = { A: [], B: [], C: [] };
            for (var i = 0; i < sorted.length; i++) {
                var pri = sorted[i].priority || 'C';
                if (!groups[pri]) groups[pri] = [];
                groups[pri].push(sorted[i]);
            }
            var groupLabels = { A: 'Vital', B: 'Important', C: 'Nice to do' };
            ['A', 'B', 'C'].forEach(function (pri) {
                if (groups[pri].length === 0) return;
                var groupEl = document.createElement('div');
                groupEl.className = 'task-group';

                var header = document.createElement('div');
                header.className = 'tg-header';
                header.innerHTML = '<span>' + pri + ' \u2014 ' + groupLabels[pri] + '</span><span class="tg-count">' + groups[pri].length + '</span>';
                groupEl.appendChild(header);

                for (var j = 0; j < groups[pri].length; j++) {
                    groupEl.appendChild(createTaskItem(groups[pri][j]));
                }
                container.appendChild(groupEl);
            });
        }

        var notesEl = document.getElementById('daily-notes');
        notesEl.value = day.notes || '';
        autoResizeTextarea(notesEl);

        document.getElementById('date-picker').value = currentDate;

        renderStreak();
        renderHeatmap();
        renderMiniCalendar();
    }

    function updateProgressSummary(total, completed, pct) {
        var greetingEl = document.getElementById('ps-greeting');
        var headlineEl = document.getElementById('ps-headline');
        var subEl = document.getElementById('ps-sub');
        var barEl = document.getElementById('ps-bar');
        var doneEl = document.getElementById('ps-done-count');
        var streakEl = document.getElementById('ps-streak');

        if (greetingEl) {
            var h = new Date().getHours();
            greetingEl.textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        }
        if (headlineEl) headlineEl.textContent = completed + ' of ' + total + ' tasks done';
        if (subEl) subEl.textContent = pct === 100 && total > 0 ? 'All done! Great work!' : total === 0 ? 'Add some tasks to get started' : 'Keep going!';
        if (barEl) barEl.style.width = pct + '%';
        if (doneEl) doneEl.textContent = completed;
        if (streakEl) streakEl.textContent = calculateStreak();
    }

    function updateProgressRing(pct) {
        var circle = document.getElementById('ring-fill');
        var label = document.getElementById('ring-label');
        if (!circle || !label) return;
        var r = 17;
        var circumference = 2 * Math.PI * r;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        label.textContent = pct + '%';
    }

    function updateSidebarBadge(remaining) {
        var el = document.getElementById('sb-task-count');
        if (el) el.textContent = remaining > 0 ? remaining : '';
    }

    function createTaskItem(task) {
        var item = document.createElement('div');
        item.className = 'task-item status-' + task.status + ' priority-' + task.priority;
        item.dataset.id = task.id;

        // Checkbox (replaces status-btn)
        var checkbox = document.createElement('button');
        checkbox.className = 'task-checkbox status-' + task.status;
        checkbox.title = 'Status: ' + task.status + ' (click to change)';
        var statusSvgs = {
            open: '',
            completed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
            cancelled: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
            forwarded: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l7 7-7 7"/><path d="M20 12H4"/></svg>'
        };
        checkbox.innerHTML = statusSvgs[task.status] || '';
        checkbox.addEventListener('click', function () { cycleTaskStatus(task.id); });

        // Task body (text + meta)
        var body = document.createElement('div');
        body.className = 'task-body';
        var textArea = document.createElement('textarea');
        textArea.className = 'task-text';
        textArea.value = task.text;
        textArea.rows = 1;
        textArea.readOnly = task.status === 'forwarded';
        textArea.addEventListener('blur', function () { updateTaskText(task.id, textArea.value); });
        textArea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); textArea.blur(); }
        });
        function autoResize() {
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';
        }
        textArea.addEventListener('input', autoResize);
        requestAnimationFrame(autoResize);
        body.appendChild(textArea);

        if (task.status === 'forwarded' && task.forwardedTo) {
            var fwdInfo = document.createElement('span');
            fwdInfo.className = 'forwarded-info editable';
            fwdInfo.textContent = '\u2192 ' + task.forwardedTo;
            fwdInfo.title = 'Click to change forwarded date';
            fwdInfo.addEventListener('click', function () { showEditForwardPicker(task.id, fwdInfo); });
            body.appendChild(fwdInfo);
        }

        // Badges
        var badges = document.createElement('div');
        badges.className = 'task-badges';
        var priBadge = document.createElement('span');
        priBadge.className = 'priority-badge priority-' + task.priority;
        priBadge.textContent = task.priority;
        priBadge.title = 'Click to change priority';
        priBadge.addEventListener('click', function (e) { showPriorityDropdown(e, task.id, task.priority); });
        badges.appendChild(priBadge);

        // Actions
        var actions = document.createElement('div');
        actions.className = 'task-actions-compact';

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
        actions.appendChild(reorderDiv);

        var fwdBtn = document.createElement('button');
        fwdBtn.className = 'forward-btn' + (task.status !== 'open' ? ' invisible' : '');
        fwdBtn.title = 'Forward to another day';
        fwdBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l7 7-7 7"/><path d="M20 12H4"/></svg>';
        fwdBtn.addEventListener('click', function () { showForwardPicker(task.id, item); });
        actions.appendChild(fwdBtn);

        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Delete task';
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>';
        delBtn.addEventListener('click', function () {
            if (confirm('Delete this task?')) deleteTask(task.id);
        });
        actions.appendChild(delBtn);

        item.appendChild(checkbox);
        item.appendChild(body);
        item.appendChild(badges);
        item.appendChild(actions);

        return item;
    }

    /* ===========================
       FORWARD PICKER
       =========================== */

    function changeForwardDate(taskId, sourceDateStr) {
        var srcDay = getDayData(sourceDateStr);
        var task = srcDay.tasks.find(function (t) { return t.id === taskId; });
        if (!task || task.status !== 'forwarded' || !task.forwardedTo) return;

        var oldTarget = task.forwardedTo;
        var oldTargetDay = getDayData(oldTarget);

        // Find the copied task on the old target date (match by text and priority)
        var copiedIdx = oldTargetDay.tasks.findIndex(function (t) {
            return t.text === task.text && t.priority === task.priority && t.status === 'open';
        });

        return {
            oldTarget: oldTarget,
            apply: function (newTarget) {
                if (newTarget === oldTarget) return;

                // Move copied task from old target to new target
                var newTargetDay = getDayData(newTarget);
                if (copiedIdx >= 0) {
                    var copiedTask = oldTargetDay.tasks.splice(copiedIdx, 1)[0];
                    copiedTask.number = getNextNumber(newTargetDay.tasks, copiedTask.priority);
                    newTargetDay.tasks.push(copiedTask);
                } else {
                    // Copied task not found (may have been edited); create a new one
                    var newTask = {
                        id: generateId(),
                        priority: task.priority,
                        number: getNextNumber(newTargetDay.tasks, task.priority),
                        text: task.text,
                        status: 'open',
                        forwardedTo: null,
                        createdAt: new Date().toISOString()
                    };
                    newTargetDay.tasks.push(newTask);
                }

                // Update source task's forwardedTo
                task.forwardedTo = newTarget;
                saveData();
                renderDay();
            }
        };
    }

    function showEditForwardPicker(taskId, fwdInfoElement) {
        var existing = document.querySelector('.forward-picker');
        if (existing) existing.remove();

        var srcDate = currentDate;
        var change = changeForwardDate(taskId, srcDate);
        if (!change) return;

        var picker = document.createElement('div');
        picker.className = 'forward-picker';

        var label = document.createElement('span');
        label.textContent = 'Change date to: ';

        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.min = addDays(srcDate, 1);
        dateInput.value = change.oldTarget;

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'fwd-confirm';
        confirmBtn.textContent = 'Update';
        confirmBtn.addEventListener('click', function () {
            if (dateInput.value && dateInput.value > srcDate) {
                change.apply(dateInput.value);
                picker.remove();
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

        var row = fwdInfoElement.closest('.task-item');
        row.after(picker);
    }

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
                var targetDate = dateInput.value;
                forwardTask(taskId, targetDate);
                picker.remove();
                renderDay();
                showNotification(
                    'Task forwarded to ' + formatDateDisplay(targetDate) + '. ',
                    'Go to that date',
                    function () { navigateToDate(targetDate); }
                );
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

    function showNotification(text, linkText, linkAction) {
        var el = document.getElementById('notification');
        var textEl = document.getElementById('notification-text');
        textEl.textContent = text;

        // Remove any existing link
        var existingLink = el.querySelector('.notification-link');
        if (existingLink) existingLink.remove();

        if (linkText && linkAction) {
            var link = document.createElement('a');
            link.className = 'notification-link';
            link.href = '#';
            link.textContent = linkText;
            link.addEventListener('click', function (e) {
                e.preventDefault();
                el.classList.add('hidden');
                linkAction();
            });
            textEl.after(link);
        }

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
            this.reset();
            textEl.focus();
        });

        function autoResizeTextarea(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }

        var notesEl = document.getElementById('daily-notes');
        notesEl.addEventListener('input', function () { autoResizeTextarea(notesEl); });
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
                if (gCalAccessToken) {
                    fetchCalendarEvents();
                } else {
                    calendarEvents = [];
                    renderCalendarView();
                }
            }
        });

        // Sidebar navigation
        var navItems = document.querySelectorAll('.sb-item[data-view]');
        for (var n = 0; n < navItems.length; n++) {
            navItems[n].addEventListener('click', function () {
                var viewId = this.getAttribute('data-view');
                switchView(viewId);
            });
        }

        // Auth buttons
        document.getElementById('sign-in-btn').addEventListener('click', signIn);
        document.getElementById('sign-out-btn').addEventListener('click', signOut);

        // Clicking the sync status item in sidebar triggers sign-in (if offline) or manual sync
        document.getElementById('nav-sync').addEventListener('click', function () {
            if (syncEnabled && currentUser) {
                syncToCloud();
            } else {
                signIn();
            }
        });

        // Theme toggle
        var themeToggle = document.getElementById('theme-toggle');
        var themeDropdown = document.getElementById('theme-dropdown');

        themeToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            themeDropdown.classList.toggle('hidden');
        });

        var themeBtns = document.querySelectorAll('.theme-btn');
        for (var i = 0; i < themeBtns.length; i++) {
            themeBtns[i].addEventListener('click', function () {
                var theme = this.getAttribute('data-theme');
                applyTheme(theme);
                data.settings.theme = theme;
                saveData();
                themeDropdown.classList.add('hidden');
            });
        }

        document.addEventListener('click', function () {
            themeDropdown.classList.add('hidden');
        });
    }

    var themeIcons = { classic: '\u2619', light: '\u263C', dark: '\u263E' };

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        var toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.textContent = themeIcons[theme] || themeIcons.classic;
        var btns = document.querySelectorAll('.theme-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-theme') === theme) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
    }

    /* ===========================
       GOOGLE CALENDAR INTEGRATION
       =========================== */

    function connectGoogleCalendar() {
        if (!currentUser) {
            showNotification('Please sign in with Google first to connect your calendar.');
            return;
        }

        // If we already have a token, just refresh events
        if (gCalAccessToken) {
            fetchCalendarEvents();
            return;
        }

        // Re-sign in with calendar scope to get an OAuth access token
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope(GCAL_SCOPES);
        firebase.auth().signInWithPopup(provider).then(handleSignInResult).catch(function (err) {
            console.error('Calendar connect failed:', err);
            if (err.code === 'auth/popup-blocked') {
                showNotification('Please allow popups for this site to connect your calendar.');
            } else if (err.code !== 'auth/popup-closed-by-user') {
                showNotification('Could not connect calendar: ' + err.message);
            }
        });
    }

    function fetchCalendarEvents() {
        if (!gCalAccessToken) return;

        var dateObj = parseDate(currentDate);
        var timeMin = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0).toISOString();
        var timeMax = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59).toISOString();

        var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
            '?timeMin=' + encodeURIComponent(timeMin) +
            '&timeMax=' + encodeURIComponent(timeMax) +
            '&singleEvents=true' +
            '&orderBy=startTime' +
            '&maxResults=50';

        fetch(url, {
            headers: { 'Authorization': 'Bearer ' + gCalAccessToken }
        })
        .then(function (res) {
            if (res.status === 401) {
                // Token expired — try to silently refresh
                gCalAccessToken = null;
                localStorage.removeItem('gCalAccessToken');
                if (localStorage.getItem(GCAL_CONNECTED_KEY) === 'true') {
                    refreshCalendarToken();
                } else {
                    updateCalendarSyncUI(false);
                    showNotification('Calendar token expired. Please reconnect your calendar.');
                }
                return null;
            }
            if (!res.ok) {
                return res.json().then(function (errJson) {
                    var msg = (errJson.error && errJson.error.message) || ('HTTP ' + res.status);
                    throw new Error(msg);
                });
            }
            return res.json();
        })
        .then(function (json) {
            if (!json) return;
            calendarEvents = (json.items || []).map(function (evt) {
                return {
                    id: evt.id,
                    title: evt.summary || '(No title)',
                    location: evt.location || '',
                    start: evt.start.dateTime || evt.start.date,
                    end: evt.end.dateTime || evt.end.date,
                    isAllDay: !evt.start.dateTime,
                    hangoutLink: evt.hangoutLink || '',
                    conferenceData: evt.conferenceData || null
                };
            });
            renderCalendarView();
            syncCalendarEventsToTasks();
            if (calendarEvents.length === 0) {
                showNotification('No calendar events found for today.');
            }
        })
        .catch(function (err) {
            console.error('Failed to fetch calendar events:', err);
            showNotification('Calendar sync error: ' + err.message);
        });
    }

    function syncCalendarEventsToTasks() {
        if (calendarEvents.length === 0) return;

        var day = getDayData(currentDate);
        var addedCount = 0;

        for (var i = 0; i < calendarEvents.length; i++) {
            var evt = calendarEvents[i];
            if (evt.isAllDay) continue;

            // Check if a task already exists for this calendar event
            var calTag = '[cal:' + evt.id + ']';
            var exists = day.tasks.some(function (t) {
                if (t.text.indexOf(calTag) !== -1 || t.calendarEventId === evt.id) return true;
                // Also match by event title to catch tasks that lost their calendarEventId
                if (t.text.indexOf(evt.title) !== -1) return true;
                return false;
            });

            // Skip if user previously deleted a task for this calendar event
            var deletedCalIds = day.deletedCalendarEventIds || [];
            if (!exists && deletedCalIds.indexOf(evt.id) !== -1) {
                exists = true;
            }

            if (!exists) {
                var startTime = new Date(evt.start);
                var timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                var meetingText = timeStr + ' — ' + evt.title;
                if (evt.location) meetingText += ' (' + evt.location + ')';

                var task = {
                    id: generateId(),
                    priority: 'B',
                    number: getNextNumber(day.tasks, 'B'),
                    text: meetingText,
                    status: 'open',
                    forwardedTo: null,
                    createdAt: new Date().toISOString(),
                    calendarEventId: evt.id
                };
                day.tasks.push(task);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            saveData();
            renderDay();
            showNotification(addedCount + ' meeting' + (addedCount > 1 ? 's' : '') + ' synced from Google Calendar.');
        }
    }

    function updateCalendarSyncUI(connected) {
        var buttons = [
            { btn: document.getElementById('calendar-sync-btn'), label: document.getElementById('calendar-sync-label') },
            { btn: document.getElementById('cal-view-sync-btn'), label: document.getElementById('cal-view-sync-label') }
        ];

        buttons.forEach(function (pair) {
            if (!pair.btn || !pair.label) return;
            if (connected) {
                pair.label.textContent = 'Synced';
                pair.btn.classList.add('connected');
                pair.btn.title = 'Google Calendar connected — click to refresh';
            } else {
                pair.label.textContent = 'Connect Calendar';
                pair.btn.classList.remove('connected');
                pair.btn.title = 'Connect Google Calendar';
            }
        });
    }

    /* ===========================
       CALENDAR DAY VIEW
       =========================== */

    function renderCalendarView() {
        var timeline = document.getElementById('calendar-timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        // Update header
        var dateObj = parseDate(currentDate);
        var dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        var dayNameEl = document.getElementById('calendar-day-name');
        var dayNumEl = document.getElementById('calendar-day-number');
        if (dayNameEl) dayNameEl.textContent = dayNames[dateObj.getDay()];
        if (dayNumEl) dayNumEl.textContent = dateObj.getDate();

        // Create 24-hour timeline (show 12AM to 11PM)
        var startHour = 0;
        var endHour = 23;

        for (var h = startHour; h <= endHour; h++) {
            var slot = document.createElement('div');
            slot.className = 'calendar-hour-slot';
            slot.dataset.hour = h;

            var label = document.createElement('div');
            label.className = 'calendar-hour-label';
            if (h === 0) {
                label.textContent = '12 AM';
            } else if (h < 12) {
                label.textContent = h + ' AM';
            } else if (h === 12) {
                label.textContent = '12 PM';
            } else {
                label.textContent = (h - 12) + ' PM';
            }

            var content = document.createElement('div');
            content.className = 'calendar-hour-content';

            slot.appendChild(label);
            slot.appendChild(content);
            timeline.appendChild(slot);
        }

        // Place events on the timeline
        for (var i = 0; i < calendarEvents.length; i++) {
            var evt = calendarEvents[i];
            if (evt.isAllDay) continue;

            var evtStart = new Date(evt.start);
            var evtEnd = new Date(evt.end);

            var startMinutes = evtStart.getHours() * 60 + evtStart.getMinutes();
            var endMinutes = evtEnd.getHours() * 60 + evtEnd.getMinutes();
            if (endMinutes <= startMinutes) endMinutes = startMinutes + 30; // minimum 30min display

            var slotHeight = 60; // pixels per hour
            var topPx = (startMinutes / 60) * slotHeight;
            var heightPx = ((endMinutes - startMinutes) / 60) * slotHeight;
            if (heightPx < 24) heightPx = 24;

            var evtEl = document.createElement('div');
            evtEl.className = 'calendar-event';
            evtEl.style.top = topPx + 'px';
            evtEl.style.height = heightPx + 'px';

            var evtTitle = document.createElement('div');
            evtTitle.className = 'calendar-event-title';
            evtTitle.textContent = evt.title;

            var evtTime = document.createElement('div');
            evtTime.className = 'calendar-event-time';
            var startTimeStr = evtStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            evtTime.textContent = startTimeStr;
            if (evt.location) {
                evtTime.textContent += ', ' + evt.location;
            }

            evtEl.appendChild(evtTitle);
            evtEl.appendChild(evtTime);

            // Append to the events container in timeline
            var eventsContainer = timeline.querySelector('.calendar-events-container');
            if (!eventsContainer) {
                eventsContainer = document.createElement('div');
                eventsContainer.className = 'calendar-events-container';
                timeline.appendChild(eventsContainer);
            }
            eventsContainer.appendChild(evtEl);
        }

        // Add current time indicator if viewing today
        if (currentDate === getTodayStr()) {
            var now = new Date();
            var nowMinutes = now.getHours() * 60 + now.getMinutes();
            var nowTop = (nowMinutes / 60) * 60; // 60px per hour

            var timeIndicator = document.createElement('div');
            timeIndicator.className = 'calendar-time-indicator';
            timeIndicator.style.top = nowTop + 'px';

            var timeDot = document.createElement('div');
            timeDot.className = 'calendar-time-dot';

            var timeLine = document.createElement('div');
            timeLine.className = 'calendar-time-line';

            timeIndicator.appendChild(timeDot);
            timeIndicator.appendChild(timeLine);

            var indicatorContainer = timeline.querySelector('.calendar-events-container');
            if (!indicatorContainer) {
                indicatorContainer = document.createElement('div');
                indicatorContainer.className = 'calendar-events-container';
                timeline.appendChild(indicatorContainer);
            }
            indicatorContainer.appendChild(timeIndicator);

            // Auto-scroll to current time
            var scrollTarget = Math.max(0, nowTop - 200);
            timeline.scrollTop = scrollTarget;
        } else {
            // Scroll to 8 AM for non-today dates
            timeline.scrollTop = 8 * 60;
        }
    }

    function renderMiniCalendar() {
        var grid = document.getElementById('mini-cal-grid');
        var titleEl = document.getElementById('rp-month-title');
        if (!grid) return;

        var dateObj = parseDate(currentDate);
        var year = dateObj.getFullYear();
        var month = dateObj.getMonth();
        var today = getTodayStr();

        if (titleEl) titleEl.textContent = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        grid.innerHTML = '';
        var dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        for (var d = 0; d < 7; d++) {
            var hdr = document.createElement('div');
            hdr.className = 'mc-header';
            hdr.textContent = dayHeaders[d];
            grid.appendChild(hdr);
        }

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        // Fill leading blanks
        for (var b = 0; b < firstDay; b++) {
            var blank = document.createElement('div');
            blank.className = 'mc-day other-month';
            grid.appendChild(blank);
        }

        for (var i = 1; i <= daysInMonth; i++) {
            var cell = document.createElement('div');
            cell.className = 'mc-day';
            cell.textContent = i;
            var cellDate = toDateStr(new Date(year, month, i));
            if (cellDate === today) cell.classList.add('is-today');
            if (cellDate === currentDate) cell.classList.add('is-current');
            (function (ds) {
                cell.addEventListener('click', function () { navigateToDate(ds); });
            })(cellDate);
            grid.appendChild(cell);
        }
    }

    function switchView(viewId) {
        document.querySelectorAll('.sb-item[data-view]').forEach(function (el) {
            el.classList.remove('active');
        });
        var navEl = document.querySelector('.sb-item[data-view="' + viewId + '"]');
        if (navEl) navEl.classList.add('active');

        document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
        var viewMap = { today: 'view-today', calendar: 'view-calendar', notes: 'view-notes' };
        var targetView = document.getElementById(viewMap[viewId]);
        if (targetView) targetView.classList.add('active');

        if (viewId === 'calendar') renderCalendarView();
    }

    function init() {
        data = loadData();
        applyTheme(data.settings.theme || 'classic');

        var hash = window.location.hash.slice(1);
        if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
            currentDate = hash;
        }

        // Only run rollover here for offline users; signed-in users
        // run it after syncFromCloud to avoid double-rollover duplicates
        if (!syncEnabled) {
            checkAndRunRollover();
        }
        bindEvents();
        renderDay();
        renderCalendarView();

        // Calendar sync buttons (topbar + calendar view)
        var calSyncBtns = [
            document.getElementById('calendar-sync-btn'),
            document.getElementById('cal-view-sync-btn')
        ];
        calSyncBtns.forEach(function (btn) {
            if (btn) {
                btn.addEventListener('click', function () {
                    if (gCalAccessToken) {
                        fetchCalendarEvents();
                    } else {
                        connectGoogleCalendar();
                    }
                });
            }
        });

        // Initialize Firebase (async — won't block first render)
        initFirebase();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
