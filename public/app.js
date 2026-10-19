"use strict";

const VERSION = "0.1";
const TOTAL_LIFE_MS = 180 * 60 * 1000;
const STAGES = [
  { name: "Recién nacido", fraction: 4 / 90 },
  { name: "Bebé", fraction: 5 / 90 },
  { name: "Niño", fraction: 9 / 90 },
  { name: "Adolescente", fraction: 9 / 90 },
  { name: "Adulto joven", fraction: 25 / 90 },
  { name: "Adulto mayor", fraction: 20 / 90 },
  { name: "Viejo", fraction: 13 / 90 },
  { name: "Anciano", fraction: 5 / 90 }
];
const SAVE_KEY = "tamagotchi-gongonia-v01";
const $ = (id) => document.getElementById(id);

let lifeInterval = null;
let loadInterval = null;
let session = null;
let selectedPet = "Gonguito";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === id);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function runLoadingScreen() {
  const fill = $("loading-progress");
  const percent = $("loading-percent");
  const track = document.querySelector(".loading-screen .progress-track");
  let value = 0;
  track.setAttribute("aria-valuenow", "0");
  loadInterval = window.setInterval(() => {
    value = Math.min(100, value + Math.floor(Math.random() * 13) + 5);
    fill.style.width = value + "%";
    percent.textContent = value + "%";
    track.setAttribute("aria-valuenow", String(value));
    if (value >= 100) {
      window.clearInterval(loadInterval);
      window.setTimeout(() => showScreen("home-screen"), 350);
    }
  }, 110);
}

function saveSession() {
  if (!session) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      pet: selectedPet,
      bornAt: session.bornAt,
      ended: session.ended
    }));
  } catch (error) {
    console.warn("No se pudo guardar el estado de Gonguito.", error);
  }
}

function loadSession() {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed.bornAt !== "number" || !Number.isFinite(parsed.bornAt)) {
      return null;
    }
    return {
      bornAt: parsed.bornAt,
      ended: parsed.ended === true
    };
  } catch (error) {
    console.warn("No se pudo recuperar el estado guardado.", error);
    return null;
  }
}

function startOrResumePet() {
  selectedPet = "Gonguito";
  const saved = loadSession();
  const now = Date.now();

  if (saved && (saved.ended || now - saved.bornAt >= TOTAL_LIFE_MS)) {
    session = { bornAt: saved.bornAt, ended: true };
    saveSession();
    showPetScreen();
    renderLife();
    return;
  }

  if (saved) {
    session = saved;
  } else {
    // En esta v0.1, el ciclo de vida empieza al pulsar Comenzar.
    // Las seis horas de incubación relativas al ciclo definitivo no se simulan aquí.
    session = { bornAt: now, ended: false };
    saveSession();
  }
  showPetScreen();
  renderLife();
  startLifeClock();
}

function showPetScreen() {
  showScreen("pet-screen");
}

function getElapsedMs() {
  if (!session) return 0;
  return Math.max(0, Date.now() - session.bornAt);
}

function getStageIndex(elapsedMs) {
  let cumulative = 0;
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].fraction * TOTAL_LIFE_MS;
    if (elapsedMs < cumulative || i === STAGES.length - 1) return i;
  }
  return STAGES.length - 1;
}

function formatAge(elapsedMs) {
  const minutes = Math.min(180, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  if (hours === 0) return minutes + (minutes === 1 ? " min" : " min");
  if (leftoverMinutes === 0) return hours + (hours === 1 ? " h" : " h");
  return hours + " h " + leftoverMinutes + " min";
}

function renderLife() {
  if (!session) return;
  const elapsed = getElapsedMs();
  const finished = session.ended || elapsed >= TOTAL_LIFE_MS;

  if (finished && !session.ended) {
    session.ended = true;
    saveSession();
    stopLifeClock();
  }

  if (finished) {
    $("living-scene").hidden = true;
    $("death-scene").hidden = false;
    $("age-value").textContent = "3 h";
    $("stage-value").textContent = "Ciclo completado";
    $("life-progress").style.width = "100%";
    $("remaining-label").textContent = "Vida completada";
    document.querySelectorAll(".stage-dot").forEach((dot) => dot.classList.add("active"));
    return;
  }

  $("living-scene").hidden = false;
  $("death-scene").hidden = true;
  $("age-value").textContent = formatAge(elapsed);
  const stageIndex = getStageIndex(elapsed);
  $("stage-value").textContent = STAGES[stageIndex].name;
  const percent = Math.min(100, (elapsed / TOTAL_LIFE_MS) * 100);
  $("life-progress").style.width = percent + "%";

  const remainingMs = Math.max(0, TOTAL_LIFE_MS - elapsed);
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  $("remaining-label").textContent = remainingMinutes + " min de vida";
  document.querySelectorAll(".stage-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index <= stageIndex);
  });
}

function startLifeClock() {
  stopLifeClock();
  lifeInterval = window.setInterval(renderLife, 1000);
}

function stopLifeClock() {
  if (lifeInterval !== null) {
    window.clearInterval(lifeInterval);
    lifeInterval = null;
  }
}

function returnToHome() {
  stopLifeClock();
  session = null;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar la partida.", error);
  }
  $("living-scene").hidden = false;
  $("death-scene").hidden = true;
  $("age-value").textContent = "0 h";
  $("stage-value").textContent = "Recién nacido";
  $("life-progress").style.width = "0%";
  $("remaining-label").textContent = "180 min de vida";
  document.querySelectorAll(".stage-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === 0);
  });
  showScreen("home-screen");
}

function handleGraveActivation(event) {
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  if (event.type === "keydown") event.preventDefault();
  if (session && session.ended) returnToHome();
}

$("pet-option").addEventListener("click", () => {
  selectedPet = "Gonguito";
  $("pet-option").setAttribute("aria-pressed", "true");
});

$("start-button").addEventListener("click", startOrResumePet);
$("back-home-button").addEventListener("click", returnToHome);
$("return-home-button").addEventListener("click", (event) => {
  event.stopPropagation();
  returnToHome();
});
$("death-scene").addEventListener("click", handleGraveActivation);
$("death-scene").addEventListener("keydown", handleGraveActivation);

$("credits-button").addEventListener("click", () => {
  $("credits-panel").hidden = false;
  $("close-credits").focus();
});
$("close-credits").addEventListener("click", () => {
  $("credits-panel").hidden = true;
  $("credits-button").focus();
});
$("credits-panel").addEventListener("click", (event) => {
  if (event.target === $("credits-panel")) {
    $("credits-panel").hidden = true;
    $("credits-button").focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("credits-panel").hidden) {
    $("credits-panel").hidden = true;
    $("credits-button").focus();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && session && !session.ended) renderLife();
});

runLoadingScreen();
