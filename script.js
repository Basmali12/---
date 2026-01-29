// === البيانات ===
let workers = JSON.parse(localStorage.getItem('workersApp_Mod_v3')) || [];
let notes = JSON.parse(localStorage.getItem('notesApp_v1')) || [];
let secretVault = JSON.parse(localStorage.getItem('secretVault_v1')) || { total: 0, logs: [] };

let tempAttendanceList = [];
let currentLoanWorkerIndex = null;
let currentDetailWorkerIndex = null;

const loanModal = new bootstrap.Modal(document.getElementById('loanModal'));
const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));

window.onload = function() {
    document.getElementById('attendanceDate').valueAsDate = new Date();
    document.getElementById('loanDate').valueAsDate = new Date();
    renderMainTable();
    updateWorkerSelect();
    renderNotes();
    renderWorkersManagement();
    renderSecretSection();
};

function formatMoney(amount) {
    return parseFloat(amount).toLocaleString('en-US') + ' د.ع';
}

function saveData() {
    localStorage.setItem('workersApp_Mod_v3', JSON.stringify(workers));
    localStorage.setItem('notesApp_v1', JSON.stringify(notes));
    localStorage.setItem('secretVault_v1', JSON.stringify(secretVault));
}

function switchTab(tabName, navElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    navElement.classList.add('active');
    
    if(tabName === 'home') { renderMainTable(); updateWorkerSelect(); }
    if(tabName === 'workers') renderWorkersManagement();
}

// دالة التحقق من الرمز للحذف
function verifyDelete() {
    const code = prompt("🔒 هذا الإجراء محمي. أدخل الرمز (123) للتأكيد:");
    if (code === "123") return true;
    alert("⛔ رمز خاطئ! تم إلغاء العملية.");
    return false;
}

// دالة التحقق من الدخول للتطبيق
function checkLogin() {
    const pass = document.getElementById('appPassword').value;
    if (pass === "123321") {
        document.getElementById('loginOverlay').style.display = "none";
    } else {
        alert("⛔ رمز الدخول خاطئ!");
    }
}

// === 1. إضافة عامل ===
function addNewWorker() {
    const name = document.getElementById('newWorkerName').value.trim();
    const wage = document.getElementById('newWorkerWage').value;
    
    if(!name) return alert("اكتب الاسم!");
    
    workers.push({ 
        name: name, 
        defaultWage: wage ? parseFloat(wage) : 25000,
        history: [] 
    });
    saveData();
    
    document.getElementById('newWorkerName').value = '';
    document.getElementById('newWorkerWage').value = '';
    alert("تم حفظ العامل ✅");
    updateWorkerSelect();
}

// === 2. الرئيسية ===
function updateWorkerSelect() {
    const select = document.getElementById('workerAttendanceSelect');
    select.innerHTML = '<option value="">اختر عاملاً...</option>';
    workers.forEach((w, i) => {
        select.innerHTML += `<option value="${i}">${w.name}</option>`;
    });
}

function addToTempList() {
    const select = document.getElementById('workerAttendanceSelect');
    const index = select.value;
    if(index === "") return;
    
    const workerName = workers[index].name;
    
    if(!tempAttendanceList.includes(index)) {
        tempAttendanceList.push(index);
        const display = document.getElementById('tempWorkersDisplay');
        display.innerHTML += `<span>${workerName}</span>`;
    }
    select.value = "";
}

function saveBatchAttendance() {
    const date = document.getElementById('attendanceDate').value;
    if(!date) return alert("حدد التاريخ أولاً");
    if(tempAttendanceList.length === 0) return alert("اختر عمالاً للقائمة");

    tempAttendanceList.forEach(index => {
        let worker = workers[index];
        worker.history.push({
            date: date,
            type: 'wage',
            amount: worker.defaultWage || 25000
        });
    });

    saveData();
    tempAttendanceList = [];
    document.getElementById('tempWorkersDisplay').innerHTML = '';
    alert("تم حفظ الحضور بنجاح ✅");
    renderMainTable();
}

function renderMainTable() {
    const tbody = document.getElementById('mainTableBody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    workers.forEach((worker, index) => {
        let totalWages = 0;
        let daysCount = 0;

        worker.history.forEach(h => {
            if(h.type === 'wage') {
                totalWages += h.amount;
                daysCount++;
            } 
        });

        let netBalance = totalWages;
        grandTotal += netBalance;
        let colorClass = 'balance-pos'; 
        
        tbody.innerHTML += `
            <tr>
                <td>${worker.name}</td>
                <td>${daysCount} أيام</td>
                <td class="${colorClass}" style="direction:ltr">${formatMoney(netBalance)}</td>
                <td><button class="btn btn-sm btn-info text-white" onclick="showWorkDetails(${index})">👁️</button></td>
            </tr>
        `;
    });

    const totalEl = document.getElementById('grandTotalDisplay');
    totalEl.innerText = formatMoney(grandTotal);
    totalEl.className = "fw-bold m-0 balance-pos";
}

// === تفاصيل الحضور وتعديله ===
function showWorkDetails(index) {
    currentDetailWorkerIndex = index;
    const list = document.getElementById('workDatesList');
    const totalDisplay = document.getElementById('detailsTotalBalance');
    const resetBtn = document.getElementById('resetAttendanceBtn');
    
    list.innerHTML = '';
    
    const worker = workers[index];
    resetBtn.onclick = function() { resetWorkerAttendance(index); };

    let workItems = worker.history.map((h, i) => ({...h, originalIndex: i})).filter(h => h.type === 'wage');
    let totalWages = 0;

    if(workItems.length === 0) {
        list.innerHTML = '<li class="list-group-item bg-transparent text-white text-center">لا يوجد أيام عمل مسجلة</li>';
    } else {
        [...workItems].reverse().forEach(d => {
            totalWages += d.amount;
            list.innerHTML += `
                <li class="list-group-item bg-transparent text-white border-light d-flex justify-content-between align-items-center">
                    <div>
                        <span>📅 ${d.date}</span>
                    </div>
                    <div>
                        <span class="text-success ms-2">+ ${formatMoney(d.amount)}</span>
                        <span class="edit-icon" onclick="editAttendanceEntry(${index}, ${d.originalIndex})">✏️</span>
                    </div>
                </li>`;
        });
    }
    
    totalDisplay.innerText = formatMoney(totalWages);
    detailsModal.show();
}

function resetWorkerAttendance(index) {
    if(confirm("هل أنت متأكد من تصفير رصيد الحضور؟")) {
        if(!verifyDelete()) return; // طلب الرمز
        
        workers[index].history = workers[index].history.filter(h => h.type !== 'wage');
        saveData();
        renderMainTable();
        showWorkDetails(index);
    }
}

function editAttendanceEntry(workerIndex, historyIndex) {
    const entry = workers[workerIndex].history[historyIndex];
    const newAmount = prompt("قم بتعديل المبلغ:", entry.amount);
    
    if (newAmount !== null && newAmount.trim() !== "") {
        const currentDate = new Date().toISOString().split('T')[0];
        workers[workerIndex].history[historyIndex].amount = parseFloat(newAmount);
        workers[workerIndex].history[historyIndex].date = currentDate;
        saveData();
        renderMainTable();
        showWorkDetails(workerIndex);
    }
}

// === 3. الملاحظات (والقسم السري) ===
function addNote() {
    const txt = document.getElementById('noteText').value;
    if(!txt) return;
    
    const noteObj = {
        id: Date.now(),
        text: txt,
        date: new Date().toLocaleDateString('ar-EG')
    };
    notes.unshift(noteObj);
    saveData();
    document.getElementById('noteText').value = '';
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notesList');
    container.innerHTML = '';
    if(notes.length === 0) {
        container.innerHTML = '<div class="text-center text-white-50 mt-3">لا توجد ملاحظات</div>';
        return;
    }
    
    notes.forEach((note) => {
        container.innerHTML += `
            <div class="glass-card p-3 d-flex justify-content-between align-items-center">
                <div>
                    <small class="text-warning">${note.date}</small>
                    <p class="m-0 mt-1">${note.text}</p>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteNote(${note.id})">🗑️</button>
            </div>
        `;
    });
}

function deleteNote(id) {
    if(confirm("حذف الملاحظة؟")) {
        if(!verifyDelete()) return; // طلب الرمز
        notes = notes.filter(n => n.id !== id);
        saveData();
        renderNotes();
    }
}

// --- منطق الخزنة السرية ---
function toggleSecretSection() {
    const sec = document.getElementById('secretSection');
    sec.style.display = (sec.style.display === 'none') ? 'block' : 'none';
}

function renderSecretSection() {
    document.getElementById('secretTotalDisplay').innerText = formatMoney(secretVault.total);
    const list = document.getElementById('secretLogsList');
    list.innerHTML = '';
    
    // التكرار بالعكس لعرض الأحدث أولاً مع الحفاظ على الفهرس الصحيح
    for (let i = secretVault.logs.length - 1; i >= 0; i--) {
        let log = secretVault.logs[i];
        list.innerHTML += `
            <li class="list-group-item bg-transparent text-white border-light d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm text-danger border-0 p-0 me-2 fw-bold" onclick="deleteSecretLog(${i})">❌</button>
                    <span>${log.name}</span>
                </div>
                <span class="text-danger">-${formatMoney(log.amount)}</span>
            </li>
        `;
    }
}

function deleteSecretLog(index) {
    if(confirm("هل تريد حذف هذا السجل من الخزنة؟")) {
        if(!verifyDelete()) return; // طلب الرمز
        
        // استرجاع المبلغ (اختياري، هنا نحذف السجل فقط حسب الطلب)
        // secretVault.total += secretVault.logs[index].amount; 
        
        secretVault.logs.splice(index, 1);
        saveData();
        renderSecretSection();
    }
}

function addToSecretTotal() {
    const amount = parseFloat(document.getElementById('addSecretAmount').value);
    if (!amount) return;
    secretVault.total += amount;
    saveData();
    document.getElementById('addSecretAmount').value = '';
    renderSecretSection();
    alert("تم شحن الخزنة ✅");
}

function deductFromSecret() {
    const name = document.getElementById('deductNoteName').value;
    const amount = parseFloat(document.getElementById('deductAmount').value);
    if (!name || !amount) return alert("الرجاء إدخال الاسم والمبلغ");
    if (amount > secretVault.total) return alert("الرصيد غير كافي!");
    
    secretVault.total -= amount;
    secretVault.logs.push({
        name: name,
        amount: amount,
        date: new Date().toLocaleDateString()
    });
    
    saveData();
    document.getElementById('deductNoteName').value = '';
    document.getElementById('deductAmount').value = '';
    renderSecretSection();
}

// === 4. إدارة العمال والسلف ===
function renderWorkersManagement() {
    const container = document.getElementById('manageWorkersList');
    container.innerHTML = '';
    
    if(workers.length === 0) {
        container.innerHTML = '<div class="text-center p-3">لا يوجد عمال.</div>';
        return;
    }

    workers.forEach((worker, index) => {
        container.innerHTML += `
            <div class="worker-list-item">
                <span class="fw-bold">👤 ${worker.name}</span>
                <div class="worker-actions">
                    <button class="btn btn-sm btn-info text-white" onclick="showWorkDetails(${index})">التفاصيل 📄</button>
                    <button class="btn btn-sm btn-warning" onclick="openLoanModal(${index})">السلفة 💰</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteWorker(${index})">حذف 🗑️</button>
                </div>
            </div>
        `;
    });
}

function deleteWorker(index) {
    if(confirm("هل أنت متأكد من حذف هذا العامل وكل بياناته؟")) {
        if(!verifyDelete()) return; // طلب الرمز
        workers.splice(index, 1);
        saveData();
        renderWorkersManagement();
        renderMainTable();
        updateWorkerSelect();
    }
}

// --- منطق السلف داخل المودال ---
function openLoanModal(index) {
    currentLoanWorkerIndex = index;
    const worker = workers[index];
    document.getElementById('loanWorkerName').innerText = worker.name;
    document.getElementById('loanDate').valueAsDate = new Date();
    document.getElementById('loanAmount').value = '';
    renderLoanData();
    loanModal.show();
}

function renderLoanData() {
    const worker = workers[currentLoanWorkerIndex];
    const tbody = document.getElementById('loanListBody');
    tbody.innerHTML = '';
    let totalLoans = 0;
    const loans = worker.history.filter(h => h.type === 'loan');

    [...loans].reverse().forEach(l => {
        totalLoans += l.amount;
        tbody.innerHTML += `
            <tr class="text-white">
                <td>${l.date}</td>
                <td>${formatMoney(l.amount)}</td>
            </tr>
        `;
    });

    document.getElementById('totalLoanDisplay').innerText = formatMoney(totalLoans);
}

function saveLoan() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const date = document.getElementById('loanDate').value;
    if(!amount || !date) return alert("الرجاء إدخال التاريخ والمبلغ");

    workers[currentLoanWorkerIndex].history.push({ date: date, type: 'loan', amount: amount });
    saveData();
    document.getElementById('loanAmount').value = '';
    renderLoanData();
}

function resetLoans() {
    if(confirm("هل أنت متأكد من تصفير جميع السلف لهذا العامل؟")) {
        if(!verifyDelete()) return; // طلب الرمز
        workers[currentLoanWorkerIndex].history = workers[currentLoanWorkerIndex].history.filter(h => h.type !== 'loan');
        saveData();
        renderLoanData();
    }
}
