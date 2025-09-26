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
    getDocs,
  startAfter,
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
      completedNavButton: document.getElementById("completed-nav-button"),
    };
    
    this.auth = window.firebaseServices.auth;
    this.db = window.firebaseServices.db;
    this.currentUser = null;
    this.userRole = 'user';
    this.unsubscribeHelpRequests = null;
    this.unsubscribeUserStatus = null;
    this.map = null; 
    this.mapMarkers = {};
    this.currentUserProfile = null;
    this.notificationSound = document.getElementById("notification-sound");
    this.hasPendingRequests = false; 
      this.lastCompletedRequestDoc = null; // Stores the last document for the cursor
    this.isFetchingCompleted = false; // Prevents multiple fetches at the same time

 
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

if (userDoc.exists()) {
    // This line is new: it stores the user's complete profile.
    this.currentUserProfile = userDoc.data(); 
    this.userRole = this.currentUserProfile.role === 'admin' ? 'admin' : 'user';
} else {
    // This is a fallback in case the profile is missing.
    this.userRole = 'user';
    this.currentUserProfile = { email: user.email, firstName: "Unknown", lastName: "User" };
}  this.elements.bottomNav.classList.remove("hidden");
      if (this.userRole === 'admin') {
        this.elements.adminNavButton.classList.remove('hidden');
        this.elements.completedNavButton.classList.remove('hidden');
        this.navigateTo('admin');
      } else {
        this.elements.adminNavButton.classList.add('hidden');
        this.elements.completedNavButton.classList.add('hidden');
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
      if (page === 'completed' && this.userRole === 'admin') this.renderCompletedDashboard();
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
          <input type="text" id="register-contact" placeholder="Contact Number" class="form-input" required />
          <p>Birthday:</p>
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
    // We will call the new listener function here in the next step.
    this.listenForUserHelpRequestStatus(); 
}

  renderAdminDashboard() {
    this.elements.mainContent.innerHTML = `
      <div class="space-y-8">
        <div><h2 class="text-3xl font-bold">Admin Dashboard</h2><p class="text-gray-400">Live emergency requests plotted on the map.</p></div>
        <div id="admin-map-container" class="bg-gray-800 rounded-xl shadow-lg relative overflow-hidden z-0" style="height: 50vh;"></div>
        <div id="live-requests-container"><h3 class="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">Live Requests</h3><div id="live-requests-list" class="space-y-4"></div></div>
        <div id="completed-requests-container" class="mt-12"><h3 class="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">_</h3><div id="completed-requests-list" class="space-y-4"></div></div>
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
        contact: form["register-contact"].value,
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
            firstName: this.currentUserProfile.firstName,
            lastName: this.currentUserProfile.lastName,
            contact: this.currentUserProfile.contact,
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

    const q = query(collection(this.db, 'helpRequests'), where("status", "!=", "completed"));

    this.unsubscribeHelpRequests = onSnapshot(q, (snapshot) => {
        const liveList = document.getElementById('live-requests-list');
        if (!liveList || !this.map) return;

        liveList.innerHTML = '';
        Object.values(this.mapMarkers).forEach(marker => marker.remove());
        this.mapMarkers = {};
        const locations = [];
        let pendingCount = 0; // Reset count on each update

        if (snapshot.empty) {
            liveList.innerHTML = `<p class="text-gray-500">No active help requests.</p>`;
        }

        snapshot.forEach((docSnap) => {
            const request = docSnap.data();
            const requestId = docSnap.id;

            if (request.status === 'pending') {
                pendingCount++;
            }

            liveList.appendChild(this.createRequestElement(request, requestId, true)); 

            if (request.location && request.location.lat) {
                const latLng = [request.location.lat, request.location.lng];
                const marker = L.marker(latLng).addTo(this.map).bindPopup(`<b>${request.firstName} ${request.lastName}</b><br>${request.emergencyType}`).openPopup();
                this.mapMarkers[requestId] = marker;
                locations.push(latLng);
            }
        });

        // --- NEW, SIMPLIFIED SOUND LOGIC ---
        if (pendingCount > 0) {
            // If there are pending requests, play the sound.
            this.notificationSound.play().catch(e => console.log("Audio autoplay blocked by browser."));
        } else {
            // If there are NO pending requests, stop the sound and reset it.
            this.notificationSound.pause();
            this.notificationSound.currentTime = 0;
        }
        // --- END SOUND LOGIC ---

        if (locations.length > 0) this.map.fitBounds(locations, { padding: [50, 50] });
    });
}

// script.js

// script.js

renderCompletedDashboard() {
    this.elements.mainContent.innerHTML = `
      <div class="space-y-8">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-3xl font-bold">Completed Requests</h2>
                <p class="text-gray-400">A log of all resolved requests.</p>
            </div>
            <button onclick="app.navigateTo('admin')" class="btn-secondary !w-auto px-4 py-2 text-sm">
                <i data-lucide="arrow-left" class="inline-block -mt-1 mr-2"></i>Back to Map
            </button>
        </div>
        <div id="completed-requests-list" class="space-y-4">
            </div>
        <div id="show-more-container" class="text-center mt-6"></div>
      </div>`;
    lucide.createIcons();
    
    // Reset pagination state and fetch the first batch
    this.lastCompletedRequestDoc = null; 
    this.fetchCompletedRequests();
}

// script.js

listenForCompletedRequests() {
    const q = query(collection(this.db, 'helpRequests'), where("status", "==", "completed"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const completedList = document.getElementById('completed-requests-list');
        if (!completedList) return;

        if (snapshot.empty) {
            completedList.innerHTML = `<p class="text-gray-500">No completed requests yet.</p>`;
            return;
        }

        completedList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const request = docSnap.data();
            const requestId = docSnap.id;
            completedList.appendChild(this.createRequestElement(request, requestId, false));
        });
    });
  }
  
  // script.js

async fetchCompletedRequests(loadMore = false) {
    if (this.isFetchingCompleted) return; // Prevent simultaneous fetches
    this.isFetchingCompleted = true;

    const listContainer = document.getElementById('completed-requests-list');
    const showMoreContainer = document.getElementById('show-more-container');

    if (!listContainer || !showMoreContainer) {
        this.isFetchingCompleted = false;
        return;
    }

    // Show a loading indicator
    showMoreContainer.innerHTML = `<p class="text-gray-400">Loading...</p>`;

    try {
        // Base query for completed requests, ordered by newest first
        let requestsQuery = query(
            collection(this.db, 'helpRequests'), 
            where("status", "==", "completed"), 
            orderBy("timestamp", "desc")
        );

        // If loading more, start the query *after* the last document we fetched
        if (loadMore && this.lastCompletedRequestDoc) {
            requestsQuery = query(requestsQuery, startAfter(this.lastCompletedRequestDoc));
        }

        // We always limit the results to 10 per fetch
        requestsQuery = query(requestsQuery, limit(10));

        const documentSnapshots = await getDocs(requestsQuery);

        // If this is the very first fetch and it's empty
        if (!loadMore && documentSnapshots.empty) {
            listContainer.innerHTML = `<p class="text-gray-500">No completed requests yet.</p>`;
            showMoreContainer.innerHTML = ''; // Clear loading indicator
            this.isFetchingCompleted = false;
            return;
        }

        // Clear the loading text before appending new items
        showMoreContainer.innerHTML = '';

        documentSnapshots.forEach(doc => {
            const request = doc.data();
            const requestId = doc.id;
            listContainer.appendChild(this.createRequestElement(request, requestId, false));
        });

        // Save the last document from this batch to use as the cursor for the next fetch
        this.lastCompletedRequestDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // If we received fewer than 10 documents, we've reached the end.
        // Otherwise, show the "Show More" button.
        if (documentSnapshots.docs.length < 10) {
            showMoreContainer.innerHTML = `<p class="text-gray-500">End of list.</p>`;
        } else {
            showMoreContainer.innerHTML = `
                <button onclick="app.fetchCompletedRequests(true)" class="btn btn-secondary">
                    Show More
                </button>`;
        }

    } catch (error) {
        console.error("Error fetching completed requests:", error);
        showMoreContainer.innerHTML = `<p class="text-red-500">Failed to load requests.</p>`;
    } finally {
        this.isFetchingCompleted = false;
    }
}

// script.js

// Modify the function signature to accept 'isLive'
createRequestElement(request, requestId, isLive) {
      const element = document.createElement('div');
      element.className = 'bg-gray-800 p-4 rounded-lg shadow-md';
      const date = request.timestamp?.toDate().toLocaleString() || 'N/A';
      const statusColors = { pending: 'text-yellow-400', ongoing: 'text-blue-400', completed: 'text-green-400' };
      
      // Conditionally create the action buttons
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
                <p class="font-bold">Name: ${request.firstName} ${request.lastName} </p>
                <p class="font-bold">Contact: <a href="tel:${request.contact}" class="text-red-500 hover:underline">${request.contact}</a></p>
                <p class="text-sm text-red-400 font-semibold">${request.emergencyType}</p>
                <p class="text-sm text-gray-300 mt-1">${request.additionalInfo || 'No additional details.'}</p><p class="text-xs text-gray-500 mt-2">Time: ${date}</p>
            </div>
            <div class="text-right">
                <p class="font-semibold ${statusColors[request.status] || ''}">${request.status.toUpperCase()}</p>
                 <a href="https://www.google.com/maps?q=${request.location.lat},${request.location.lng}" target="_blank" class="text-blue-400 text-xs hover:underline">View on Map</a>
            </div>
        </div>
        ${actionButtons}`; // Insert the action buttons here (will be empty for completed view)
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