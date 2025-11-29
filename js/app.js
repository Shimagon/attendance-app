// ==========================================
// Constants & Configuration
// ==========================================
const APP_VERSION = '1.0.0';
const STORAGE_KEYS = {
    USER_SETTINGS: 'attendanceApp_userSettings',
    TODAY_ATTENDANCE: 'attendanceApp_todayAttendance',
    HISTORY: 'attendanceApp_history',
    PENDING_QUEUE: 'attendanceApp_pendingQueue',
    TASK_COMPLETED: 'attendanceApp_taskCompleted'
};

const STATUS = {
    NOT_CLOCKED_IN: 'not_clocked_in',
    CLOCKED_IN: 'clocked_in',
    CLOCKED_OUT: 'clocked_out'
};

const EVENT_TYPE = {
    CLOCK_IN: 'clock_in',
    CLOCK_OUT: 'clock_out',
    TASK_COMPLETED: 'task_completed'
};

// API設定
const API_CONFIG = {
    LINE_NOTIFY_URL: '', // 後でLINE Messaging APIのエンドポイントを設定
    SPREADSHEET_ID: '1MaCsDpwYOtNn8hqywq300hThzMIXOhPnkS6LvcUskuk',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzcQ7XriEVHqwTChmeu97cjB1BFOZMP0VyfZYbNdW0swX5IwIiVCujxYcCsLQQJ-fxuIw/exec'
};

// ==========================================
// State Management
// ==========================================
let currentUser = null;
let todayAttendance = null;
let workDurationInterval = null;
let currentTimeInterval = null;

// ==========================================
// DOM Elements
// ==========================================
const elements = {
    // Screens
    setupScreen: document.getElementById('setup-screen'),
    mainScreen: document.getElementById('main-screen'),
    settingsScreen: document.getElementById('settings-screen'),

    // Setup
    setupForm: document.getElementById('setup-form'),
    userNameInput: document.getElementById('user-name-input'),

    // Main Screen
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    headerUserName: document.getElementById('header-user-name'),
    statusBadge: document.getElementById('status-badge'),
    statusTime: document.getElementById('status-time'),
    statusDuration: document.getElementById('status-duration'),
    clockInBtn: document.getElementById('clock-in-btn'),
    clockOutBtn: document.getElementById('clock-out-btn'),
    taskCompleteBtn: document.getElementById('task-complete-btn'),
    todayClockIn: document.getElementById('today-clock-in'),
    todayClockOut: document.getElementById('today-clock-out'),
    todayDuration: document.getElementById('today-duration'),

    // Settings
    settingsBtn: document.getElementById('settings-btn'),
    backBtn: document.getElementById('back-btn'),
    updateNameForm: document.getElementById('update-name-form'),
    updateUserName: document.getElementById('update-user-name'),
    resetDataBtn: document.getElementById('reset-data-btn'),

    // UI Feedback
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    loadingOverlay: document.getElementById('loading-overlay'),
    networkStatus: document.getElementById('network-status'),
    networkMessage: document.getElementById('network-message')
};

// ==========================================
// Initialization
// ==========================================
function init() {
    loadUserSettings();
    checkNetworkStatus();
    setupEventListeners();

    if (currentUser && currentUser.isInitialized) {
        showMainScreen();
        loadTodayAttendance();
        updateUI();
        startWorkDurationTimer();
        startCurrentTimeDisplay();
    } else {
        showSetupScreen();
    }

    // Service Worker登録
    registerServiceWorker();
}

// ==========================================
// Screen Management
// ==========================================
function showSetupScreen() {
    hideAllScreens();
    elements.setupScreen.classList.remove('hidden');
}

function showMainScreen() {
    hideAllScreens();
    elements.mainScreen.classList.remove('hidden');
    elements.headerUserName.textContent = currentUser.userName;

    // 現在時刻表示を開始（PWA起動時にも確実に動作させる）
    if (!currentTimeInterval) {
        startCurrentTimeDisplay();
    }
}

function showSettingsScreen() {
    hideAllScreens();
    elements.settingsScreen.classList.remove('hidden');
    elements.updateUserName.value = currentUser.userName;
}

function hideAllScreens() {
    elements.setupScreen.classList.add('hidden');
    elements.mainScreen.classList.add('hidden');
    elements.settingsScreen.classList.add('hidden');
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    // Setup
    elements.setupForm.addEventListener('submit', handleSetupSubmit);

    // Main Actions
    elements.clockInBtn.addEventListener('click', handleClockIn);
    elements.clockOutBtn.addEventListener('click', handleClockOut);
    elements.taskCompleteBtn.addEventListener('click', handleTaskComplete);

    // Settings
    elements.settingsBtn.addEventListener('click', showSettingsScreen);
    elements.backBtn.addEventListener('click', showMainScreen);
    elements.updateNameForm.addEventListener('submit', handleUpdateName);
    elements.resetDataBtn.addEventListener('click', handleResetData);

    // Network Status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

// ==========================================
// LocalStorage Operations
// ==========================================
function loadUserSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (data) {
        currentUser = JSON.parse(data);
    }
}

function saveUserSettings(userName) {
    currentUser = {
        userName: userName,
        isInitialized: true,
        createdAt: new Date().toISOString(),
        appVersion: APP_VERSION
    };
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(currentUser));
}

function loadTodayAttendance() {
    const today = getToday();
    const data = localStorage.getItem(STORAGE_KEYS.TODAY_ATTENDANCE);

    if (data) {
        todayAttendance = JSON.parse(data);
        // 日付が変わっていたらリセット
        if (todayAttendance.date !== today) {
            todayAttendance = createNewAttendance();
            saveTodayAttendance();
        }
    } else {
        todayAttendance = createNewAttendance();
        saveTodayAttendance();
    }
}

function createNewAttendance() {
    return {
        date: getToday(),
        clockInTime: null,
        clockOutTime: null,
        workDuration: null,
        status: STATUS.NOT_CLOCKED_IN
    };
}

function saveTodayAttendance() {
    localStorage.setItem(STORAGE_KEYS.TODAY_ATTENDANCE, JSON.stringify(todayAttendance));
}

function saveToHistory(eventType, data) {
    const history = getHistory();
    const record = {
        id: `${Date.now()}_${eventType}`,
        date: getToday(),
        userName: currentUser.userName,
        eventType: eventType,
        timestamp: new Date().toISOString(),
        clockInTime: data.clockInTime || null,
        clockOutTime: data.clockOutTime || null,
        workDuration: data.workDuration || null,
        synced: false
    };

    history.push(record);

    // 直近30日分のみ保持
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filtered = history.filter(item => new Date(item.date) >= thirtyDaysAgo);

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
    return record;
}

function getHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
}

function addToPendingQueue(type, payload) {
    const queue = getPendingQueue();
    queue.push({
        id: `${Date.now()}_pending`,
        type: type,
        payload: payload,
        retryCount: 0,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
}

function getPendingQueue() {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
    return data ? JSON.parse(data) : [];
}

function clearPendingQueue() {
    localStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify([]));
}

// ==========================================
// Setup Handlers
// ==========================================
function handleSetupSubmit(e) {
    e.preventDefault();
    const userName = elements.userNameInput.value.trim();

    if (userName.length === 0 || userName.length > 50) {
        showToast('名前は1〜50文字で入力してください');
        return;
    }

    saveUserSettings(userName);
    showMainScreen();
    loadTodayAttendance();
    updateUI();
    showToast(`ようこそ、${userName}さん！`);
}

// ==========================================
// Clock In/Out Handlers
// ==========================================
async function handleClockIn() {
    if (todayAttendance.status === STATUS.CLOCKED_IN) {
        showToast('既に出勤済みです');
        return;
    }

    showLoading();

    const now = new Date();
    todayAttendance.clockInTime = now.toISOString();
    todayAttendance.status = STATUS.CLOCKED_IN;
    saveTodayAttendance();

    // 履歴に保存
    const record = saveToHistory(EVENT_TYPE.CLOCK_IN, {
        clockInTime: todayAttendance.clockInTime
    });

    // 外部通知
    await sendNotifications(EVENT_TYPE.CLOCK_IN, {
        userName: currentUser.userName,
        timestamp: now.toISOString()
    });

    updateUI();
    startWorkDurationTimer();
    hideLoading();
    showToast('出勤を記録しました');
}

async function handleClockOut() {
    if (todayAttendance.status !== STATUS.CLOCKED_IN) {
        showToast('先に出勤打刻をしてください');
        return;
    }

    showLoading();

    const now = new Date();
    todayAttendance.clockOutTime = now.toISOString();
    todayAttendance.status = STATUS.CLOCKED_OUT;

    // 勤務時間を計算
    const duration = calculateDuration(
        new Date(todayAttendance.clockInTime),
        now
    );
    todayAttendance.workDuration = duration;
    saveTodayAttendance();

    // 履歴に保存
    const record = saveToHistory(EVENT_TYPE.CLOCK_OUT, {
        clockInTime: todayAttendance.clockInTime,
        clockOutTime: todayAttendance.clockOutTime,
        workDuration: duration
    });

    // 外部通知
    await sendNotifications(EVENT_TYPE.CLOCK_OUT, {
        userName: currentUser.userName,
        timestamp: now.toISOString(),
        workDuration: duration,
        clockInTime: todayAttendance.clockInTime // 追加: LINE通知用に必要
    });

    stopWorkDurationTimer();
    updateUI();
    hideLoading();
    showToast(`お疲れ様でした！勤務時間: ${formatDuration(duration)}`);
}

async function handleTaskComplete() {
    const confirmed = confirm('課題完了報告を送信しますか？\n管理者にアプリURLが送信されます。');
    if (!confirmed) return;

    showLoading();

    // GitHub PagesのURLを使用
    const appUrl = 'https://Shimagon.github.io/attendance-app/';
    const now = new Date();

    // 完了フラグを保存
    const completionData = {
        isCompleted: true,
        completedAt: now.toISOString(),
        reportedUrl: appUrl
    };
    localStorage.setItem(STORAGE_KEYS.TASK_COMPLETED, JSON.stringify(completionData));

    // 外部通知
    await sendNotifications(EVENT_TYPE.TASK_COMPLETED, {
        userName: currentUser.userName,
        timestamp: now.toISOString(),
        appUrl: appUrl
    });

    hideLoading();
    showToast('課題完了報告を送信しました');
}

// ==========================================
// Notification Functions
// ==========================================
async function sendNotifications(eventType, data) {
    const promises = [];

    // LINE通知
    if (API_CONFIG.LINE_NOTIFY_URL) {
        promises.push(sendLineNotification(eventType, data));
    }

    // スプレッドシート記録
    if (API_CONFIG.APPS_SCRIPT_URL) {
        promises.push(sendToSpreadsheet(eventType, data));
    }

    try {
        await Promise.all(promises);
    } catch (error) {
        console.error('Notification error:', error);
        // オフラインまたはエラー時はキューに追加
        addToPendingQueue('notification', { eventType, data });
    }
}

async function sendLineNotification(eventType, data) {
    if (!API_CONFIG.LINE_NOTIFY_URL) {
        console.log('LINE通知スキップ（API未設定）');
        return;
    }

    let message = '';

    switch (eventType) {
        case EVENT_TYPE.CLOCK_IN:
            message = `【出勤打刻】\n氏名: ${data.userName}\n時刻: ${formatDateTime(data.timestamp)}`;
            break;
        case EVENT_TYPE.CLOCK_OUT:
            message = `【退勤打刻】\n氏名: ${data.userName}\n時刻: ${formatDateTime(data.timestamp)}\n勤務時間: ${formatDuration(data.workDuration)}`;
            break;
        case EVENT_TYPE.TASK_COMPLETED:
            message = `【課題完了報告】\n氏名: ${data.userName}\n時刻: ${formatDateTime(data.timestamp)}\nアプリURL: ${data.appUrl}`;
            break;
    }

    console.log('LINE通知:', message);

    // 実際のLINE Messaging API呼び出し（API設定後に有効化）
    // const response = await fetch(API_CONFIG.LINE_NOTIFY_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ message })
    // });
    // return response.json();
}

async function sendToSpreadsheet(eventType, data) {
    if (!API_CONFIG.APPS_SCRIPT_URL) {
        console.log('スプレッドシート記録スキップ（API未設定）');
        return;
    }

    // 研修生IDを取得（ユーザー設定から、なければuser01）
    const userId = currentUser?.userId || 'user01';

    let payload = {};

    // イベントタイプごとにペイロードを作成
    if (eventType === EVENT_TYPE.CLOCK_IN) {
        // 出勤時: 打刻記録シートに記録
        payload = {
            action: 'clockIn',
            userId: userId,
            userName: data.userName,
            date: getToday(),
            clockInTime: formatTime(data.timestamp)
        };
    } else if (eventType === EVENT_TYPE.CLOCK_OUT) {
        // 退勤時: 打刻記録シートに記録
        payload = {
            action: 'clockOut',
            userId: userId,
            userName: data.userName,
            date: getToday(),
            clockInTime: formatTime(data.clockInTime),
            clockOutTime: formatTime(data.timestamp),
            workDuration: formatDuration(data.workDuration)
        };
    } else if (eventType === EVENT_TYPE.TASK_COMPLETED) {
        // 課題完了: 課題完了記録シートに記録
        payload = {
            action: 'taskComplete',
            userId: userId,
            userName: data.userName,
            completedAt: formatDateTime(data.timestamp),
            appUrl: data.appUrl
        };
    }

    console.log('📊 スプレッドシート記録 送信データ:', payload);
    console.log('📊 送信先URL:', API_CONFIG.APPS_SCRIPT_URL);

    try {
        const response = await fetch(API_CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            // mode: 'no-cors', // 削除: レスポンスを受け取るため
            headers: {
                'Content-Type': 'text/plain', // 修正: CORSプリフライト回避
            },
            body: JSON.stringify(payload)
        });
        console.log('✅ スプレッドシート記録リクエスト送信完了 (no-corsのためレスポンス確認不可)');
        return response;
    } catch (error) {
        console.error('❌ スプレッドシート記録エラー:', error);
        throw error;
    }
}

// ==========================================
// Settings Handlers
// ==========================================
function handleUpdateName(e) {
    e.preventDefault();
    const newName = elements.updateUserName.value.trim();

    if (newName.length === 0 || newName.length > 50) {
        showToast('名前は1〜50文字で入力してください');
        return;
    }

    currentUser.userName = newName;
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(currentUser));

    elements.headerUserName.textContent = newName;
    showToast('ユーザー名を変更しました');
    showMainScreen();
}

function handleResetData() {
    const confirmed = confirm('本当に全データをリセットしますか？\nこの操作は取り消せません。');
    if (!confirmed) return;

    // 全データを削除
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });

    showToast('全データをリセットしました');

    // 再初期化
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ==========================================
// UI Update Functions
// ==========================================
function updateUI() {
    if (!todayAttendance) return;

    // ステータスバッジ
    switch (todayAttendance.status) {
        case STATUS.NOT_CLOCKED_IN:
            elements.statusBadge.textContent = '未出勤';
            elements.statusBadge.className = 'status-badge';
            elements.statusTime.textContent = '--:--';
            elements.clockInBtn.disabled = false;
            elements.clockOutBtn.disabled = true;
            break;
        case STATUS.CLOCKED_IN:
            elements.statusBadge.textContent = '勤務中';
            elements.statusBadge.className = 'status-badge working';
            elements.statusTime.textContent = formatTime(todayAttendance.clockInTime);
            elements.clockInBtn.disabled = true;
            elements.clockOutBtn.disabled = false;
            break;
        case STATUS.CLOCKED_OUT:
            elements.statusBadge.textContent = '退勤済み';
            elements.statusBadge.className = 'status-badge completed';
            elements.statusTime.textContent = formatTime(todayAttendance.clockOutTime);
            elements.clockInBtn.disabled = true;
            elements.clockOutBtn.disabled = true;
            break;
    }

    // 本日の記録
    elements.todayClockIn.textContent = todayAttendance.clockInTime
        ? formatTime(todayAttendance.clockInTime)
        : '--:--';
    elements.todayClockOut.textContent = todayAttendance.clockOutTime
        ? formatTime(todayAttendance.clockOutTime)
        : '--:--';
    elements.todayDuration.textContent = todayAttendance.workDuration
        ? formatDuration(todayAttendance.workDuration)
        : '--';

    // 勤務時間表示の更新
    updateWorkDuration();
}

function updateWorkDuration() {
    if (todayAttendance.status === STATUS.CLOCKED_IN && todayAttendance.clockInTime) {
        const duration = calculateDuration(
            new Date(todayAttendance.clockInTime),
            new Date()
        );
        elements.statusDuration.textContent = `勤務時間: ${formatDuration(duration)}`;
    } else if (todayAttendance.status === STATUS.CLOCKED_OUT && todayAttendance.workDuration) {
        elements.statusDuration.textContent = `勤務時間: ${formatDuration(todayAttendance.workDuration)}`;
    } else {
        elements.statusDuration.textContent = '勤務時間: --';
    }
}

function startWorkDurationTimer() {
    stopWorkDurationTimer();
    if (todayAttendance.status === STATUS.CLOCKED_IN) {
        workDurationInterval = setInterval(updateWorkDuration, 60000); // 1分ごとに更新
    }
}

function stopWorkDurationTimer() {
    if (workDurationInterval) {
        clearInterval(workDurationInterval);
        workDurationInterval = null;
    }
}

// ==========================================
// Network Status
// ==========================================
function checkNetworkStatus() {
    if (navigator.onLine) {
        hideNetworkStatus();
        processPendingQueue();
    } else {
        showNetworkStatus();
    }
}

function handleOnline() {
    hideNetworkStatus();
    showToast('オンラインに復帰しました');
    processPendingQueue();
}

function handleOffline() {
    showNetworkStatus();
    showToast('オフラインモードです');
}

function showNetworkStatus() {
    elements.networkStatus.classList.remove('hidden');
    elements.networkMessage.textContent = 'オフライン';
}

function hideNetworkStatus() {
    elements.networkStatus.classList.add('hidden');
}

async function processPendingQueue() {
    const queue = getPendingQueue();
    if (queue.length === 0) return;

    console.log(`未送信データを処理中: ${queue.length}件`);

    for (const item of queue) {
        try {
            await sendNotifications(item.payload.eventType, item.payload.data);
        } catch (error) {
            console.error('再送失敗:', error);
        }
    }

    clearPendingQueue();
    showToast('未送信データを送信しました');
}

// ==========================================
// Current Time Display
// ==========================================
function startCurrentTimeDisplay() {
    updateCurrentTime();
    currentTimeInterval = setInterval(updateCurrentTime, 1000); // 1秒ごとに更新
}

function stopCurrentTimeDisplay() {
    if (currentTimeInterval) {
        clearInterval(currentTimeInterval);
        currentTimeInterval = null;
    }
}

function updateCurrentTime() {
    if (!elements.currentTime || !elements.currentDate) {
        console.warn('現在時刻表示の要素が見つかりません');
        return;
    }

    const now = new Date();
    let displayDate = new Date(now);
    let hours = now.getHours();

    // 30時間制対応
    if (hours < 6) {
        hours += 24;
        displayDate.setDate(displayDate.getDate() - 1);
    }

    // 時刻表示（HH:MM:SS）
    const hoursStr = String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // 秒数を小さくするためにHTMLを使用
    elements.currentTime.innerHTML = `${hoursStr}:${minutes}<span class="time-seconds">:${seconds}</span>`;

    // 日付表示（YYYY年MM月DD日）
    const year = displayDate.getFullYear();
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const day = String(displayDate.getDate()).padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[displayDate.getDay()];
    elements.currentDate.textContent = `${year}年${month}月${day}日（${weekday}）`;
}

// ==========================================
// UI Feedback Functions
// ==========================================
function showToast(message, duration = 3000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
}

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// ==========================================
// Utility Functions
// ==========================================
function getToday() {
    const now = new Date();
    // 30時間制対応: 午前6時までは前日扱い
    if (now.getHours() < 6) {
        now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
}

function formatTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // 30時間制対応: 午前0時〜5時は24時〜29時として表示
    if (hours < 6) {
        hours += 24;
    }

    return `${hours}:${minutes}`;
}

function formatDateTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);

    // 30時間制対応
    let displayDate = new Date(date);
    let hours = date.getHours();

    if (hours < 6) {
        hours += 24;
        displayDate.setDate(displayDate.getDate() - 1);
    }

    const year = displayDate.getFullYear();
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const day = String(displayDate.getDate()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function calculateDuration(startTime, endTime) {
    const diff = endTime - startTime;
    return Math.floor(diff / 1000 / 60); // 分単位
}

function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
}

// ==========================================
// Service Worker Registration
// ==========================================
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// ==========================================
// App Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', init);
