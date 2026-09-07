const GITHUB_USER = "yuvalaufer";
const GITHUB_REPO = "ansamble";
const BRANCH = "main";
const FILE_PATH = "data.json";

let appData = null;
let currentMonth = "";

const MONTH_NAMES = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

window.addEventListener("DOMContentLoaded", async () => {
    const savedToken = localStorage.getItem("github_token");
    if (savedToken) {
        document.getElementById("github-token-input").value = savedToken;
    }

    populateAddMonthDropdowns();
    await loadDataFromGitHub();
});

function populateAddMonthDropdowns() {
    const monthSelect = document.getElementById("new-month-name");
    const yearSelect = document.getElementById("new-month-year");

    monthSelect.innerHTML = "";
    MONTH_NAMES.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        monthSelect.appendChild(opt);
    });

    yearSelect.innerHTML = "";
    const currentYear = 2026;
    for (let i = 0; i <= 5; i++) {
        let y = currentYear + i;
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }

    const today = new Date();
    monthSelect.value = MONTH_NAMES[today.getMonth()];
    yearSelect.value = today.getFullYear();
}

function toggleTokenSettings() {
    const panel = document.getElementById("token-panel");
    panel.classList.toggle("hidden");
}

function saveToken() {
    const token = document.getElementById("github-token-input").value.trim();
    if (!token) {
        showStatus("נא להזין Token תקין", "error");
        return;
    }
    localStorage.setItem("github_token", token);
    showStatus("הטוקן נשמר בהצלחה בדפדפן!", "success");
    toggleTokenSettings();
}

function showStatus(text, type = "success") {
    const msgEl = document.getElementById("status-message");
    msgEl.textContent = text;
    msgEl.classList.remove("hidden", "bg-emerald-50", "text-emerald-800", "bg-red-50", "text-red-800");
    
    if (type === "success") {
        msgEl.classList.add("bg-emerald-50", "text-emerald-800", "border", "border-emerald-200");
    } else {
        msgEl.classList.add("bg-red-50", "text-red-800", "border", "border-red-200");
    }
    
    setTimeout(() => {
        msgEl.classList.add("hidden");
    }, 4000);
}

async function loadDataFromGitHub() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
        const response = await fetch(url, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) {
            throw new Error("שגיאה בטעינת קובץ הנתונים מ-GitHub");
        }

        const fileData = await response.json();
        const binaryString = atob(fileData.content.replace(/\s/g, ''));
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const decodedContent = new TextDecoder('utf-8').decode(bytes);
        
        appData = JSON.parse(decodedContent);

        if (!appData.trial_students) {
            appData.trial_students = {};
        }

        initAppUI();
        showStatus("הנתונים נטענו בהצלחה מ-GitHub!", "success");
    } catch (error) {
        console.error(error);
        showStatus("שגיאה בטעינת הנתונים: ודא שהריפוציטורי ציבורי או שהוגדר Token תקין.", "error");
    }
}

function initAppUI() {
    if (!appData) return;
    setupMonthsDropdown();
    renderStudentsManagementList();
}

function getMonthlyFeeForMonth(monthStr) {
    if (!appData) return 330;
    if (appData.monthly_fees && appData.monthly_fees[monthStr] !== undefined) {
        return appData.monthly_fees[monthStr];
    }
    const allMonths = getAllSortedMonths();
    const currentIndex = allMonths.indexOf(monthStr);
    if (currentIndex > 0) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            let prevMonth = allMonths[i];
            if (appData.monthly_fees && appData.monthly_fees[prevMonth] !== undefined) {
                return appData.monthly_fees[prevMonth];
            }
        }
    }
    return (appData.settings && appData.settings.monthly_fee) ? appData.settings.monthly_fee : 330;
}

function getTrialFee() {
    if (appData && appData.settings && appData.settings.trial_fee !== undefined) {
        return appData.settings.trial_fee;
    }
    return 50;
}

function updateMonthlyFee(newVal) {
    const fee = parseInt(newVal) || 0;
    if (!appData.monthly_fees) appData.monthly_fees = {};
    appData.monthly_fees[currentMonth] = fee;
    renderTable();
    showStatus(`הסכום החודשי עודכן ל-${fee} ₪ עבור חודש ${currentMonth} והלאה.`, "success");
}

function updateTrialFee(newVal) {
    const fee = parseInt(newVal) || 0;
    if (!appData.settings) appData.settings = {};
    appData.settings.trial_fee = fee;
    renderTrialTable();
    showStatus(`עלות מפגש ניסיון עודכנה ל-${fee} ₪.`, "success");
}

function getAllSortedMonths() {
    const today = new Date();
    let defaultMonthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

    let monthsSet = new Set(Object.keys(appData.payments || {}));
    if (appData.monthly_fees) {
        Object.keys(appData.monthly_fees).forEach(m => monthsSet.add(m));
    }
    monthsSet.add(defaultMonthStr);

    return Array.from(monthsSet).sort((a, b) => {
        let [m1, y1] = a.split(" ");
        let [m2, y2] = b.split(" ");
        let date1 = new Date(y1, MONTH_NAMES.indexOf(m1), 1);
        let date2 = new Date(y2, MONTH_NAMES.indexOf(m2), 1);
        return date1 - date2;
    });
}

function setupMonthsDropdown() {
    const select = document.getElementById("month-select");
    select.innerHTML = "";

    let sortedMonths = getAllSortedMonths();
    sortedMonths.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        select.appendChild(opt);
    });

    const today = new Date();
    let defaultMonthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

    if (!currentMonth || !sortedMonths.includes(currentMonth)) {
        currentMonth = sortedMonths.includes(defaultMonthStr) ? defaultMonthStr : sortedMonths[sortedMonths.length - 1];
    }
    select.value = currentMonth;

    renderTable();
    renderTrialTable();
}

function changeMonth() {
    saveTableToMemory();
    currentMonth = document.getElementById("month-select").value;
    renderTable();
    renderTrialTable();
}

function addNewMonthFromDropdown() {
    const mName = document.getElementById("new-month-name").value;
    const yName = document.getElementById("new-month-year").value;
    const monthName = `${mName} ${yName}`;

    if (!appData.payments) appData.payments = {};
    if (!appData.payments[monthName]) {
        appData.payments[monthName] = {};
    }

    setupMonthsDropdown();
    document.getElementById("month-select").value = monthName;
    currentMonth = monthName;
    renderTable();
    renderTrialTable();
    showStatus(`נוסף חודש חדש: ${monthName}`, "success");
}

function getRowBgClass(status) {
    if (status === "שולם") return "bg-emerald-200 hover:bg-emerald-300 text-emerald-950";
    if (status === "שולם חלקי") return "bg-amber-200 hover:bg-amber-300 text-amber-950";
    return "bg-rose-200 hover:bg-rose-300 text-rose-950";
}

function renderTable() {
    const tbody = document.getElementById("payments-tbody");
    tbody.innerHTML = "";

    const monthlyFee = getMonthlyFeeForMonth(currentMonth);
    document.getElementById("monthly-fee-input").value = monthlyFee;

    const monthPayments = appData.payments[currentMonth] || {};
    const masterStudents = appData.students || [];
    const pastStudents = Object.keys(monthPayments);
    const allStudents = Array.from(new Set([...masterStudents, ...pastStudents]));

    allStudents.forEach(student => {
        const pData = monthPayments[student] || { status: "לא שולם", paid_amount: 0 };
        const status = pData.status;
        let paidAmount = pData.paid_amount;

        let remaining = 0;
        if (status === "שולם") {
            paidAmount = monthlyFee;
            remaining = 0;
        } else if (status === "שולם חלקי") {
            remaining = Math.max(0, monthlyFee - paidAmount);
        } else {
            paidAmount = 0;
            remaining = monthlyFee;
        }

        const tr = document.createElement("tr");
        tr.className = `border-b border-slate-300/60 transition ${getRowBgClass(status)}`;
        tr.dataset.student = student;

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-900">${student}</td>
            <td class="py-3 px-4">
                <select onchange="handleStatusChange(this)" class="status-select border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white shadow-sm font-medium">
                    <option value="לא שולם" ${status === "לא שולם" ? "selected" : ""}>לא שולם</option>
                    <option value="שולם" ${status === "שולם" ? "selected" : ""}>שולם</option>
                    <option value="שולם חלקי" ${status === "שולם חלקי" ? "selected" : ""}>שולם חלקי</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="number" value="${paidAmount}" ${status !== "שולם חלקי" ? "disabled" : ""} 
                    class="paid-input w-24 border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-500 font-medium" 
                    oninput="calculateTotals()">
            </td>
            <td class="py-3 px-4 font-bold remaining-cell ${remaining > 0 ? 'text-amber-950' : 'text-emerald-950'}">
                ${remaining} ₪
            </td>
        `;
        tbody.appendChild(tr);
    });

    calculateTotals();
}

function renderTrialTable() {
    const tbody = document.getElementById("trial-tbody");
    tbody.innerHTML = "";

    const trialFee = getTrialFee();
    document.getElementById("trial-fee-input").value = trialFee;

    if (!appData.trial_students) appData.trial_students = {};
    if (!appData.trial_students[currentMonth]) appData.trial_students[currentMonth] = {};

    const monthTrials = appData.trial_students[currentMonth];

    Object.keys(monthTrials).forEach(name => {
        const tData = monthTrials[name];
        const status = tData.status;
        let paidAmount = tData.paid_amount;

        if (status === "שולם") paidAmount = trialFee;
        else if (status === "לא שולם") paidAmount = 0;

        const tr = document.createElement("tr");
        tr.className = `border-b border-slate-300/60 transition ${getRowBgClass(status)}`;
        tr.dataset.trialName = name;

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                <span>${name}</span>
                <span class="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium">ניסיון</span>
            </td>
            <td class="py-3 px-4">
                <select onchange="handleTrialStatusChange(this)" class="trial-status-select border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white shadow-sm font-medium">
                    <option value="לא שולם" ${status === "לא שולם" ? "selected" : ""}>לא שולם</option>
                    <option value="שולם" ${status === "שולם" ? "selected" : ""}>שולם</option>
                    <option value="שולם חלקי" ${status === "שולם חלקי" ? "selected" : ""}>שולם חלקי</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="number" value="${paidAmount}" ${status !== "שולם חלקי" ? "disabled" : ""} 
                    class="trial-paid-input w-24 border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-500 font-medium" 
                    oninput="calculateTotals()">
            </td>
            <td class="py-3 px-4 flex items-center gap-2">
                <button onclick="promoteTrialStudent('${name}')" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition">
                    צרף לתלמידים קבועים
                </button>
                <button onclick="removeTrialStudent('${name}')" class="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition">
                    מחק
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    calculateTotals();
}

function handleStatusChange(selectEl) {
    const row = selectEl.closest("tr");
    const status = selectEl.value;
    const paidInput = row.querySelector(".paid-input");
    const monthlyFee = getMonthlyFeeForMonth(currentMonth);

    row.className = `border-b border-slate-300/60 transition ${getRowBgClass(status)}`;

    if (status === "שולם") {
        paidInput.value = monthlyFee;
        paidInput.disabled = true;
    } else if (status === "שולם חלקי") {
        paidInput.disabled = false;
        if (parseInt(paidInput.value) >= monthlyFee || parseInt(paidInput.value) === 0) {
            paidInput.value = "";
        }
    } else {
        paidInput.value = 0;
        paidInput.disabled = true;
    }

    calculateTotals();
}

function handleTrialStatusChange(selectEl) {
    const row = selectEl.closest("tr");
    const status = selectEl.value;
    const paidInput = row.querySelector(".trial-paid-input");
    const trialFee = getTrialFee();

    row.className = `border-b border-slate-300/60 transition ${getRowBgClass(status)}`;

    if (status === "שולם") {
        paidInput.value = trialFee;
        paidInput.disabled = true;
    } else if (status === "שולם חלקי") {
        paidInput.disabled = false;
        if (parseInt(paidInput.value) >= trialFee || parseInt(paidInput.value) === 0) {
            paidInput.value = "";
        }
    } else {
        paidInput.value = 0;
        paidInput.disabled = true;
    }

    calculateTotals();
}

function calculateTotals() {
    let grandTotalCollected = 0;

    // --- חישוב תלמידים קבועים ---
    const regularRows = document.querySelectorAll("#payments-tbody tr");
    let regPaidTotal = 0;
    let regPartialTotal = 0;
    let regUnpaidCount = 0;
    const monthlyFee = getMonthlyFeeForMonth(currentMonth);

    regularRows.forEach(row => {
        const status = row.querySelector(".status-select").value;
        const paidInput = row.querySelector(".paid-input");
        const remainingCell = row.querySelector(".remaining-cell");

        let paidAmount = parseInt(paidInput.value) || 0;
        let remaining = 0;

        if (status === "שולם") {
            paidAmount = monthlyFee;
            regPaidTotal += paidAmount;
        } else if (status === "שולם חלקי") {
            remaining = Math.max(0, monthlyFee - paidAmount);
            regPartialTotal += paidAmount;
        } else {
            paidAmount = 0;
            remaining = monthlyFee;
            regUnpaidCount += 1;
        }

        grandTotalCollected += paidAmount;
        remainingCell.textContent = `${remaining} ₪`;
        remainingCell.className = `py-3 px-4 font-bold remaining-cell ${remaining > 0 ? 'text-amber-950' : 'text-emerald-950'}`;
    });

    // עדכון סיכום קבועים בתחתית הטבלה
    document.getElementById("reg-summary-paid").textContent = regPaidTotal;
    document.getElementById("reg-summary-partial").textContent = regPartialTotal;
    document.getElementById("reg-summary-unpaid").textContent = regUnpaidCount;


    // --- חישוב תלמידי ניסיון ---
    const trialRows = document.querySelectorAll("#trial-tbody tr");
    let trialPaidTotal = 0;
    let trialPartialTotal = 0;
    let trialUnpaidCount = 0;
    const trialFee = getTrialFee();

    trialRows.forEach(row => {
        const status = row.querySelector(".trial-status-select").value;
        const paidInput = row.querySelector(".trial-paid-input");

        let paidAmount = parseInt(paidInput.value) || 0;
        if (status === "שולם") {
            paidAmount = trialFee;
            trialPaidTotal += paidAmount;
        } else if (status === "שולם חלקי") {
            trialPartialTotal += paidAmount;
        } else {
            paidAmount = 0;
            trialUnpaidCount += 1;
        }
        grandTotalCollected += paidAmount;
    });

    // עדכון סיכום ניסיון בתחתית הטבלה
    document.getElementById("trial-summary-paid").textContent = trialPaidTotal;
    document.getElementById("trial-summary-partial").textContent = trialPartialTotal;
    document.getElementById("trial-summary-unpaid").textContent = trialUnpaidCount;


    // --- סה"כ כללי עליון ---
    document.getElementById("total-collected-top").textContent = `${grandTotalCollected} ₪`;
}

function saveTableToMemory() {
    if (!appData) return;
    if (!appData.payments) appData.payments = {};
    if (!appData.payments[currentMonth]) appData.payments[currentMonth] = {};

    const rows = document.querySelectorAll("#payments-tbody tr");
    rows.forEach(row => {
        const student = row.dataset.student;
        const status = row.querySelector(".status-select").value;
        const paidAmount = parseInt(row.querySelector(".paid-input").value) || 0;

        appData.payments[currentMonth][student] = {
            status: status,
            paid_amount: paidAmount
        };
    });

    if (!appData.trial_students) appData.trial_students = {};
    if (!appData.trial_students[currentMonth]) appData.trial_students[currentMonth] = {};

    const trialRows = document.querySelectorAll("#trial-tbody tr");
    trialRows.forEach(row => {
        const name = row.dataset.trialName;
        const status = row.querySelector(".trial-status-select").value;
        const paidAmount = parseInt(row.querySelector(".trial-paid-input").value) || 0;

        appData.trial_students[currentMonth][name] = {
            status: status,
            paid_amount: paidAmount
        };
    });
}

function renderStudentsManagementList() {
    const container = document.getElementById("students-list-container");
    container.innerHTML = "";

    if (!appData.students) appData.students = [];

    appData.students.forEach((student, index) => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between p-3 bg-white";

        li.innerHTML = `
            <div class="flex items-center gap-2 flex-1 ml-4">
                <input type="text" value="${student}" id="student-edit-${index}" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white flex-1 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium">
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateStudentName(${index})" class="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">עדכן</button>
                <button onclick="deleteStudent(${index})" class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">מחק</button>
            </div>
        `;
        container.appendChild(li);
    });
}

function addStudent() {
    saveTableToMemory();
    const input = document.getElementById("new-student-name");
    const name = input.value.trim();
    if (!name) return;

    if (appData.students.includes(name)) {
        showStatus("התלמיד כבר קיים ברשימה", "error");
        return;
    }

    appData.students.push(name);
    input.value = "";
    renderStudentsManagementList();
    renderTable();
    showStatus(`התלמיד ${name} נוסף בהצלחה!`, "success");
}

function updateStudentName(index) {
    saveTableToMemory();
    const inputEl = document.getElementById(`student-edit-${index}`);
    const newName = inputEl.value.trim();
    const oldName = appData.students[index];

    if (!newName) {
        showStatus("שם התלמיד לא יכול להיות ריק", "error");
        return;
    }

    if (newName === oldName) return;

    if (appData.students.includes(newName)) {
        showStatus("שם זהה כבר קיים ברשימה", "error");
        return;
    }

    appData.students[index] = newName;

    if (appData.payments) {
        Object.keys(appData.payments).forEach(month => {
            if (appData.payments[month][oldName]) {
                appData.payments[month][newName] = appData.payments[month][oldName];
                delete appData.payments[month][oldName];
            }
        });
    }

    renderStudentsManagementList();
    renderTable();
    showStatus("שם התלמיד עודכן בהצלחה בכל הטבלאות!", "success");
}

function deleteStudent(index) {
    saveTableToMemory();
    const name = appData.students[index];
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${name}?`)) return;

    appData.students.splice(index, 1);

    if (appData.payments) {
        Object.keys(appData.payments).forEach(month => {
            if (appData.payments[month][name]) {
                delete appData.payments[month][name];
            }
        });
    }

    renderStudentsManagementList();
    renderTable();
    showStatus(`התלמיד ${name} הוסר מהרשימה.`, "success");
}

function addTrialStudent() {
    saveTableToMemory();
    const input = document.getElementById("new-trial-name");
    const name = input.value.trim();
    if (!name) return;

    if (!appData.trial_students[currentMonth]) {
        appData.trial_students[currentMonth] = {};
    }

    if (appData.trial_students[currentMonth][name]) {
        showStatus("המשתתף כבר קיים ברשימת הניסיון בחודש זה", "error");
        return;
    }

    appData.trial_students[currentMonth][name] = {
        status: "לא שולם",
        paid_amount: 0
    };

    input.value = "";
    renderTrialTable();
    showStatus(`משתתף ניסיון ${name} נוסף בהצלחה!`, "success");
}

function removeTrialStudent(name) {
    saveTableToMemory();
    if (appData.trial_students && appData.trial_students[currentMonth]) {
        delete appData.trial_students[currentMonth][name];
    }
    renderTrialTable();
    showStatus(`משתתף הניסיון ${name} הוסר.`, "success");
}

function promoteTrialStudent(name) {
    saveTableToMemory();
    
    const trialData = appData.trial_students[currentMonth][name] || { status: "לא שולם", paid_amount: 0 };
    const trialFee = getTrialFee();
    let paidSoFar = 0;

    if (trialData.status === "שולם") {
        paidSoFar = trialFee;
    } else if (trialData.status === "שולם חלקי") {
        paidSoFar = trialData.paid_amount || 0;
    } else {
        paidSoFar = 0;
    }

    if (!appData.students.includes(name)) {
        appData.students.push(name);
    }

    if (!appData.payments[currentMonth]) {
        appData.payments[currentMonth] = {};
    }

    let initialStatus = "שולם חלקי";
    const monthlyFee = getMonthlyFeeForMonth(currentMonth);

    if (paidSoFar >= monthlyFee) {
        initialStatus = "שולם";
        paidSoFar = monthlyFee;
    } else if (paidSoFar === 0) {
        initialStatus = "לא שולם";
    }

    appData.payments[currentMonth][name] = {
        status: initialStatus,
        paid_amount: paidSoFar
    };

    delete appData.trial_students[currentMonth][name];

    renderStudentsManagementList();
    renderTable();
    renderTrialTable();
    showStatus(`התלמיד ${name} צורף בהצלחה לתלמידים הקבועים! (שויך סכום של ${paidSoFar} ₪)`, "success");
}

async function saveDataToGitHub() {
    const token = localStorage.getItem("github_token");
    if (!token) {
        showStatus("יש להגדיר תחילה GitHub Token דרך כפתור 'הגדרות גישה'", "error");
        toggleTokenSettings();
        return;
    }

    saveTableToMemory();

    try {
        showStatus("שומר שינויים ל-GitHub...", "success");

        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

        const getRes = await fetch(apiUrl, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!getRes.ok) {
            throw new Error("לא ניתן לאתר את קובץ הנתונים בריפו לשם עדכון ה-SHA");
        }

        const fileInfo = await getRes.json();
        const fileSha = fileInfo.sha;

        const jsonString = JSON.stringify(appData, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        let binaryString = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
            binaryString += String.fromCharCode(utf8Bytes[i]);
        }
        const base64Content = btoa(binaryString);

        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update payment data via Web App - ${new Date().toLocaleString()}`,
                content: base64Content,
                sha: fileSha,
                branch: BRANCH
            })
        });

        if (!putRes.ok) {
            const errData = await putRes.json();
            throw new Error(errData.message || "שגיאה בשמירת הקובץ ב-GitHub");
        }

        showStatus("השינויים נשמרו בהצלחה בריפו ב-GitHub!", "success");
    } catch (error) {
        console.error(error);
        showStatus(`שגיאה בשמירה: ${error.message}`, "error");
    }
}
