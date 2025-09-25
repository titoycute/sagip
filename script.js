import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class App {
  constructor() {
    this.elements = {
      mainContent: document.getElementById("main-content"),
      bottomNav: document.getElementById("bottom-nav"),
      modal: document.getElementById("modal"),
      modalContent: document.getElementById("modal-content"),
      modalIcon: document.getElementById("modal-icon"),
      modalTitle: document.getElementById("modal-title"),
      modalMessage: document.getElementById("modal-message"),
      modalButtons: document.getElementById("modal-buttons"),
      adminNavButton: document.getElementById("admin-nav-button"),
    };

    this.auth = window.firebaseServices.auth;
    this.db = window.firebaseServices.db;
    this.currentUser = null;
    this.userRole = 'user';
    this.unsubscribeHelpRequests = null;
    this.unsubscribeUserStatus = null;
    this.map = null; 
    this.mapMarkers = {};

 
  }

  init() {
    this.setupEventListeners();
    onAuthStateChanged(this.auth, (user) => {
    this.handleAuthStateChange(user);
});
  }

  setupEventListeners() {
    this.elements.mainContent.addEventListener("submit", (e) => {
      e.preventDefault();
      if (e.target.id === "login-form") this.handleLogin(e);
      if (e.target.id === "register-form") this.handleRegister(e);
      if (e.target.id === "help-request-form") this.submitHelpRequest(e);
    });
    this.elements.mainContent.addEventListener("click", (e) => {
    const target = e.target; // <-- ADD THIS LINE
    if (target.closest('#help-button')) this.handleHelpRequest();
    if (target.closest('button[data-action="updateStatus"]')) {
        const button = target.closest('button[data-action="updateStatus"]');
        const requestId = button.dataset.id;
        const newStatus = button.dataset.status;
        this.updateHelpRequestStatus(requestId, newStatus);
    }
});
     this.elements.mainContent.addEventListener("change", (e) => {
            if (e.target.id === 'register-region') this.handleProvinceChange(e.target.value);
      if (e.target.id === 'register-province') this.handleMunicipalityChange(e.target.value);
      if (e.target.id === 'register-municipality') this.handleBarangayChange(e.target.value);
  
    });
  }

 async handleAuthStateChange(user) {
    if (user) {
      this.currentUser = user;
      const userDoc = await getDoc(doc(this.db, "users", user.uid));
      this.userRole = (userDoc.exists() && userDoc.data().role === 'admin') ? 'admin' : 'user';
      this.elements.bottomNav.classList.remove("hidden");
      if (this.userRole === 'admin') {
        this.elements.adminNavButton.classList.remove('hidden');
        this.navigateTo('admin');
      } else {
        this.elements.adminNavButton.classList.add('hidden');
        this.navigateTo('home');
      }
    } else {
      this.currentUser = null;
      this.userRole = 'user';
      if (this.map) { this.map.remove(); this.map = null; }
      if (this.unsubscribeHelpRequests) this.unsubscribeHelpRequests();
      if (this.unsubscribeUserStatus) this.unsubscribeUserStatus();
      this.elements.bottomNav.classList.add("hidden");
      this.renderLogin();
    }
  }

  navigateTo(page) {
      if (page === 'home') this.renderHome();
      if (page === 'admin' && this.userRole === 'admin') this.renderAdminDashboard();
  }

  renderLogin() {
    this.elements.mainContent.innerHTML = `
      <div class="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-2xl shadow-xl animate-fade-in">
        <div class="text-center mb-8"><i data-lucide="shield-alert" class="mx-auto h-16 w-16 text-red-500"></i><h2 class="text-3xl font-bold mt-4">Welcome Back to Sagip</h2><p class="text-gray-400">Sign in to continue.</p></div>
        <form id="login-form" class="space-y-6">
            <div class="relative"><input type="email" id="login-email" placeholder=" " class="form-input peer" required /><label for="login-email" class="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-gray-800 px-2 peer-focus:px-2 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1">Email Address</label></div>
            <div class="relative"><input type="password" id="login-password" placeholder=" " class="form-input peer" required /><label for="login-password" class="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-gray-800 px-2 peer-focus:px-2 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1">Password</label></div>
            <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <p class="text-center mt-6 text-sm">Don't have an account? <a href="#" onclick="app.renderRegister()" class="text-red-500 font-semibold hover:underline">Register Now</a></p>
      </div>`;
    lucide.createIcons();
  }
  
  renderRegister() {
    this.elements.mainContent.innerHTML = `
      <div class="max-w-lg mx-auto mt-8 p-6 bg-gray-800 rounded-2xl shadow-xl animate-fade-in">
        <div class="text-center mb-8"><i data-lucide="user-plus" class="mx-auto h-16 w-16 text-red-500"></i><h2 class="text-3xl font-bold mt-4">Create Your Sagip Account</h2><p class="text-gray-400">Please fill in the details below.</p></div>
        <form id="register-form" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><input type="text" id="register-firstname" placeholder="First Name" class="form-input" required /><input type="text" id="register-lastname" placeholder="Last Name" class="form-input" required /></div>
          <div><input type="date" id="register-birthdate" class="form-input" required /></div><hr class="border-gray-600">
          <h3 class="text-lg font-semibold text-gray-300 pt-2">Your Address</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <select id="register-region" class="form-input bg-gray-700" required><option value="">-- Loading Regions --</option></select>
            <select id="register-province" class="form-input bg-gray-700" required disabled><option value="">-- Select Province --</option></select>
            <select id="register-municipality" class="form-input bg-gray-700" required disabled><option value="">-- Select Municipality --</option></select>
            <select id="register-barangay" class="form-input bg-gray-700" required disabled><option value="">-- Select Barangay --</option></select>
          </div>
          <input type="text" id="register-street" placeholder="House No. & Street Address" class="form-input" required />
          <hr class="border-gray-600">
          <h3 class="text-lg font-semibold text-gray-300 pt-2">Account Credentials</h3>
          <div class="space-y-6"><input type="email" id="register-email" placeholder="Email" class="form-input" required /><input type="password" id="register-password" placeholder="Password (min. 6 characters)" class="form-input" required /></div>
          <button type="submit" class="btn btn-primary w-full">Create Account</button>
        </form>
        <p class="text-center mt-6 text-sm">Already have an account? <a href="#" onclick="app.renderLogin()" class="text-red-500 font-semibold hover:underline">Login</a></p>
      </div>`;
    lucide.createIcons();
    this.handleRegionChange();
  }

    populateDropdown(elementId, items, defaultOptionText) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = `<option value="">-- ${defaultOptionText} --</option>`;
    items.sort((a, b) => a.name.localeCompare(b.name));
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.code;
      option.textContent = item.name;
      select.appendChild(option);
    });
    select.disabled = false;
  }

  async handleRegionChange() {
    try {
      const response = await fetch('https://psgc.gitlab.io/api/regions/');
      const regions = await response.json();
      this.populateDropdown('register-region', regions, 'Select Region');
    } catch (error) {
      console.error("Failed to load regions:", error);
      this.showModal("Error", "Could not load regions. Please check your internet connection.", "error");
    }
  }

  async handleProvinceChange(regionCode) {
    if (!regionCode) return;
    document.getElementById('register-municipality').disabled = true;
    document.getElementById('register-barangay').disabled = true;
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
      const provinces = await response.json();
      this.populateDropdown('register-province', provinces, 'Select Province');
    } catch (error) {
      console.error("Failed to load provinces:", error);
    }
  }

  async handleMunicipalityChange(provinceCode) {
    if (!provinceCode) return;
    document.getElementById('register-barangay').disabled = true;
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const municipalities = await response.json();
      this.populateDropdown('register-municipality', municipalities, 'Select Municipality');
    } catch (error) {
      console.error("Failed to load municipalities:", error);
    }
  }

  async handleBarangayChange(municipalityCode) {
    if (!municipalityCode) return;
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${municipalityCode}/barangays/`);
      const barangays = await response.json();
      this.populateDropdown('register-barangay', barangays, 'Select Barangay');
    } catch (error) {
      console.error("Failed to load barangays:", error);
    }
  }

  renderHome() {
    this.elements.mainContent.innerHTML = `
        <div class="center-content h-full py-12 text-center">
             <div id="user-request-status" class="mb-8 p-4 bg-gray-800 rounded-lg shadow-lg hidden"></div>
            <h2 class="text-2xl font-semibold mb-4">In case of emergency, press the button.</h2>
            <p class="text-gray-400 mb-8 max-w-sm mx-auto">Your location will be sent to our response team immediately.</p>
            <button id="help-button">HELP</button>
        </div>`;
    lucide.createIcons();
    this.listenForUserHelpRequestStatus();
  }

  renderAdminDashboard() {
    this.elements.mainContent.innerHTML = `
      <div class="space-y-8">
        <div><h2 class="text-3xl font-bold">Admin Dashboard</h2><p class="text-gray-400">Live emergency requests plotted on the map.</p></div>
        <div id="admin-map-container" class="bg-gray-800 rounded-xl shadow-lg relative overflow-hidden z-0" style="height: 50vh;"></div>
        <div id="live-requests-container"><h3 class="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">Live Requests</h3><div id="live-requests-list" class="space-y-4"></div></div>
        <div id="completed-requests-container" class="mt-12"><h3 class="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">Completed Requests</h3><div id="completed-requests-list" class="space-y-4"></div></div>
      </div>`;
    this.initMap();
    this.listenForHelpRequests();
  }

  initMap() {
    if (this.map) { this.map.remove(); }
   this.map = L.map('admin-map-container').setView([11.56, 124.40], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(this.map);
  }

   async handleRegister(e) {
    const form = e.target.elements;
    const email = form["register-email"].value;
    const password = form["register-password"].value;
    if (password.length < 6) { return this.showModal("Error", "Password must be at least 6 characters long.", "error"); }

    const getSelectedText = (elementId) => {
        const select = form[elementId];
        if (select && select.selectedIndex > 0) {
            return select.options[select.selectedIndex].text;
        }
        return "";
    };

    const userData = {
        firstName: form["register-firstname"].value,
        lastName: form["register-lastname"].value,
        birthdate: form["register-birthdate"].value,
        address: {
            region: getSelectedText("register-region"),
            province: getSelectedText("register-province"),
            municipality: getSelectedText("register-municipality"),
            barangay: getSelectedText("register-barangay"),
            street: form["register-street"].value
        },
        email: email,
        role: 'user',
        createdAt: serverTimestamp()
    };

    if (!userData.address.region || !userData.address.province || !userData.address.municipality || !userData.address.barangay || !userData.address.street) {
        return this.showModal("Error", "Please complete all address fields.", "error");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await setDoc(doc(this.db, "users", userCredential.user.uid), userData);
    } catch (error) { this.showModal("Error", error.code === 'auth/email-already-in-use' ? "This email address is already in use." : "Registration failed. Please try again.", "error"); }
  }

  async handleLogin(e) {
    const email = e.target.elements["login-email"].value;
    const password = e.target.elements["login-password"].value;
    try { await signInWithEmailAndPassword(this.auth, email, password); } catch (error) { this.showModal("Error", "Failed to login. Please check your credentials.", "error"); }
  }



  handleLogout() { signOut(this.auth); }

  
    
    async handleAuthStateChange(user) {
    if (user) {
        this.currentUser = user;
        const userDoc = await getDoc(doc(this.db, "users", user.uid));
        this.userRole = (userDoc.exists() && userDoc.data().role === 'admin') ? 'admin' : 'user';
        this.elements.bottomNav.classList.remove("hidden");

        if (this.userRole === 'admin') {
            this.elements.adminNavButton.classList.remove('hidden');
            this.navigateTo('admin');
        } else {
            this.elements.adminNavButton.classList.add('hidden');
            this.navigateTo('home');
        }
    } else {
        this.currentUser = null;
        this.userRole = 'user';
        if (this.map) { this.map.remove(); this.map = null; }
        if (this.unsubscribeHelpRequests) this.unsubscribeHelpRequests();
        if (this.unsubscribeUserStatus) this.unsubscribeUserStatus();
        this.elements.bottomNav.classList.add("hidden");
        this.renderLogin();
    }
}

  handleHelpRequest() {
    const modalContentHTML = `
      <form id="help-request-form" class="text-left">
        <div class="space-y-4">
          <label for="emergency-type" class="block text-sm font-medium text-gray-300">Type of Emergency</label>
          <select id="emergency-type" class="form-input bg-gray-700 w-full" required>
            <option value="">-- Select one --</option>
            <option value="Vehicular Accident">Vehicular Accident</option>
            <option value="Rescue / Evacuation">Rescue / Evacuation</option>
            <option value="Fire">Fire</option>
            <option value="Medical">Medical Emergency</option>
          </select>
          <label for="additional-info" class="block text-sm font-medium text-gray-300">Additional Information (Optional)</label>
          <textarea id="additional-info" rows="3" class="form-input bg-gray-700 w-full" placeholder="e.g., House is blue, near the corner"></textarea>
        </div>
        <div id="modal-buttons" class="mt-6 flex flex-col space-y-2">
            <button type="submit" class="btn btn-primary">Send Help Request</button>
            <button type="button" onclick="app.closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>`;
    this.showModal("Emergency Details", modalContentHTML, "info", true);

    // Add event listener to the form after it's in the DOM
    const form = document.getElementById('help-request-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitHelpRequest(e);
    });
  }

  async submitHelpRequest(e) {
    if (!this.currentUser) {
        this.showModal("Error", "You must be logged in to send a help request.", "error");
        return;
    }

    const emergencyType = e.target['emergency-type'].value;
    const additionalInfo = e.target['additional-info'].value;

    if (!emergencyType) {
        this.showModal("Error", "Please select an emergency type.", "error");
        return;
    }

    this.showModal("Sending...", "Getting your location and sending request.", "info");

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const helpRequest = {
           userId: this.currentUser.uid,
            email: this.currentUser.email,
            emergencyType,
            additionalInfo,
            location: {
                lat: latitude,
                lng: longitude
            },
            timestamp: serverTimestamp(),
            status: 'pending'
        };

        try {
            await addDoc(collection(this.db, "helpRequests"), helpRequest);
            this.showModal("Success", "Your help request has been sent.", "success");
        } catch (error) {
            console.error("Error sending help request: ", error);
            this.showModal("Error", "Could not send help request. Please try again.", "error");
        }
    }, (error) => {
        console.error("Geolocation error: ", error);
        this.showModal("Error", "Could not get your location. Please enable location services and try again.", "error");
    });
  }
 

  listenForUserHelpRequestStatus() {
    if (this.unsubscribeUserStatus) this.unsubscribeUserStatus();
    if (!this.currentUser) return;
    const q = query(collection(this.db, "helpRequests"), where("userId", "==", this.currentUser.uid), orderBy("timestamp", "desc"), limit(1));
    this.unsubscribeUserStatus = onSnapshot(q, (snapshot) => {
      const statusContainer = document.getElementById('user-request-status');
      if (!statusContainer) return;
      if (snapshot.empty || snapshot.docs[0].data().status === 'completed') {
        statusContainer.classList.add('hidden');
        return;
      }
      const request = snapshot.docs[0].data();
      const statusColors = { pending: 'text-yellow-400', ongoing: 'text-blue-400' };
      statusContainer.innerHTML = `<h3 class="text-lg font-bold">Your Live Request Status</h3><p class="text-2xl font-bold ${statusColors[request.status] || 'text-gray-400'}">${request.status.toUpperCase()}</p><p class="text-sm text-gray-500">Emergency: ${request.emergencyType}</p>`;
      statusContainer.classList.remove('hidden');
    });
  }

  async updateHelpRequestStatus(requestId, newStatus) {
    const requestRef = doc(this.db, "helpRequests", requestId);
    try { await updateDoc(requestRef, { status: newStatus }); } catch (error) { this.showModal('Error', 'Could not update status.', 'error'); }
  }

  listenForHelpRequests() {
    if (this.unsubscribeHelpRequests) this.unsubscribeHelpRequests();
    const q = query(collection(this.db, 'helpRequests'), orderBy("timestamp", "desc"));
    this.unsubscribeHelpRequests = onSnapshot(q, (snapshot) => {
      const liveList = document.getElementById('live-requests-list');
      const completedList = document.getElementById('completed-requests-list');
      if (!liveList || !completedList || !this.map) return;
      liveList.innerHTML = ''; completedList.innerHTML = '';
      Object.values(this.mapMarkers).forEach(marker => marker.remove());
      this.mapMarkers = {};
      let liveCount = 0, completedCount = 0;
      const locations = [];
      snapshot.forEach((docSnap) => {
        const request = docSnap.data(), requestId = docSnap.id;
        if (request.status === 'completed') {
            completedList.appendChild(this.createRequestElement(request, requestId, false));
            completedCount++;
        } else {
            liveList.appendChild(this.createRequestElement(request, requestId, true));
            liveCount++;
            if (request.location && request.location.lat) {
                const latLng = [request.location.lat, request.location.lng];
                const marker = L.marker(latLng).addTo(this.map).bindPopup(`<b>${request.email}</b><br>${request.emergencyType}`).openPopup();
                this.mapMarkers[requestId] = marker;
                locations.push(latLng);
            }
        }
      });
      if(liveCount === 0) liveList.innerHTML = `<p class="text-gray-500">No active help requests.</p>`;
      if(completedCount === 0) completedList.innerHTML = `<p class="text-gray-500">No completed requests yet.</p>`;
      if (locations.length > 0) this.map.fitBounds(locations, { padding: [50, 50] });
    });
  }


 // script.js

createRequestElement(request, requestId, isLive) {
      const element = document.createElement('div');
      element.className = 'bg-gray-800 p-4 rounded-lg shadow-md';
      const date = request.timestamp?.toDate().toLocaleString() || 'N/A';
      const statusColors = { pending: 'text-yellow-400', ongoing: 'text-blue-400', completed: 'text-green-400' };
      let actionButtons = '';
      if (isLive) {
          actionButtons = `
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
                <p class="text-sm font-semibold">Update Status:</p>
                <button data-action="updateStatus" data-id="${requestId}" data-status="ongoing" class="btn-secondary text-xs px-2 py-1">Ongoing</button>
                <button data-action="updateStatus" data-id="${requestId}" data-status="completed" class="btn-secondary text-xs px-2 py-1">Completed</button>
            </div>`;
      }
      element.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="font-bold">${request.email}</p><p class="text-sm text-red-400 font-semibold">${request.emergencyType}</p>
                <p class="text-sm text-gray-300 mt-1">${request.additionalInfo || 'No additional details.'}</p><p class="text-xs text-gray-500 mt-2">Time: ${date}</p>
            </div>
            <div class="text-right">
                <p class="font-semibold ${statusColors[request.status] || ''}">${request.status.toUpperCase()}</p>
                 <a href="https://www.google.com/maps?q=${request.location.lat},${request.location.lng}" target="_blank" class="text-blue-400 text-xs hover:underline">View Map</a>
            </div>
        </div>
        ${actionButtons}`;
      return element;
  }
  
  showModal(title, content, type = "info", isContentHTML = false) {
    const icons = { success: `<i data-lucide="check-circle" class="w-16 h-16 text-green-500"></i>`, error: `<i data-lucide="x-circle" class="w-16 h-16 text-red-500"></i>`, info: `<i data-lucide="info" class="w-16 h-16 text-blue-500"></i>`};
    this.elements.modalTitle.textContent = title;
    this.elements.modalIcon.innerHTML = icons[type] || icons["info"];
    if (isContentHTML) {
        this.elements.modalMessage.innerHTML = content;
        // Buttons are now part of the HTML content passed in
    } else {
        this.elements.modalMessage.textContent = content;
        this.elements.modalButtons.innerHTML = `<button onclick="app.closeModal()" class="btn btn-secondary">Close</button>`;
    }
    this.elements.modal.classList.remove("hidden");
    lucide.createIcons();
  }

  closeModal() {
    this.elements.modal.classList.add("hidden");
    this.elements.modalMessage.innerHTML = '';
    this.elements.modalButtons.innerHTML = ''; // Clear buttons on close
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
  window.app.init();
});