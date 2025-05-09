import { firebaseConfig, CLOUD_NAME, UPLOAD_PRESET } from "./config.js";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

const SERVER_URL = 'http://localhost:3000/api';

// Utility Functions
function showToast(message, isSuccess = true) {
    const toast = document.getElementById("toast");
    const toastIcon = document.querySelector(".toast-icon");
    const toastMessage = document.querySelector(".toast-message");

    toastIcon.className = isSuccess ? "fas fa-check-circle toast-icon success" : "fas fa-times-circle toast-icon error";
    toastMessage.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3000);
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function extractStudentDetails(email) {
    if (!email.endsWith('@rvu.edu.in')) return null;

    const emailPrefix = email.split('@')[0];
    const namePart = emailPrefix.replace(/[0-9]+$/, '').replace('.', ' '); 
    const regNoMatch = emailPrefix.match(/[0-9]{2}[A-Z]{3}[0-9]{4}$/);

    const regNo = regNoMatch ? regNoMatch[0] : ''; 
    return { name: namePart, regNo: regNo };
}

// Fetch events from backend
async function fetchEvents() {
    try {
        const response = await fetch(`${SERVER_URL}/events`);
        const events = await response.json();
        displayEvents(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        showToast("Error loading events", false);
    }
}

// Display events on the page
function displayEvents(events) {
    const eventsContainer = document.getElementById("eventsContainer");
    eventsContainer.innerHTML = '';

    if (!events || events.length === 0) {
        eventsContainer.innerHTML = '<p>No events available.</p>';
        return;
    }

    const currentUser = auth.currentUser;
    events.forEach(event => {
        // Calculate seats left (if you want to fetch registrations, you can do so here)
        let seatsLeft = event.capacity;
        let isRegistered = false;

        // Optionally, fetch registrations for this event to update seatsLeft and isRegistered
        // For simplicity, we just show capacity as seats left

        let buttonsHTML = '';
        if (currentUser) {
            // Only allow registration if not already registered and seats left
            buttonsHTML = seatsLeft > 0
                ? `<button class="btn btn-primary register-btn" data-id="${event.id}">Register</button>`
                : `<button class="btn btn-outline full-btn" disabled>No Seats Left</button>`;
        } else {
            buttonsHTML = `<button class="btn btn-primary register-btn" data-id="${event.id}">Register</button>`;
        }

        // Add delete button for all users (or restrict to admins/organizers if needed)
        let deleteBtnHTML = `<button class="btn btn-danger delete-event-btn" data-id="${event.id}">Delete</button>`;

        const eventHTML = `
            <div class="event-card" data-event-id="${event.id}">
                <div class="event-image">
                    <img src="${event.image}" alt="${event.title}">
                </div>
                <div class="event-details">
                    <h3>${event.title}</h3>
                    <p>${event.description}</p>
                    <span>📍 ${event.venue}</span>
                    <div class="event-timings">
                        <p>🗓 ${event.startDate} - ${event.endDate}</p>
                        <p>⏰ ${event.startTime} - ${event.endTime}</p>
                    </div>
                    <p>Organized by: ${event.organizerName}</p>
                    <p class="seats-left">🪑 Seats Left: <strong>${seatsLeft}</strong></p>
                    <div class="event-actions">
                        ${buttonsHTML}
                        ${deleteBtnHTML}
                    </div>
                </div>
            </div>`;
        eventsContainer.innerHTML += eventHTML;
    });

    // Attach delete event listeners
    document.querySelectorAll('.delete-event-btn').forEach(btn => {
        btn.onclick = async function() {
            const eventId = btn.getAttribute('data-id') || btn.closest('.event-card').getAttribute('data-event-id');
            console.log('Frontend: Deleting event with id:', eventId); // Debug log
            if (confirm('Are you sure you want to delete this event?')) {
                try {
                    const res = await fetch(`${SERVER_URL}/events/${eventId}`, { method: 'DELETE' });
                    if (res.ok) {
                        btn.closest('.event-card').remove();
                        showToast('Event deleted.');
                    } else {
                        showToast('Failed to delete event.', false);
                    }
                } catch (e) {
                    showToast('Error deleting event.', false);
                }
            }
        };
    });
}

// Handle User Authentication
auth.onAuthStateChanged(async (user) => {
    const authButton = document.getElementById("authButton");
    if (user) {
        const email = user.email;
        if (!email.endsWith('@rvu.edu.in')) {
            auth.signOut();
            showToast("Only RVU students can sign in!", false);
            return;
        }
        const { name } = extractStudentDetails(email);
        authButton.textContent = "Sign Out";
        showToast(`Welcome, ${name}!`);
    } else {
        authButton.textContent = "Sign In";
    }
});

// Load events on page load
document.addEventListener("DOMContentLoaded", function () {
    fetchEvents();

    // Attach sign in/out logic here
    const authButton = document.getElementById("authButton");
    if (authButton) {
        authButton.addEventListener("click", () => {
            if (auth.currentUser) {
                auth.signOut().then(() => showToast("Signed out successfully!"));
            } else {
                auth.signInWithPopup(provider).catch((error) => showToast("Error signing in: " + error.message, false));
            }
        });
    }

    // Attach Create Event button logic
    const createEventBtn = document.getElementById("createEventBtn");
    if (createEventBtn) {
        createEventBtn.addEventListener("click", function () {
            openModal("createEventModal");
        });
    }

    // Attach close event listeners to all close buttons
    document.querySelectorAll(".close-modal").forEach(button => {
        button.addEventListener("click", function () {
            const modal = this.closest(".modal");
            if (modal) {
                modal.style.display = "none";
                document.body.style.overflow = "auto";
            }
        });
    });
});

// Event creation (Cloudinary upload + backend API)
document.getElementById("createEventForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitButton = this.querySelector('button[type="submit"]');
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner"></span> Creating Event...';

        if (!auth.currentUser) {
            showToast("Please sign in to create events", false);
            submitButton.disabled = false;
            submitButton.textContent = "Create Event";
            return;
        }

        // Extract form values
        const title = document.getElementById("eventTitle").value;
        const category = document.getElementById("eventCategory").value;
        const organizerName = document.getElementById("organizerName").value;
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;
        const startTime = document.getElementById("startTime").value;
        const endTime = document.getElementById("endTime").value;
        const venue = document.getElementById("eventVenue").value;
        const description = document.getElementById("eventDescription").value;
        const capacity = Number(document.getElementById("eventCapacity").value);
        const imageFile = document.getElementById("eventImage").files[0];

        // Validation
        if (!title || !category || !organizerName || !startDate || !endDate || !startTime || !endTime || !venue || !description || !capacity) {
            showToast("Please fill all event details!", false);
            submitButton.disabled = false;
            submitButton.textContent = "Create Event";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showToast("End date must be after start date!", false);
            submitButton.disabled = false;
            submitButton.textContent = "Create Event";
            return;
        }
        if (!imageFile) {
            showToast("Please upload an event image", false);
            submitButton.disabled = false;
            submitButton.textContent = "Create Event";
            return;
        }

        // Date formatting
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        };

        // Upload image to Cloudinary
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', UPLOAD_PRESET);

        // Cloudinary API does NOT require 'cloud_name' in the formData, only in the URL!
        // Remove: formData.append('cloud_name', CLOUD_NAME);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Cloudinary upload error:", errorText);
            showToast("Image upload failed: " + errorText, false);
            submitButton.disabled = false;
            submitButton.textContent = "Create Event";
            return;
        }
        const imageData = await response.json();

        // Send event data to backend
        const eventData = {
            title,
            category,
            organizerName,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            startTime,
            endTime,
            venue,
            description,
            capacity,
            image: imageData.secure_url
        };

        const createEventResponse = await fetch(`${SERVER_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });

        if (createEventResponse.ok) {
            showToast("Event created successfully!");
            this.reset();
            closeModal("createEventModal");
            fetchEvents();
        } else {
            const errorText = await createEventResponse.text();
            showToast("Backend error: " + errorText, false);
            console.error("Backend error:", errorText);
            alert("Backend error:\n" + errorText); // This will show the backend error in a popup for you to read
        }
    } catch (error) {
        console.error('Error creating event:', error);
        showToast("Error creating event: " + error.message, false);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create Event";
    }
});

// Firebase references
const db = firebase.firestore();
const storage = firebase.storage();

// Handle event registration
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("register-btn")) {
        if (!auth.currentUser) {
            showToast("Please sign in to register!", false);
            return;
        }
        const eventId = event.target.getAttribute("data-id");
        registerForEvent(eventId);
    }
});

// Register user for event (backend API)
async function registerForEvent(eventId) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showToast("Please sign in to register!", false);
        return;
    }
    const details = extractStudentDetails(currentUser.email);
    if (!details) {
        showToast("Invalid student email.", false);
        return;
    }
    const { name } = details;
    const email = currentUser.email;

    try {
        const response = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, name, email })
        });

        if (response.ok) {
            showToast("Successfully registered!");
            updateRegisterButton(eventId);
        } else {
            const error = await response.text();
            showToast("Error registering: " + error, false);
        }
    } catch (error) {
        console.error('Error registering for event:', error);
        showToast("Error registering: " + error.message, false);
    }
}

// Update "Register" button after successful registration
function updateRegisterButton(eventId) {
    const button = document.querySelector(`.register-btn[data-id="${eventId}"]`);
    if (button) {
        button.textContent = "Registered";
        button.disabled = true;
        button.classList.remove("btn-primary");
        button.classList.add("btn-outline");
    }
}

// Render events with delete button
function renderEvents(events) {
    const eventsContainer = document.getElementById('eventsContainer');
    eventsContainer.innerHTML = '';
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.setAttribute('data-event-id', event.id);

        card.innerHTML = `
            <img src="${event.imageUrl}" alt="${event.title}" class="event-image">
            <h3><span class="event-title">${event.title}</span></h3>
            <p>${event.description}</p>
            <div><i class="fas fa-map-marker-alt"></i> ${event.venue}</div>
            <div>
                <span><i class="far fa-calendar-alt"></i> ${event.startDate} - ${event.endDate}</span><br>
                <span><i class="far fa-clock"></i> ${event.startTime} - ${event.endTime}</span>
            </div>
            <div>Organized by: ${event.organizerName}</div>
            <div><b>Seats Left: ${event.capacity}</b></div>
            <button class="btn btn-danger delete-event-btn">Delete</button>
            <button class="btn btn-primary">Register</button>
        `;
        eventsContainer.appendChild(card);
    });
    if (typeof addDeleteEventListeners === 'function') {
        addDeleteEventListeners();
    }
}
