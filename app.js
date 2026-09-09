let appData = null;
let currentMonth = "ספטמבר 2026";
const monthsList = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", 
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

// בעת טעינת הדף
window.addEventListener('DOMContentLoaded', () => {
    initMonthDropdowns();
    loadDataFromGitHub();
});

// אתחול רשימות בחירת חודש ושנה בהדר
function initMonthDropdowns() {
    const nameSelect = document.getElementById('new-month-name');
    const yearSelect = document.getElementById('new-month-year');
    
    if (!nameSelect || !yearSelect) return;

    nameSelect.innerHTML = '';
    monthsList.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        nameSelect.appendChild(opt);
    });

    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 3; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

// ניהול טוקן גישה ל-GitHub
function toggleTokenSettings() {
    const panel = document.getElementById('token-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        const tokenInput = document.getElementById('github-token-input');
        if (tokenInput) {
            tokenInput.value = localStorage.getItem('github_token') || '';
        }
    }
}

function saveToken() {
    const tokenInput = document.getElementById('github-token-input');
    if (!tokenInput) return;
    const token = tokenInput.value.trim();
    if (token) {
        localStorage.setItem('github_token', token);
        showStatus('הטוקן נשמר בהצלחה בדפדפן!', 'success');
        toggleTokenSettings();
    } else {
        showStatus('אנא הזן טוקן תקין', 'error');
    }
}

// הודעות מערכת
function showStatus(text, type = 'success') {
    const msgDiv = document.getElementById('status-message');
    if (!msgDiv) return;
    msgDiv.textContent = text;
    msgDiv.className = `p-4 rounded-xl text-sm font-medium shadow-sm ${
        type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
    }`;
    msgDiv.classList.remove('hidden');
    setTimeout(() => {
        msgDiv.classList.add('hidden');
    }, 4000);
}

// טעינת נתונים מ-GitHub
async function loadDataFromGitHub() {
    try {
        const response = await fetch('data.json?' + new Date().getTime());
        if (!response.ok) throw new Error('שגיאה בטעינת קובץ הנתונים');
        appData = await response.json();
        
        // וידוא מבנים בסיסיים
        if (!appData.monthly_fees) appData.monthly_fees = {};
        if (!appData.studio_sessions_payment) appData.studio_sessions_payment = {};
        if (!appData.trial_students) appData.trial_students = {};

        updateMonthSelectOptions();
        renderApp();
    } catch (error) {
        console.error(error);
        showStatus('שגיאה בטעינת הנתונים מהשרת', 'error');
    }
}

// עדכון בחירת חודשים קיימים בדרופדאון הראשי
function updateMonthSelectOptions() {
    const select = document.getElementById('month-select');
    if (!select || !appData || !appData.payments) return;

    const existingMonths = Object.keys(appData.payments);
    if (!existingMonths.includes(currentMonth) && existingMonths.length > 0) {
        currentMonth = existingMonths[0];
    }

    select.innerHTML = '';
    existingMonths.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === currentMonth) opt.selected = true;
        select.appendChild(opt);
    });
}

function changeMonth() {
    const select = document.getElementById('month-select');
    if (select) {
        currentMonth = select.value;
        renderApp();
    }
}

// הוספת חודש חדש
function addNewMonthFromDropdown() {
    const nameSel = document.getElementById('new-month-name');
    const yearSel = document.getElementById('new-month-year');
    if (!nameSel || !yearSel) return;

    const newMonthName = `${nameSel.value} ${yearSel.value}`;
    if (appData.payments[newMonthName]) {
        showStatus('החודש כבר קיים במערכת', 'error');
        return;
    }

    // אתחול מבנים לחודש החדש
    appData.payments[newMonthName] = {};
    appData.trial_students[newMonthName] = {};
    appData.studio_sessions_payment[newMonthName] = [
        { session_number: 1, status: "לא שולם" },
        { session_number: 2, status: "לא שולם" },
        { session_number: 3, status: "לא שולם" },
        { session_number: 4, status: "לא שולם" }
    ];

    // יצירת תלמידים קבועים לחודש החדש
    appData.students.forEach(s => {
        appData.payments[newMonthName][s] = {
            status: "לא שולם",
            paid_amount: 0,
            allocation: "current",
            notes: ""
        };
    });

    currentMonth = newMonthName;
    updateMonthSelectOptions();
    renderApp();
    showStatus(`החודש ${newMonthName} נוסף בהצלחה!`);
}

// רינדור כל המסך
function renderApp() {
    if (!appData) return;

    // הגדרות סכומים
    const monthlyFeeInput = document.getElementById('monthly-feeapp') || document.getElementById('monthly-fee-input');
    const currentFee = getEffectiveMonthlyFee(currentMonth);
    if (monthlyFeeInput) monthlyFeeInput.value = currentFee;

    const trialFeeInput = document.getElementById('trial-fee-input');
    if (trialFeeInput) trialFeeInput.value = appData.settings.trial_fee || 50;

    const rentPerSessionInput = document.getElementById('studio-rent-per-session-input');
    if (rentPerSessionInput) rentPerSessionInput.value = appData.settings.studio_rent_per_session || 0;

    const sessionsCountInput = document.getElementById('studio-sessions-count-input');
    if (sessionsCountInput) sessionsCountInput.value = appData.settings.studio_sessions_count || 4;

    // וידוא שכל התלמידים הקבועים קיימים בחודש הנוכחי
    if (!appData.payments[currentMonth]) appData.payments[currentMonth] = {};
    appData.students.forEach(s => {
        if (!appData.payments[currentMonth][s]) {
            appData.payments[currentMonth][s] = {
                status: "לא שולם",
                paid_amount: 0,
                allocation: "current",
                notes: ""
            };
        }
    });

    renderPaymentsTable();
    renderTrialTable();
    renderStudentsManagementList();
    renderStudioRentCheckboxes();
    calculateFinancialSummary();
}

// שליפת סכום חודשי אפקטיבי לחודש
function getEffectiveMonthlyFee(monthKey) {
    if (appData.monthly_fees && appData.monthly_fees[monthKey] !== undefined) {
        return appData.monthly_fees[monthKey];
    }
    return appData.settings.monthly_fee;
}

function updateMonthlyFee(val) {
    const num = Number(val);
    if (isNaN(num)) return;
    if (!appData.monthly_fees) appData.monthly_fees = {};
    appData.monthly_fees[currentMonth] = num;
    renderPaymentsTable();
    calculateFinancialSummary();
}

function updateTrialFee(val) {
    const num = Number(val);
    if (isNaN(num)) return;
    appData.settings.trial_fee = num;
    renderTrialTable();
    calculateFinancialSummary();
}

function updateStudioRentSettings() {
    const rentInput = document.getElementById('studio-rent-per-session-input');
    const countInput = document.getElementById('studio-sessions-count-input');
    if (rentInput && countInput) {
        appData.settings.studio_rent_per_session = Number(rentInput.value) || 0;
        appData.settings.studio_sessions_count = Number(countInput.value) || 4;
        
        // התאמת מערך המפגשים אם השתנתה הכמות
        if (!appData.studio_sessions_payment[currentMonth]) {
            appData.studio_sessions_payment[currentMonth] = [];
        }
        const currentArr = appData.studio_sessions_payment[currentMonth];
        const targetCount = appData.settings.studio_sessions_count;
        
        while (currentArr.length < targetCount) {
            currentArr.push({ session_number: currentArr.length + 1, status: "לא שולם" });
        }
        if (currentArr.length > targetCount) {
            appData.studio_sessions_payment[currentMonth] = currentArr.slice(0, targetCount);
        }

        renderStudioRentCheckboxes();
        calculateFinancialSummary();
    }
}

// טבלת תשלומים ראשית
function renderPaymentsTable() {
    const tbody = document.getElementById('payments-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const monthPayments = appData.payments[currentMonth] || {};
    const effectiveFee = getEffectiveMonthlyFee(currentMonth);

    appData.students.forEach((studentName, index) => {
        const studentData = monthPayments[studentName] || { status: "לא שולם", paid_amount: 0, allocation: "current", notes: "" };
        if (studentData.notes === undefined) studentData.notes = "";

        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white hover:bg-sky-50/50 transition' : 'bg-slate-50/60 hover:bg-sky-50/50 transition';

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-800">${studentName}</td>
            <td class="py-3 px-4">
                <select onchange="updatePaymentField('${studentName}', 'status', this.value)" class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium shadow-sm">
                    <option value="לא שולם" ${studentData.status === 'לא שולם' ? 'selected' : ''}>לא שולם</option>
                    <option value="שולם חלקי" ${studentData.status === 'שולם חלקי' ? 'selected' : ''}>שולם חלקי</option>
                    <option value="שולם" ${studentData.status === 'שולם' ? 'selected' : ''}>שולם מלא</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="number" value="${studentData.paid_amount}" onchange="updatePaymentField('${studentName}', 'paid_amount', this.value)" class="w-24 border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white font-bold text-center shadow-inner">
            </td>
            <td class="py-3 px-4">
                <select onchange="updatePaymentField('${studentName}', 'allocation', this.value)" class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium shadow-sm">
                    <option value="current" ${studentData.allocation === 'current' ? 'selected' : ''}>חודש נוכחי</option>
                    <option value="carried_over" ${studentData.allocation === 'carried_over' ? 'selected' : ''}>שויך כגרירה לעתיד</option>
                </select>
            </td>
            <td class="py-3 px-4 font-bold text-rose-700">
                ${Math.max(0, effectiveFee - studentData.paid_amount)} ₪
            </td>
            <td class="py-3 px-4">
                <input type="text" value="${escapeHtml(studentData.notes)}" onchange="updatePaymentField('${studentName}', 'notes', this.value)" placeholder="הערה..." class="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white shadow-inner focus:ring-2 focus:ring-sky-500 focus:outline-none">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePaymentField(studentName, field, value) {
    if (!appData.payments[currentMonth][studentName]) {
        appData.payments[currentMonth][studentName] = { status: "לא שולם", paid_amount: 0, allocation: "current", notes: "" };
    }
    
    if (field === 'paid_amount') {
        const valNum = Number(value) || 0;
        appData.payments[currentMonth][studentName].paid_amount = valNum;
        const effectiveFee = getEffectiveMonthlyFee(currentMonth);
        if (valNum >= effectiveFee) {
            appData.payments[currentMonth][studentName].status = 'שולם';
        } else if (valNum > 0) {
            appData.payments[currentMonth][studentName].status = 'שולם חלקי';
        } else {
            appData.payments[currentMonth][studentName].status = 'לא שולם';
        }
    } else if (field === 'notes') {
        appData.payments[currentMonth][studentName].notes = value;
    } else {
        appData.payments[currentMonth][studentName][field] = value;
    }

    renderPaymentsTable();
    calculateFinancialSummary();
}

// טבלת תלמידי ניסיון
function renderTrialTable() {
    const tbody = document.getElementById('trial-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!appData.trial_students[currentMonth]) appData.trial_students[currentMonth] = {};
    const trials = appData.trial_students[currentMonth];
    const trialFee = appData.settings.trial_fee || 50;

    const names = Object.keys(trials);
    if (names.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-400 text-xs font-medium">אין תלמידי ניסיון רשומים לחודש זה</td></tr>`;
        calculateFinancialSummary();
        return;
    }

    names.forEach((name, index) => {
        const tData = trials[name];
        if (tData.notes === undefined) tData.notes = "";

        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white hover:bg-sky-50/50 transition' : 'bg-slate-50/60 hover:bg-sky-50/50 transition';

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-800">${name}</td>
            <td class="py-3 px-4">
                <select onchange="updateTrialField('${name}', 'status', this.value)" class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium shadow-sm">
                    <option value="לא שולם" ${tData.status === 'לא שולם' ? 'selected' : ''}>לא שולם</option>
                    <option value="שולם חלקי" ${tData.status === 'שולם חלקי' ? 'selected' : ''}>שולם חלקי</option>
                    <option value="שולם" ${tData.status === 'שולם' ? 'selected' : ''}>שולם מלא</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="number" value="${tData.paid_amount}" onchange="updateTrialField('${name}', 'paid_amount', this.value)" class="w-20 border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white font-bold text-center shadow-inner">
            </td>
            <td class="py-3 px-4">
                <select onchange="updateTrialField('${name}', 'allocation', this.value)" class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white font-medium shadow-sm">
                    <option value="current" ${tData.allocation === 'current' ? 'selected' : ''}>חודש נוכחי</option>
                    <option value="carried_over" ${tData.allocation === 'carried_over' ? 'selected' : ''}>שויך כגרירה לעתיד</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="text" value="${escapeHtml(tData.notes)}" onchange="updateTrialField('${name}', 'notes', this.value)" placeholder="הערה..." class="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white shadow-inner focus:ring-2 focus:ring-sky-500 focus:outline-none">
            </td>
            <td class="py-3 px-4">
                <button onclick="removeTrialStudent('${name}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition">מחק</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    calculateFinancialSummary();
}

function updateTrialField(name, field, value) {
    if (!appData.trial_students[currentMonth][name]) return;
    if (field === 'paid_amount') {
        const valNum = Number(value) || 0;
        appData.trial_students[currentMonth][name].paid_amount = valNum;
        const trialFee = appData.settings.trial_fee || 50;
        if (valNum >= trialFee) {
            appData.trial_students[currentMonth][name].status = 'שולם';
        } else if (valNum > 0) {
            appData.trial_students[currentMonth][name].status = 'שולם חלקי';
        } else {
            appData.trial_students[currentMonth][name].status = 'לא שולם';
        }
    } else if (field === 'notes') {
        appData.trial_students[currentMonth][name].notes = value;
    } else {
        appData.trial_students[currentMonth][name][field] = value;
    }
    renderTrialTable();
}

function addTrialStudent() {
    const input = document.getElementById('new-trial-name');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    if (!appData.trial_students[currentMonth]) appData.trial_students[currentMonth] = {};
    if (appData.trial_students[currentMonth][name]) {
        showStatus('תלמיד ניסיון בשם זהה כבר קיים בחודש זה', 'error');
        return;
    }

    const trialFee = appData.settings.trial_fee || 50;
    appData.trial_students[currentMonth][name] = {
        status: "שולם",
        paid_amount: trialFee,
        allocation: "current",
        notes: ""
    };

    input.value = '';
    renderTrialTable();
    showStatus(`תלמיד ניסיון ${name} נוסף בהצלחה`);
}

function removeTrialStudent(name) {
    if (confirm(`האם למחוק את ${name} מרשימת הניסיון לחודש זה?`)) {
        delete appData.trial_students[currentMonth][name];
        renderTrialTable();
        showStatus('תלמיד הניסיון נמחק');
    }
}

// ניהול רשימת תלמידים קבועים (גלובלית)
function renderStudentsManagementList() {
    const container = document.getElementById('students-list-container');
    if (!container) return;
    container.innerHTML = '';

    appData.students.forEach((student, index) => {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-3 bg-white hover:bg-slate-50 transition";
        li.innerHTML = `
            <span class="font-bold text-slate-800 text-sm">${student}</span>
            <button onclick="removeStudent('${student}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition">הסר לצמיתות</button>
        `;
        container.appendChild(li);
    });
}

function addStudent() {
    const input = document.getElementById('new-student-name');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    if (appData.students.includes(name)) {
        showStatus('התלמיד כבר קיים במערכת', 'error');
        return;
    }

    appData.students.push(name);
    
    // הוספת התלמיד לכל החודשים הקיימים כדי למנוע חוסרים
    Object.keys(appData.payments).forEach(m => {
        if (!appData.payments[m][name]) {
            appData.payments[m][name] = { status: "לא שולם", paid_amount: 0, allocation: "current", notes: "" };
        }
    });

    input.value = '';
    renderApp();
    showStatus(`התלמיד ${name} נוסף בהצלחה לכל החודשים`);
}

function removeStudent(name) {
    if (confirm(`האם להסיר את ${name} מרשימת התלמידים הקבועים? (פעולה זו לא תמחק היסטוריית תשלומים ישנה)`)) {
        appData.students = appData.students.filter(s => s !== name);
        renderApp();
        showStatus('התלמיד הוסר בהצלחה');
    }
}

// מעקב מפגשים פרטני לשכירות סטודיו
function renderStudioRentCheckboxes() {
    const container = document.getElementById('studio-sessions-checkboxes');
    if (!container) return;
    container.innerHTML = '';

    if (!appData.studio_sessions_payment[currentMonth]) {
        appData.studio_sessions_payment[currentMonth] = [];
    }

    const sessions = appData.studio_sessions_payment[currentMonth];
    sessions.forEach(session => {
        const isPaid = session.status === 'שולם';
        const label = document.createElement('label');
        label.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
            isPaid ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-slate-300 text-slate-700'
        }`;
        label.innerHTML = `
            <input type="checkbox" ${isPaid ? 'checked' : ''} onchange="toggleStudioSession(${session.session_number})" class="rounded text-emerald-600 focus:ring-emerald-500">
            <span>מפגש ${session.session_number}</span>
        `;
        container.appendChild(label);
    });
}

function toggleStudioSession(sessionNum) {
    const sessions = appData.studio_sessions_payment[currentMonth];
    const session = sessions.find(s => s.session_number === sessionNum);
    if (session) {
        session.status = session.status === 'שולם' ? 'לא שולם' : 'שולם';
        renderStudioRentCheckboxes();
        calculateFinancialSummary();
    }
}

// חישוב סיכומים פיננסיים והצגתם
function calculateFinancialSummary() {
    if (!appData) return;

    let currentMonthCollected = 0;
    let carriedOverIncome = 0;

    // סיכום קבועים לחודש הנוכחי
    const monthPayments = appData.payments[currentMonth] || {};
    let regPaidCount = 0;
    let regPartialCount = 0;
    let regUnpaidCount = 0;

    Object.values(monthPayments).forEach(p => {
        const amt = Number(p.paid_amount) || 0;
        if (p.allocation === 'carried_over') {
            carriedOverIncome += amt;
        } else {
            currentMonthCollected += amt;
        }

        if (p.status === 'שולם') regPaidCount += amt;
        else if (p.status === 'שולם חלקי') regPartialCount += amt;
        else regUnpaidCount++;
    });

    // סיכום תלמידי ניסיון לחודש הנוכחי
    const trialPayments = appData.trial_students[currentMonth] || {};
    let trialPaidCount = 0;
    let trialPartialCount = 0;
    let trialUnpaidCount = 0;

    Object.values(trialPayments).forEach(t => {
        const amt = Number(t.paid_amount) || 0;
        if (t.allocation === 'carried_over') {
            carriedOverIncome += amt;
        } else {
            currentMonthCollected += amt;
        }

        if (t.status === 'שולם') trialPaidCount += amt;
        else if (t.status === 'שולם חלקי') trialPartialCount += amt;
        else trialUnpaidCount++;
    });

    // חישוב שכירות לסטודיו (שכירות למפגש × כמות מפגשים)
    const rentPerSession = appData.settings.studio_rent_per_session || 0;
    const sessionsCount = appData.settings.studio_sessions_count || 4;
    const totalStudioRent = rentPerSession * sessionsCount;

    // חישוב יתרה לתשלום לסטודיו (כמה עוד לא שולם מתוך המפגשים)
    let paidStudioSessionsCount = 0;
    const studioSessions = appData.studio_sessions_payment[currentMonth] || [];
    studioSessions.forEach(s => {
        if (s.status === 'שולם') paidStudioSessionsCount++;
    });
    const remainingStudioRent = Math.max(0, totalStudioRent - (paidStudioSessionsCount * rentPerSession));

    // עדכון תצוגה במסך
    setElemText('current-month-collected', `${currentMonthCollected} ₪`);
    setElemText('carried-over-display', `${carriedOverIncome} ₪`);
    setElemText('studio-rent-display', `${totalStudioRent} ₪`);
    
    const totalCollectedTop = currentMonthCollected + carriedOverIncome - totalStudioRent;
    setElemText('total-collected-top', `${totalCollectedTop} ₪`);

    setElemText('studio-remaining-display', `${remainingStudioRent} ₪`);

    // סיכומי טבלאות
    setElemText('reg-summary-paid', regPaidCount);
    setElemText('reg-summary-partial', regPartialCount);
    setElemText('reg-summary-unpaid', regUnpaidCount);

    setElemText('trial-summary-paid', trialPaidCount);
    setElemText('trial-summary-partial', trialPartialCount);
    setElemText('trial-summary-unpaid', trialUnpaidCount);
}

function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// שמירה ל-GitHub באמצעות GitHub API
async function saveDataToGitHub() {
    const token = localStorage.getItem('github_token');
    if (!token) {
        showStatus('יש להגדיר תחילה GitHub Token דרך כפתור "הגדרות גישה"', 'error');
        toggleTokenSettings();
        return;
    }

    showStatus('שומר שינויים ל-GitHub...', 'success');

    const owner = "yuvalaufer";
    const repo = "pianoman";
    const path = "data.json";
    const branch = "main";

    try {
        // שלב 1: קבלת SHA נוכחי של הקובץ ב-GitHub
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            throw new Error('שגיאה באיתור הקובץ ב-GitHub. בדוק את נכונות ה-Token.');
        }

        const fileData = await getRes.json();
        const sha = fileData.sha;

        // שלב 2: עדכון הקובץ ב-GitHub עם התוכן החדש
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(appData, null, 2))));
        
        const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update payment records for ${currentMonth} via web app`,
                content: contentBase64,
                sha: sha,
                branch: branch
            })
        });

        if (!putRes.ok) {
            const errJson = await putRes.json();
            throw new Error(errJson.message || 'שגיאה בשמירת הקובץ לשרת');
        }

        showStatus('השינויים נשמרו בהצלחה ב-GitHub!', 'success');
    } catch (err) {
        console.error(err);
        showStatus(`שמירה נכשלה: ${err.message}`, 'error');
    }
}

// פונקציית עזר למניעת בעיות HTML בתוך שדות טקסט
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
