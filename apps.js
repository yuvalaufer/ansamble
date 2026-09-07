// --- הגדרות חיבור לריפוזיטורי ב-GitHub ---
// ⚠️ יש לעדכן כאן את שם משתמש ושל הריפוזיטורי שלך ב-GitHub!
const GITHUB_USER = "yuvalaufer"; // שם המשתמש שלך בגיטהאב
const GITHUB_REPO = "ansamble";   // שם הריפוזיטורי שלך
const BRANCH = "main";               // ענף ראשי (main או master)
const FILE_PATH = "data.json";       // נתיב קובץ הנתונים בריפו

let appData = null;
let currentMonth = "";

// רשימת חודשים בעברית
const MONTH_NAMES = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

// טעינת הנתונים עם הפעלת העמוד
window.addEventListener("DOMContentLoaded", async () => {
    // טעינת טוקן שמור אם קיים
    const savedToken = localStorage.getItem("github_token");
    if (savedToken) {
        document.getElementById("github-token-input").value = savedToken;
    }

    await loadDataFromGitHub();
});

// פונקציה להצגה/הסתרה של פאנל הגדרות הטוקן
function toggleTokenSettings() {
    const panel = document.getElementById("token-panel");
    panel.classList.toggle("hidden");
}

// שמירת הטוקן ב-localStorage של הדפדפן
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

// הצגת הודעות מערכת למשתמש
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

// 1. טעינת נתונים מ-GitHub API
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
        
        // פענוח מדויק ובטוח של Base64 כולל תווים בעברית
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

// אתחול ממשק המשתמש והנתונים
function initAppUI() {
    if (!appData) return;

    // עדכון סכום חודשי מוצג
    document.getElementById("display-monthly-fee").textContent = appData.settings.monthly_fee;

    // מילוי תיבת טקסט של התלמידים
    document.getElementById("students-textarea").value = (appData.students || []).join("\n");

    // טיפול בחודשים
    setupMonthsDropdown();
}

// הגדרת רשימת החודשים בסלקט
function setupMonthsDropdown() {
    const select = document.getElementById("month-select");
    select.innerHTML = "";

    const today = new Date();
    let defaultMonthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

    // איסוף כל החודשים הקיימים בנתונים + החודש הנוכחי
    let monthsSet = new Set(Object.keys(appData.payments || {}));
    monthsSet.add(defaultMonthStr);

    // מיון חודשים בסדר כרונולוגי
    let sortedMonths = Array.from(monthsSet).sort((a, b) => {
        let [m1, y1] = a.split(" ");
        let [m2, y2] = b.split(" ");
        let date1 = new Date(y1, MONTH_NAMES.indexOf(m1), 1);
        let date2 = new Date(y2, MONTH_NAMES.indexOf(m2), 1);
        return date1 - date2;
    });

    sortedMonths.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        select.appendChild(opt);
    });

    // בחירת החודש הנוכחי או האחרון ברשימה
    if (!currentMonth || !sortedMonths.includes(currentMonth)) {
        currentMonth = sortedMonths.includes(defaultMonthStr) ? defaultMonthStr : sortedMonths[sortedMonths.length - 1];
    }
    select.value = currentMonth;

    renderTable();
}

// מעבר בין חודשים דרך הסלקט
function changeMonth() {
    // שמירת הנתונים של החודש הנוכחי מהטופס לפני החלפה
    saveTableToMemory();
    currentMonth = document.getElementById("month-select").value;
    renderTable();
}

// הוספת חודש חדש לבחירה
function addNewMonth() {
    const monthName = prompt("הכנס שם חודש ושנה (למשל: יוני 2026):");
    if (!monthName) return;

    if (!appData.payments) appData.payments = {};
    if (!appData.payments[monthName]) {
        appData.payments[monthName] = {};
    }

    setupMonthsDropdown();
    document.getElementById("month-select").value = monthName;
    currentMonth = monthName;
    renderTable();
}

// הצגת טבלת התלמידים והתשלומים לחודש הנבחר
function renderTable() {
    const tbody = document.getElementById("payments-tbody");
    tbody.innerHTML = "";

    const monthlyFee = appData.settings.monthly_fee;
    const monthPayments = appData.payments[currentMonth] || {};
    
    // איסוף כל התלמידים: תלמידי המאסטר הנוכחיים + תלמידים שהיו להם נתונים בחודש הזה בעבר
    const masterStudents = appData.students || [];
    const pastStudents = Object.keys(monthPayments);
    const allStudents = Array.from(new Set([...masterStudents, ...pastStudents]));

    let totalCollected = 0;

    allStudents.forEach(student => {
        const pData = monthPayments[student] || { status: "לא שולם", paid_amount: 0 };
        const status = pData.status;
        let paidAmount = pData.paid_amount;

        // חישוב יתרה
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

        // יצירת שורה בטבלה
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 hover:bg-gray-50/50 transition";
        tr.dataset.student = student;

        tr.innerHTML = `
            <td class="py-3 px-4 font-medium text-gray-900">${student}</td>
            <td class="py-3 px-4">
                <select onchange="handleStatusChange(this)" class="status-select border border-gray-300 rounded-lg px-2.5 py-1 text-sm bg-white">
                    <option value="לא שולם" ${status === "לא שולם" ? "selected" : ""}>לא שולם</option>
                    <option value="שולם" ${status === "שולם" ? "selected" : ""}>שולם</option>
                    <option value="שולם חלקי" ${status === "שולם חלקי" ? "selected" : ""}>שולם חלקי</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <input type="number" value="${paidAmount}" ${status !== "שולם חלקי" ? "disabled" : ""} 
                    class="paid-input w-24 border border-gray-300 rounded-lg px-2.5 py-1 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400" 
                    oninput="calculateTotals()">
            </td>
            <td class="py-3 px-4 font-semibold remaining-cell ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}">
                ${remaining} ₪
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("total-collected").textContent = `${totalCollected} ₪`;
}

// טיפול בשינוי סטטוס תשלום בשורה
function handleStatusChange(selectEl) {
    const row = selectEl.closest("tr");
    const status = selectEl.value;
    const paidInput = row.querySelector(".paid-input");
    const monthlyFee = appData.settings.monthly_fee;

    if (status === "שולם") {
        paidInput.value = monthlyFee;
        paidInput.disabled = true;
    } else if (status === "שולם חלקי") {
        paidInput.disabled = false;
        if (parseInt(paidInput.value) >= monthlyFee || parseInt(paidInput.value) === 0) {
            paidInput.value = "";
        }
    } else { // לא שולם
        paidInput.value = 0;
        paidInput.disabled = true;
    }

    calculateTotals();
}

// חישוב מחדש של היתרות וסכום הגבייה בטבלה
function calculateTotals() {
    const rows = document.querySelectorAll("#payments-tbody tr");
    const monthlyFee = appData.settings.monthly_fee;
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
        remainingCell.className = `py-3 px-4 font-semibold remaining-cell ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`;
    });

    document.getElementById("total-collected").textContent = `${totalCollected} ₪`;
}

// שמירת נתוני הטבלה המוצגת כרגע אל תוך אובייקט הזיכרון (appData)
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
}

// עדכון רשימת התלמידים מתיבת הטקסט
function updateStudentsList() {
    const textareaVal = document.getElementById("students-textarea").value;
    const newStudents = textareaVal.split("\n").map(s => s.trim()).filter(s => s.length > 0);
    
    appData.students = newStudents;
    renderTable();
    showStatus("רשימת התלמידים עודכנה בזיכרון. אל תשכח ללחוץ על 'שמור שינויים ל-GitHub'!", "success");
}

// 2. שמירת הנתונים חזרה ל-GitHub API (Commit אוטומטי)
async function saveDataToGitHub() {
    const token = localStorage.getItem("github_token");
    if (!token) {
        showStatus("יש להגדיר תחילה GitHub Token דרך כפתור 'הגדרות גישה'", "error");
        toggleTokenSettings();
        return;
    }

    // שמירה סופית של מצב הטבלה הנוכחי לזיכרון
    saveTableToMemory();

    try {
        showStatus("שומר שינויים ל-GitHub...", "success");

        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

        // א. שליפת ה-SHA העדכני של הקובץ (חובה בשביל לבצע Commit ב-GitHub API)
        const getRes = await fetch(apiUrl, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!getRes.ok) {
            throw new Error("לא ניתן לאתר את קובץ הנתונים בריפו לשם עדכון ה-SHA");
        }

        const fileInfo = await getRes.json();
        const fileSha = fileInfo.sha;

        // ב. הכנת תוכן הקובץ המעודכן בקידוד Base64 (תמיכה מלאה בתווים עבריים)
        const jsonString = JSON.stringify(appData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        // ג. שליחת בקשת PUT לעדכון הקובץ ויצירת Commit
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

        showStatus("השינויים נשמרו בהצלחה בריפו ב-GitHub! (נוצר Commit חדש)", "success");
    } catch (error) {
        console.error(error);
        showStatus(`שגיאה בשמירה: ${error.message}`, "error");
    }
}
