// --- הגדרות חיבור לריפוזיטורי ב-GitHub ---
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
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error("שגיאה בטעינת קובץ הנתונים מ-GitHub");
        }

        const fileData = await response.json();
        
        const binaryString = atob(fileData.content.replace(/\s/g, ''));
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const decodedContent = new TextDecoder('utf-8').decode(bytes);
        
        appData = JSON.parse(decodedContent);

        initAppUI();
        showStatus("הנתונים נטענו בהצלחה מ-GitHub!", "success");
    } catch (error) {
        console.error(error);
        showStatus("שגיאה בטעינת הנתונים: ודא שהריפוציטורי ציבורי או שהוגדר Token תקין.", "error");
    }
}

function initAppUI() {
    if (!appData) return;
    document.getElementById("students-textarea").value = (appData.students || []).join("\n");
    setupMonthsDropdown();
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

function getTrialFeeForMonth(monthStr) {
    if (!appData) return 50;
    if (appData.trial_fees && appData.trial_fees[monthStr] !== undefined) {
        return appData.trial_fees[monthStr];
    }
    return 50;
}

function updateMonthlyFee(newVal) {
    const fee = parseInt(newVal) || 0;
    if (!appData.monthly_fees) {
        appData.monthly_fees = {};
    }
    appData.monthly_fees[currentMonth] = fee;
    renderTable();
    showStatus(`הסכום החודשי עודכן ל-${fee} ₪ עבור חודש ${currentMonth} והלאה.`, "success");
}

function updateTrialFee(newVal) {
    const fee = parseInt(newVal) || 0;
    if (!appData.trial_fees) {
        appData.trial_fees = {};
    }
    appData.trial_fees[currentMonth] = fee;
    renderTrialTable();
    showStatus(`סכום מפגש הניסיון עודכן ל-${fee} ₪ עבור חודש ${currentMonth}.`, "success");
}

function getAllSortedMonths() {
    const today = new Date();
    let defaultMonthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

    let monthsSet = new Set(Object.keys(appData.payments || {}));
    if (appData.monthly_fees) {
        Object.keys(appData.monthly_fees).forEach(m => monthsSet.add(m));
    }
    if (appData.trial_fees) {
        Object.keys(appData.trial_fees).forEach(m => monthsSet.add(m));
    }
    if (appData.trials) {
        Object.keys(appData.trials).forEach(m => monthsSet.add(m));
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
}

function changeMonth() {
    saveTableToMemory();
    currentMonth = document.getElementById("month-select").value;
    renderTable();
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
    const monthlyFeeInput = document.getElementById("monthly-fee-input");
    if (monthlyFeeInput) monthlyFeeInput.value = monthlyFee;

    const monthPayments = appData.payments[currentMonth] || {};
    
    const masterStudents = appData.students || [];
    const pastStudents = Object.keys(monthPayments);
    const allStudents = Array.from(new Set([...masterStudents, ...pastStudents]));

    let totalCollected = 0;

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

        totalCollected += paidAmount;

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

    const totalCollectedEl = document.getElementById("total-collected");
    if (totalCollectedEl) totalCollectedEl.textContent = `${totalCollected} ₪`;

    renderTrialTable();
}

function renderTrialTable() {
    const tbody = document.getElementById("trial-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const trialFee = getTrialFeeForMonth(currentMonth);
    const trialFeeInput = document.getElementById("trial-fee-input");
    if (trialFeeInput) trialFeeInput.value = trialFee;

    if (!appData.trials) appData.trials = {};
    if (!appData.trials[currentMonth]) appData.trials[currentMonth] = {};

    const monthTrials = appData.trials[currentMonth];

    Object.keys(monthTrials).forEach(name => {
        const tData = monthTrials[name];
        const paidAmount = tData.paid_amount !== undefined ? tData.paid_amount : trialFee;

        const tr = document.createElement("tr");
        tr.className = "border-b border-slate-200 bg-sky-50/50 hover:bg-sky-100/50 transition";
        tr.dataset.trialName = name;

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-900">${name}</td>
            <td class="py-3 px-4">
                <input type="number" value="${paidAmount}" 
                    class="trial-paid-input w-24 border border-slate-300 rounded-lg px-2.5 py-1 text-sm bg-white shadow-sm font-medium" 
                    oninput="saveTableToMemory()">
            </td>
            <td class="py-3 px-4 flex gap-2">
                <button onclick="promoteTrialToRegular('${name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow transition">
                    צרף לתלמידים קבועים
                </button>
                <button onclick="removeTrialStudent('${name}')" class="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow transition">
                    מחק
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addTrialStudentPrompt() {
    const nameInput = document.getElementById("new-trial-name");
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
        showStatus("נא להזין שם תלמיד ניסיון", "error");
        return;
    }

    if (!appData.trials) appData.trials = {};
    if (!appData.trials[currentMonth]) appData.trials[currentMonth] = {};

    if (appData.trials[currentMonth][name]) {
        showStatus("תלמיד ניסיון בשם זה כבר קיים בחודש זה", "error");
        return;
    }

    const trialFee = getTrialFeeForMonth(currentMonth);
    appData.trials[currentMonth][name] = { paid_amount: trialFee };
    nameInput.value = "";
    renderTrialTable();
    showStatus(`נוסף תלמיד ניסיון: ${name}`, "success");
}

function removeTrialStudent(name) {
    saveTableToMemory();
    if (appData.trials && appData.trials[currentMonth]) {
        delete appData.trials[currentMonth][name];
    }
    renderTrialTable();
    showStatus(`תלמיד הניסיון ${name} הוסר`, "success");
}

function promoteTrialToRegular(name) {
    saveTableToMemory();
    
    const paidAmount = appData.trials[currentMonth][name]?.paid_amount || getTrialFeeForMonth(currentMonth);

    delete appData.trials[currentMonth][name];

    if (!appData.students) appData.students = [];
    if (!appData.students.includes(name)) {
        appData.students.push(name);
        const textarea = document.getElementById("students-textarea");
        if (textarea) textarea.value = appData.students.join("\n");
    }

    if (!appData.payments) appData.payments = {};
    if (!appData.payments[currentMonth]) appData.payments[currentMonth] = {};
    
    appData.payments[currentMonth][name] = {
        status: "שולם חלקי",
        paid_amount: paidAmount
    };

    renderTable();
    showStatus(`התלמיד ${name} צורף לתלמידים הקבועים כתשלום חלקי (${paidAmount} ₪)`, "success");
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

function calculateTotals() {
    const rows = document.querySelectorAll("#payments-tbody tr");
    const monthlyFee = getMonthlyFeeForMonth(currentMonth);
    let totalCollected = 0;

    rows.forEach(row => {
        const status = row.querySelector(".status-select").value;
        const paidInput = row.querySelector(".paid-input");
        const remainingCell = row.querySelector(".remaining-cell");

        let paidAmount = parseInt(paidInput.value) || 0;
        let remaining = 0;

        if (status === "שולם") {
            paidAmount = monthlyFee;
        } else if (status === "שולם חלקי") {
            remaining = Math.max(0, monthlyFee - paidAmount);
        } else {
            paidAmount = 0;
            remaining = monthlyFee;
        }

        totalCollected += paidAmount;
        remainingCell.textContent = `${remaining} ₪`;
        remainingCell.className = `py-3 px-4 font-bold remaining-cell ${remaining > 0 ? 'text-amber-950' : 'text-emerald-950'}`;
    });

    const totalCollectedEl = document.getElementById("total-collected");
    if (totalCollectedEl) totalCollectedEl.textContent = `${totalCollected} ₪`;
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

    if (!appData.trials) appData.trials = {};
    if (!appData.trials[currentMonth]) appData.trials[currentMonth] = {};
    
    const trialRows = document.querySelectorAll("#trial-tbody tr");
    trialRows.forEach(row => {
        const name = row.dataset.trialName;
        const paidAmount = parseInt(row.querySelector(".trial-paid-input").value) || 0;
        appData.trials[currentMonth][name] = { paid_amount: paidAmount };
    });
}

function updateStudentsList() {
    const textareaVal = document.getElementById("students-textarea").value;
    const newStudents = textareaVal.split("\n").map(s => s.trim()).filter(s => s.length > 0);
    
    appData.students = newStudents;
    renderTable();
    showStatus("רשימת התלמידים עודכנה בזיכרון. אל תשכח ללחוץ על 'שמור שינויים'!", "success");
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
