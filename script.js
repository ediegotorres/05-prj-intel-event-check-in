// Intel Sustainability Summit Check-In App
// Tracks attendance, team counts, progress to a goal, and stores data locally.

const ATTENDANCE_GOAL = 50;
const STORAGE_KEY = "intel-summit-check-in-state";

// Central app state so all UI updates come from one source of truth.
const state = {
  attendees: [],
  teamCounts: {
    water: 0,
    zero: 0,
    power: 0,
  },
};

// Team labels used for display in greetings, celebration text, and attendee list.
const teamLabels = {
  water: "Team Water Wise",
  zero: "Team Net Zero",
  power: "Team Renewables",
};

// Cache DOM references once for better readability and performance.
const form = document.getElementById("checkInForm");
const attendeeNameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");
const greeting = document.getElementById("greeting");
const celebration = document.getElementById("celebration");
const attendeeCountEl = document.getElementById("attendeeCount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const attendeeList = document.getElementById("attendeeList");
const attendeeListCount = document.getElementById("attendeeListCount");
const teamCountEls = {
  water: document.getElementById("waterCount"),
  zero: document.getElementById("zeroCount"),
  power: document.getElementById("powerCount"),
};
const teamCards = {
  water: document.querySelector('[data-team-card="water"]'),
  zero: document.querySelector('[data-team-card="zero"]'),
  power: document.querySelector('[data-team-card="power"]'),
};

// Read saved data (if present) so progress persists across page reloads.
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return;

    if (Array.isArray(parsed.attendees)) {
      state.attendees = parsed.attendees.filter(
        (entry) =>
          entry &&
          typeof entry.name === "string" &&
          ["water", "zero", "power"].includes(entry.team)
      );
    }

    // Recalculate team counts from attendee list to avoid drift/corruption.
    recalculateTeamCounts();
  } catch (error) {
    console.error("Failed to parse saved check-in data:", error);
  }
}

// Persist only the data needed to rebuild the UI.
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      attendees: state.attendees,
    })
  );
}

// Derive team counts from attendees to keep calculations consistent.
function recalculateTeamCounts() {
  state.teamCounts = { water: 0, zero: 0, power: 0 };

  state.attendees.forEach((attendee) => {
    state.teamCounts[attendee.team] += 1;
  });
}

// Show a personalized greeting after each successful check-in.
function showGreeting(name, team) {
  greeting.textContent = `Welcome, ${name}! You checked in with ${teamLabels[team]}.`;
  greeting.className = "success-message";
  greeting.style.display = "block";
}

// Update total count, team counts, and progress bar visuals.
function renderStats() {
  const total = state.attendees.length;
  const progressPercent = Math.min((total / ATTENDANCE_GOAL) * 100, 100);

  attendeeCountEl.textContent = String(total);
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `${Math.round(progressPercent)}% of attendance goal reached`;

  Object.keys(teamCountEls).forEach((team) => {
    teamCountEls[team].textContent = String(state.teamCounts[team]);
  });
}

// Determine the team(s) with the highest attendance count.
function getLeadingTeams() {
  const counts = Object.entries(state.teamCounts);
  const maxCount = Math.max(...counts.map(([, count]) => count));

  if (maxCount <= 0) return [];
  return counts.filter(([, count]) => count === maxCount).map(([team]) => team);
}

// Update optional celebration UI and highlight the leading team(s) once goal is met.
function renderCelebration() {
  const total = state.attendees.length;
  const leadingTeams = getLeadingTeams();

  Object.values(teamCards).forEach((card) => card.classList.remove("winner"));

  if (total < ATTENDANCE_GOAL || leadingTeams.length === 0) {
    celebration.style.display = "none";
    celebration.textContent = "";
    return;
  }

  leadingTeams.forEach((team) => teamCards[team].classList.add("winner"));

  if (leadingTeams.length === 1) {
    celebration.textContent = `Goal reached! ${teamLabels[leadingTeams[0]]} is currently winning the summit check-in challenge.`;
  } else {
    const tiedNames = leadingTeams.map((team) => teamLabels[team]).join(", ");
    celebration.textContent = `Goal reached! It's a tie between ${tiedNames}.`;
  }

  celebration.style.display = "block";
}

// Render the optional attendee list with newest check-ins shown first.
function renderAttendeeList() {
  attendeeList.innerHTML = "";
  attendeeListCount.textContent = `${state.attendees.length} ${
    state.attendees.length === 1 ? "entry" : "entries"
  }`;

  if (state.attendees.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "attendee-list-empty";
    emptyItem.textContent = "No attendees checked in yet.";
    attendeeList.appendChild(emptyItem);
    return;
  }

  [...state.attendees].reverse().forEach((attendee) => {
    const item = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "attendee-name";
    nameSpan.textContent = attendee.name;

    const teamSpan = document.createElement("span");
    teamSpan.className = "attendee-team";
    teamSpan.textContent = teamLabels[attendee.team];

    item.appendChild(nameSpan);
    item.appendChild(teamSpan);
    attendeeList.appendChild(item);
  });
}

// Keep rendering in one place to reduce missed updates and rubric regressions.
function renderAll() {
  renderStats();
  renderCelebration();
  renderAttendeeList();
}

// Normalize names so formatting looks consistent in the UI and saved data.
function formatName(rawName) {
  return rawName
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

// Handle check-ins, then update UI and save progress.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = formatName(attendeeNameInput.value);
  const team = teamSelect.value;

  if (!name || !teamLabels[team]) {
    greeting.textContent = "Please enter a name and choose a team.";
    greeting.className = "";
    greeting.style.display = "block";
    return;
  }

  state.attendees.push({ name, team });
  state.teamCounts[team] += 1;

  showGreeting(name, team);
  renderAll();
  saveState();

  form.reset();
  attendeeNameInput.focus();
});

// Initialize the app from local storage and render the current state.
loadState();
renderAll();
