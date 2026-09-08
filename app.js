// קובץ מעודכן - app_5.js

function ensureStudioSessionsArray() {
    if (!appData.studio_sessions_payment) {
        appData.studio_sessions_payment = {};
    }
    if (!appData.studio_sessions_payment[currentMonth]) {
        appData.studio_sessions_payment[currentMonth] = [
            { session_number: 1, status: "לא שולם" },
            { session_number: 2, status: "לא שולם" },
            { session_number: 3, status: "לא שולם" },
            { session_number: 4, status: "לא שולם" }
        ];
    }
}

function toggleStudioSessionStatus(index) {
    ensureStudioSessionsArray();
    const sessions = appData.studio_sessions_payment[currentMonth];
    if (sessions[index]) {
        sessions[index].status = sessions[index].status === "שולם" ? "לא שולם" : "שולם";
        
        // שמירה ורינדור מחדש של הממשק המעודכן
        saveDataToLocalStorage();
        renderStudioSessionsCheckboxes();
        updateSummaryCalculations(); // עדכון הסיכומים במידה ויש
    }
}

function renderStudioSessionsCheckboxes() {
    ensureStudioSessionsArray();
    const container = document.getElementById("studio-sessions-checkboxes");
    if (!container) return;
    
    container.innerHTML = "";

    const sessions = appData.studio_sessions_payment[currentMonth];
    sessions.forEach((session, index) => {
        const isPaid = session.status === "שולם";
        const label = document.createElement("label");
        label.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${isPaid ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-slate-300 text-slate-700'}`;
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = isPaid;
        checkbox.className = "rounded text-emerald-600 focus:ring-emerald-500";
        checkbox.addEventListener("change", () => {
            toggleStudioSessionStatus(index);
        });

        const span = document.createElement("span");
        span.textContent = `מפגש ${session.session_number}`;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}
