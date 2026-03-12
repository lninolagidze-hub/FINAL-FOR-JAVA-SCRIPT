const API_BASE = "https://railway.stepprojects.ge/api/";

let selectedSeats = [];
let currentTrain = null;
let allTrains = [];
let allStations = [];
let trainMap = {}; // Store trains by ID for quick lookup
let numTickets = 1;
let currentTicket = null;
let calendarDate = new Date();

// Load data on page load
document.addEventListener("DOMContentLoaded", () => {
  loadStations();
  setupNavigation();
  setupCalendar();
  setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
  // Search trains
  document
    .getElementById("search-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const from = document.getElementById("from").value;
      const to = document.getElementById("to").value;
      const date = document.getElementById("date").value;
      numTickets = parseInt(document.getElementById("tickets").value);

      try {
        const response = await fetch(
          `${API_BASE}getdeparture?from=${from}&to=${to}&date=${date}`,
        );
        const departures = await response.json();
        displayTrains(departures);
        showSection("trains-section");
      } catch (error) {
        console.error("Error fetching departures:", error);
        alert("Error fetching departures. Please try again.");
      }
    });

  // Seat selection modal
  document.getElementById("select-seats-btn").addEventListener("click", () => {
    displayModalTrainDetails();
    displayModalSeats();
    document.getElementById("seat-modal").style.display = "block";
  });

  const closeBtn = document.querySelector(".close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("seat-modal").style.display = "none";
    });
  }

  document.getElementById("confirm-seats").addEventListener("click", () => {
    if (selectedSeats.length === numTickets) {
      document.getElementById("seat-modal").style.display = "none";
      updateInvoice();
      document.getElementById("invoice").style.display = "block";
    } else {
      alert(`Please select ${numTickets} seats.`);
    }
  });

  // Passenger form submit
  document.getElementById("passenger-form").addEventListener("submit", (e) => {
    e.preventDefault();
    showSection("payment-section");
  });

  // Payment form submit
  document
    .getElementById("payment-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const phone = document.getElementById("phone").value;

      const people = selectedSeats.map((seat, index) => {
        const name = document.querySelector(
          `[data-field="name"][data-index="${index}"]`,
        ).value;
        const surname = document.querySelector(
          `[data-field="surname"][data-index="${index}"]`,
        ).value;
        const idNumber = document.querySelector(
          `[data-field="idNumber"][data-index="${index}"]`,
        ).value;
        const status = document.querySelector(
          `[data-field="status"][data-index="${index}"]`,
        ).value;

        return {
          seatId: seat.seatId,
          name,
          surname,
          idNumber,
          status,
          payoutCompleted: false,
        };
      });

      const bookingData = {
        trainId: currentTrain.id,
        date: document.getElementById("date").value,
        email,
        phoneNumber: phone,
        people,
      };

      try {
        const response = await fetch(`${API_BASE}tickets/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        });
        const result = await response.json();
        currentTicket = result;
        displayTicketDetails(result);
        showSection("ticket-section");
      } catch (error) {
        console.error("Error booking ticket:", error);
        alert("Error booking ticket. Please try again.");
      }
    });

  // Download PDF
  document.getElementById("download-pdf").addEventListener("click", () => {
    alert("PDF download not implemented. Ticket details above.");
  });

  // Check ticket status
  document
    .getElementById("check-status")
    .addEventListener("click", async () => {
      const ticketId = document.getElementById("ticket-id").value;
      if (!ticketId) return alert("Please enter ticket ID");

      try {
        const response = await fetch(
          `${API_BASE}tickets/checkstatus/${ticketId}`,
        );
        const ticket = await response.json();
        displayTicketInfo(ticket);
      } catch (error) {
        console.error("Error checking status:", error);
        alert("Error checking ticket status.");
      }
    });

  // Cancel ticket
  document
    .getElementById("cancel-ticket")
    .addEventListener("click", async () => {
      const ticketId = document.getElementById("ticket-id").value;
      if (!ticketId) return alert("Please enter ticket ID");

      try {
        const response = await fetch(`${API_BASE}tickets/cancel/${ticketId}`, {
          method: "DELETE",
        });
        const ticket = await response.json();
        alert("Ticket canceled!");
        displayTicketInfo(ticket);
      } catch (error) {
        console.error("Error canceling ticket:", error);
        alert("Error canceling ticket.");
      }
    });
}

// Setup Calendar
function setupCalendar() {
  const dateInput = document.getElementById("date");
  const calendarModal = document.getElementById("calendar-modal");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const calendarDays = document.getElementById("calendar-days");

  dateInput.addEventListener("click", () => {
    calendarDate = new Date();
    renderCalendar();
    calendarModal.style.display = "flex";
  });

  prevBtn.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });

  nextBtn.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // Close calendar when clicking outside
  calendarModal.addEventListener("click", (e) => {
    if (e.target === calendarModal) {
      calendarModal.style.display = "none";
    }
  });
}

function renderCalendar() {
  const calendarTitle = document.getElementById("calendar-title");
  const calendarDays = document.getElementById("calendar-days");
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarTitle.textContent = new Date(year, month).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  calendarDays.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Previous month's days
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = daysInPrevMonth - i;
    calendarDays.appendChild(dayDiv);
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = day;

    const today = new Date();
    const thisDate = new Date(year, month, day);

    // Disable past dates
    if (thisDate < today) {
      dayDiv.classList.add("disabled");
    } else {
      dayDiv.addEventListener("click", () => {
        selectDate(thisDate);
      });
    }

    calendarDays.appendChild(dayDiv);
  }

  // Next month's days
  const totalCells = calendarDays.children.length;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day other-month";
    dayDiv.textContent = day;
    calendarDays.appendChild(dayDiv);
  }
}

function selectDate(date) {
  const dateInput = document.getElementById("date");
  const calendarModal = document.getElementById("calendar-modal");

  const formattedDate = date.toISOString().split("T")[0];
  dateInput.value = formattedDate;
  calendarModal.style.display = "none";
}

// Load stations
async function loadStations() {
  try {
    const response = await fetch(`${API_BASE}trains`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const trains = await response.json();
    allTrains = trains; // Store trains
    console.log("Trains loaded:", trains);
    // Extract unique stations from trains
    const stationsSet = new Set();
    trains.forEach((train) => {
      stationsSet.add(train.from);
      stationsSet.add(train.to);
    });
    allStations = Array.from(stationsSet).map((name) => ({ name }));
    console.log("Stations extracted:", allStations);
    populateStationSelects(allStations);
  } catch (error) {
    console.error("Error loading stations:", error);
    alert("Error loading stations. Please check console for details.");
  }
}

// Populate station selects
function populateStationSelects(stations) {
  const fromSelect = document.getElementById("from");
  const toSelect = document.getElementById("to");
  stations.forEach((station) => {
    const option1 = document.createElement("option");
    option1.value = station.name;
    option1.textContent = station.name;
    fromSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = station.name;
    option2.textContent = station.name;
    toSelect.appendChild(option2);
  });
}

// Load trains
// Trains are loaded in loadStations

// Setup navigation
function setupNavigation() {
  document
    .getElementById("home-btn")
    .addEventListener("click", showSection.bind(null, "search-section"));
  document
    .getElementById("check-ticket-btn")
    .addEventListener("click", showSection.bind(null, "check-section"));
}

// Show section
function showSection(sectionId) {
  document
    .querySelectorAll("section")
    .forEach((section) => (section.style.display = "none"));
  document.getElementById(sectionId).style.display = "block";
}

// Display trains
function displayTrains(departures) {
  const container = document.getElementById("trains-list");
  container.innerHTML = "";
  trainMap = {}; // Clear train map

  departures.forEach((departure) => {
    departure.trains.forEach((train) => {
      trainMap[train.id] = train; // Store full train object
      const trainDiv = document.createElement("div");
      trainDiv.className = "train";
      trainDiv.innerHTML = `
                <h4>Train ${train.name} (${train.number}) - ${train.from} to ${train.to}</h4>
                <p>Departure: ${train.departure}, Arrival: ${train.arrive}</p>
                <button onclick="selectTrain(${train.id})">Book</button>
            `;
      container.appendChild(trainDiv);
    });
  });
}

// Select train
function selectTrain(trainId) {
  if (!trainMap[trainId]) {
    alert("Train not found. Please search again.");
    return;
  }
  currentTrain = trainMap[trainId]; // Get stored train object
  selectedSeats = [];
  showSection("passenger-section");
  generatePassengerForms();
}

// Generate passenger forms
function generatePassengerForms() {
  const container = document.getElementById("passengers");
  container.innerHTML = "";

  for (let i = 0; i < numTickets; i++) {
    const passDiv = document.createElement("div");
    passDiv.className = "passenger";
    passDiv.innerHTML = `
            <h4>Passenger ${i + 1}</h4>
            <input type="text" placeholder="First Name" data-field="name" data-index="${i}" required>
            <input type="text" placeholder="Last Name" data-field="surname" data-index="${i}" required>
            <input type="text" placeholder="ID Number" data-field="idNumber" data-index="${i}" required>
            <select data-field="status" data-index="${i}" required>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="student">Student</option>
            </select>
        `;
    container.appendChild(passDiv);
  }
}

// Display modal train details
function displayModalTrainDetails() {
  const container = document.getElementById("modal-train-details");
  container.innerHTML = `
        <h4>Train ${currentTrain.name} (${currentTrain.number})</h4>
        <p>From: ${currentTrain.from} To: ${currentTrain.to}</p>
        <p>Departure: ${currentTrain.departure} Arrival: ${currentTrain.arrive}</p>
    `;
}

// Display modal seats
function displayModalSeats() {
  const container = document.getElementById("modal-seat-selection");
  container.innerHTML = "";

  currentTrain.vagons.forEach((vagon) => {
    const vagonDiv = document.createElement("div");
    vagonDiv.className = "vagon";
    vagonDiv.innerHTML = `<h4>Vagon ${vagon.name}</h4>`;

    const seatsDiv = document.createElement("div");
    seatsDiv.className = "seats";

    vagon.seats.forEach((seat) => {
      const seatDiv = document.createElement("div");
      seatDiv.className = `seat ${seat.isOccupied ? "occupied" : "available"}`;
      seatDiv.textContent = seat.number;
      seatDiv.dataset.seatId = seat.seatId;
      seatDiv.dataset.price = seat.price;
      if (!seat.isOccupied) {
        seatDiv.addEventListener("click", () =>
          toggleSeatSelection(seatDiv, seat),
        );
      }
      seatsDiv.appendChild(seatDiv);
    });

    vagonDiv.appendChild(seatsDiv);
    container.appendChild(vagonDiv);
  });
}

// Toggle seat selection
function toggleSeatSelection(seatDiv, seat) {
  if (seatDiv.classList.contains("selected")) {
    seatDiv.classList.remove("selected");
    selectedSeats = selectedSeats.filter((s) => s.seatId !== seat.seatId);
  } else if (selectedSeats.length < numTickets) {
    seatDiv.classList.add("selected");
    selectedSeats.push(seat);
  } else {
    alert(`You can only select ${numTickets} seats.`);
  }
}

// Update invoice
function updateInvoice() {
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  document.getElementById("total-price").textContent = totalPrice;
}

// Register ticket
document.getElementById("passenger-form").addEventListener("submit", (e) => {
  e.preventDefault();
  showSection("payment-section");
});

// Payment
document
  .getElementById("payment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    // Simulate payment
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    const people = selectedSeats.map((seat, index) => {
      const name = document.querySelector(
        `[data-field="name"][data-index="${index}"]`,
      ).value;
      const surname = document.querySelector(
        `[data-field="surname"][data-index="${index}"]`,
      ).value;
      const idNumber = document.querySelector(
        `[data-field="idNumber"][data-index="${index}"]`,
      ).value;
      const status = document.querySelector(
        `[data-field="status"][data-index="${index}"]`,
      ).value;

      return {
        seatId: seat.seatId,
        name,
        surname,
        idNumber,
        status,
        payoutCompleted: false,
      };
    });

    const bookingData = {
      trainId: currentTrain.id,
      date: document.getElementById("date").value,
      email,
      phoneNumber: phone,
      people,
    };

    try {
      const response = await fetch(`${API_BASE}tickets/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });
      const result = await response.json();
      currentTicket = result;
      displayTicketDetails(result);
      showSection("ticket-section");
    } catch (error) {
      console.error("Error booking ticket:", error);
      alert("Error booking ticket. Please try again.");
    }
  });

// Display ticket details
function displayTicketDetails(ticket) {
  const container = document.getElementById("ticket-details");
  container.innerHTML = `
        <h3>Ticket #${ticket.id}</h3>
        <p>Email: ${ticket.email}</p>
        <p>Phone: ${ticket.phone}</p>
        <p>Date: ${ticket.date}</p>
        <p>Price: ${ticket.ticketPrice} GEL</p>
        <p>Status: ${ticket.confirmed ? "Confirmed" : "Pending"}</p>
        <h4>Passengers:</h4>
        <ul>
            ${ticket.persons.map((p) => `<li>${p.name} ${p.surname} - Seat ${p.seat.number}</li>`).join("")}
        </ul>
    `;
}

// Download PDF (placeholder)
document.getElementById("download-pdf").addEventListener("click", () => {
  alert("PDF download not implemented. Ticket details above.");
});

// Check ticket status
document.getElementById("check-status").addEventListener("click", async () => {
  const ticketId = document.getElementById("ticket-id").value;
  if (!ticketId) return alert("Please enter ticket ID");

  try {
    const response = await fetch(`${API_BASE}tickets/checkstatus/${ticketId}`);
    const ticket = await response.json();
    displayTicketInfo(ticket);
  } catch (error) {
    console.error("Error checking status:", error);
    alert("Error checking ticket status.");
  }
});

// Cancel ticket
document.getElementById("cancel-ticket").addEventListener("click", async () => {
  const ticketId = document.getElementById("ticket-id").value;
  if (!ticketId) return alert("Please enter ticket ID");

  try {
    const response = await fetch(`${API_BASE}tickets/cancel/${ticketId}`, {
      method: "DELETE",
    });
    const ticket = await response.json();
    alert("Ticket canceled!");
    displayTicketInfo(ticket);
  } catch (error) {
    console.error("Error canceling ticket:", error);
    alert("Error canceling ticket.");
  }
});

// Display ticket info
function displayTicketInfo(ticket) {
  const container = document.getElementById("ticket-info");
  container.innerHTML = `
        <h3>Ticket Details</h3>
        <p>ID: ${ticket.id}</p>
        <p>Email: ${ticket.email}</p>
        <p>Phone: ${ticket.phone}</p>
        <p>Date: ${ticket.date}</p>
        <p>Price: ${ticket.ticketPrice}</p>
        <p>Confirmed: ${ticket.confirmed ? "Yes" : "No"}</p>
        <h4>Passengers:</h4>
        <ul>
            ${ticket.persons.map((p) => `<li>${p.name} ${p.surname} - Seat ${p.seat.number}</li>`).join("")}
        </ul>
    `;
}


function updateClock() {
  const clock = document.getElementById('header-clock');
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  clock.textContent = `${hours}:${minutes}:${seconds}`;
}

// update every second
setInterval(updateClock, 1000);
updateClock(); // initial call