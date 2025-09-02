import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCPEsXMbo4X2t9ikhADrAKWhWabwH060L8",
    authDomain: "final-dashboard-8fa19.firebaseapp.com",
    projectId: "final-dashboard-8fa19",
    storageBucket: "final-dashboard-8fa19.firebasestorage.app",
    messagingSenderId: "859410640444",
    appId: "1:859410640444:web:05519a1d78383230bddd39",
    measurementId: "G-CXEK1D40WL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login_email').value = user.email;
        fetchCarrierData(user.uid);
    } else {
        window.location.href = './login.html';
    }
});

document.getElementById('logoutButton').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = './login.html';
    });
});

const tabs = document.querySelectorAll('.tab-link');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(tab.getAttribute('href')).classList.add('active');
    });
});

async function fetchCarrierData(uid) {
    const docRef = doc(db, "carriers", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        populateForm(docSnap.data());
    } else {
        console.log("No such document!");
        alert("Could not find carrier data.");
    }
}

function populateForm(data) {
    // Simple fields
    const fieldsToPopulate = {
        '#companyForm': { companyName: data.companyName, taxId: data.taxId, address: data.address, email: data.email, phone: data.phone, fax: data.fax, mcNumber: data.mcNumber, dotNumber: data.dotNumber, dunsNumber: data.dunsNumber },
        '#officerForm': { officerName: data.officerName, officerTitle: data.officerTitle, officerEmail: data.officerEmail, officerMobile: data.officerMobile },
        '#documentsForm': { insurance_company: data.insurance?.company, insurance_agent: data.insurance?.agent, cargo_insurance: data.insurance?.cargoAmount, liability_insurance: data.insurance?.liabilityAmount },
        '#paymentForm': { payeeName: data.payeeName, factoringName: data.factoringName, factoringAddress: data.factoringAddress, factoringPhone: data.factoringPhone },
        '#preferencesForm': { notes: data.notes }
    };

    for (const formSelector in fieldsToPopulate) {
        for (const name in fieldsToPopulate[formSelector]) {
            const element = document.querySelector(`${formSelector} [name="${name}"]`);
            if (element) {
                element.value = fieldsToPopulate[formSelector][name] || '';
            }
        }
    }

    updateFileLink('coi', data.fileUrls?.coi);
    updateFileLink('w9', data.fileUrls?.w9);
    updateFileLink('authority', data.fileUrls?.authority);
    updateFileLink('noa', data.fileUrls?.noa);
    
    populateCheckboxes(data.specialCerts || []);
    
    // Dynamic Sections
    document.getElementById('drivers-container').innerHTML = '';
    document.getElementById('equipment-container').innerHTML = '';
    document.getElementById('lanes-container').innerHTML = '';
    if (data.drivers) data.drivers.forEach(d => addDriver(d));
    if (data.equipment) data.equipment.forEach(e => addEquipment(e));
    if (data.lanes) data.lanes.forEach(l => addLane(l));
}

function updateFileLink(fileKey, url) {
    const link = document.querySelector(`.file-link[data-file="${fileKey}"]`);
    if (link) link.style.display = url ? (link.href = url, 'inline-block') : 'none';
}

function populateCheckboxes(selectedCerts) {
    const container = document.getElementById('certs-container');
    container.innerHTML = ["Hazmat", "TWIC", "CARB", "Team", "Liftgate"].map(cert => `
        <div class="checkbox-item" style="display: flex; align-items: center;">
            <input type="checkbox" name="certs[]" value="${cert}" ${selectedCerts.includes(cert) ? 'checked' : ''} style="margin-right: 0.5rem;">
            <label>${cert}</label>
        </div>`
    ).join('');
}

const addDriver = (data = {}) => {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="input-grid">
            <div class="form-group"><label>Full Name</label><input type="text" name="driver_name" value="${data.driver_name || ''}"></div>
            <div class="form-group"><label>Phone</label><input type="tel" name="driver_phone" value="${data.driver_phone || ''}"></div>
            <div class="form-group"><label>License #</label><input type="text" name="driver_license" value="${data.driver_license || ''}"></div>
            <div class="form-group"><label>Issue Date</label><input type="date" name="driver_license_issue" value="${data.driver_license_issue || ''}"></div>
            <div class="form-group"><label>Exp Date</label><input type="date" name="driver_license_exp" value="${data.driver_license_exp || ''}"></div>
        </div>
        <button type="button" class="btn btn-remove">Remove</button>`;
    document.getElementById('drivers-container').appendChild(item);
};

const addEquipment = (data = {}) => {
    const types = ["Reefer", "Dry Van", "Hotshot", "Truck", "Flatbed", "Step Deck", "Power Only", "Other"];
    const typeOptions = types.map(t => `<option value="${t}" ${data.equip_type === t ? 'selected' : ''}>${t}</option>`).join('');
    const qtyOptions = Array.from({length: 50}, (_, i) => `<option value="${i+1}" ${data.equip_qty == (i+1) ? 'selected' : ''}>${i+1}</option>`).join('');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="input-grid">
            <div class="form-group"><label>Type</label><select name="equip_type">${typeOptions}</select></div>
            <div class="form-group"><label>Quantity</label><select name="equip_qty">${qtyOptions}</select></div>
        </div>
        <button type="button" class="btn btn-remove">Remove</button>`;
    document.getElementById('equipment-container').appendChild(item);
};

const addLane = (data = {}) => {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="input-grid">
            <div class="form-group"><label>Origin</label><input type="text" name="lane_origin" value="${data.lane_origin || ''}"></div>
            <div class="form-group"><label>Destination</label><input type="text" name="lane_dest" value="${data.lane_dest || ''}"></div>
            <div class="form-group"><label>Rate/Mile</label><input type="text" name="lane_rate" value="${data.lane_rate || ''}"></div>
        </div>
        <button type="button" class="btn btn-remove">Remove</button>`;
    document.getElementById('lanes-container').appendChild(item);
};

document.getElementById('addDriverBtn').addEventListener('click', () => addDriver());
document.getElementById('addEquipmentBtn').addEventListener('click', () => addEquipment());
document.getElementById('addLaneBtn').addEventListener('click', () => addLane());
document.querySelector('.main-content').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
        e.target.closest('.dynamic-item').remove();
    }
});

async function updateSectionData(dataObject) {
    if (!currentUser) return;
    const docRef = doc(db, "carriers", currentUser.uid);
    try {
        await updateDoc(docRef, dataObject);
        showStatusMessage('Successfully saved changes!', 'success');
    } catch (e) {
        showStatusMessage(`Error: ${e.message}`, 'error');
        console.error("Error updating document: ", e);
    }
}

function getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

const getDynamicData = (containerId, fields) => 
    Array.from(document.querySelectorAll(`#${containerId} .dynamic-item`)).map(item =>
        fields.reduce((data, field) => {
            const input = item.querySelector(`[name="${field}"]`);
            if (input) data[field] = input.value;
            return data;
        }, {})
    );


document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new_password').value;
    if (newPassword) {
        if (newPassword.length < 6) {
            return showStatusMessage('Password must be at least 6 characters long.', 'error');
        }
        try {
            await updatePassword(currentUser, newPassword);
            showStatusMessage('Password updated successfully!', 'success');
            e.target.reset();
        } catch(error) {
            showStatusMessage(`Error updating password: ${error.message}`, 'error');
        }
    }
});

document.getElementById('companyForm').addEventListener('submit', e => { e.preventDefault(); updateSectionData(getFormData(e.target)); });
document.getElementById('officerForm').addEventListener('submit', e => { e.preventDefault(); updateSectionData(getFormData(e.target)); });
document.getElementById('driversForm').addEventListener('submit', e => { e.preventDefault(); updateSectionData({ drivers: getDynamicData('drivers-container', ['driver_name', 'driver_phone', 'driver_license', 'driver_license_issue', 'driver_license_exp']) }); });
document.getElementById('equipmentForm').addEventListener('submit', e => { e.preventDefault(); updateSectionData({ equipment: getDynamicData('equipment-container', ['equip_type', 'equip_qty']) }); });

document.getElementById('preferencesForm').addEventListener('submit', e => {
    e.preventDefault();
    updateSectionData({
        lanes: getDynamicData('lanes-container', ['lane_origin', 'lane_dest', 'lane_rate']),
        specialCerts: Array.from(document.querySelectorAll('#certs-container input:checked')).map(cb => cb.value),
        notes: e.target.notes.value,
    });
});

async function handleFormWithFiles(e, fileMappings) {
    e.preventDefault();
    const form = e.target;
    const staticData = getFormData(form);
    
    // Remove file inputs from static data to avoid Firestore errors
    Object.keys(fileMappings).forEach(key => delete staticData[key]);
    
    // Remap insurance fields for correct structure
    if (staticData.insurance_company) {
        staticData.insurance = {
            company: staticData.insurance_company,
            agent: staticData.insurance_agent,
            cargoAmount: staticData.cargo_insurance,
            liabilityAmount: staticData.liability_insurance
        };
        delete staticData.insurance_company;
        delete staticData.insurance_agent;
        delete staticData.cargo_insurance;
        delete staticData.liability_insurance;
    }

    await updateSectionData(staticData);
    for (const inputName in fileMappings) {
        await uploadFileAndUpdateUrl(form[inputName], fileMappings[inputName].key, fileMappings[inputName].path);
    }
}

document.getElementById('documentsForm').addEventListener('submit', e => handleFormWithFiles(e, {
    'file_coi': { key: 'coi', path: 'insurance' },
    'file_w9': { key: 'w9', path: 'legal' },
    'file_authority': { key: 'authority', path: 'legal' }
}));

document.getElementById('paymentForm').addEventListener('submit', e => handleFormWithFiles(e, {
    'file_noa': { key: 'noa', path: 'payment' }
}));

async function uploadFileAndUpdateUrl(fileInput, fileKey, path) {
    if (!currentUser || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const storageRef = ref(storage, `${currentUser.uid}/${path}/${file.name}`);
    try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await updateSectionData({ [`fileUrls.${fileKey}`]: downloadURL });
        updateFileLink(fileKey, downloadURL);
    } catch(error) {
        showStatusMessage(`Error uploading ${fileKey}: ${error.message}`, 'error');
        console.error("File upload error:", error);
    }
}

const statusMessage = document.getElementById('statusMessage');
function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { statusMessage.className = 'status-message hidden'; }, 4000);
}
