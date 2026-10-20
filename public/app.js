"use strict";

const VERSION = "0.2";
const INCUBATION_MS = 10 * 60 * 1000;
const TOTAL_LIFE_MS = 120 * 60 * 1000;
const STAGES = [
  { name: "Recién nacido", durationMs: 10 * 60 * 1000, visual: "baby" },
  { name: "Bebé", durationMs: 20 * 60 * 1000, visual: "baby" },
  { name: "Adulto", durationMs: 60 * 60 * 1000, visual: "adult" },
  { name: "Viejo", durationMs: 30 * 60 * 1000, visual: "old" }
];
const SAVE_KEY = "tamagotchi-gongonia-v02";
const $ = (id) => document.getElementById(id);

let lifeInterval = null;
let loadInterval = null;
let session = null;
let selectedPet = "Gonguito";
let musicEnabled = false;
let audioContext = null;
let musicInterval = null;
let musicStep = 0;

const MUSIC_NOTES = [
  293.66, 369.99, 440.00, 554.37,
  493.88, 440.00, 369.99, 329.63,
  293.66, 369.99, 440.00, 493.88,
  440.00, 369.99, 329.63, 293.66
];

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
      startedAt: session.startedAt,
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
    if (!parsed || typeof parsed.startedAt !== "number" || !Number.isFinite(parsed.startedAt)) {
      return null;
    }
    return {
      startedAt: parsed.startedAt,
      ended: parsed.ended === true
    };
  } catch (error) {
    console.warn("No se pudo recuperar el estado guardado.", error);
    return null;
  }
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return totalMinutes + (totalMinutes === 1 ? " min" : " min");
  if (minutes === 0) return hours + " h";
  return hours + " h " + minutes + " min";
}

function formatAge(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return totalMinutes + " min";
  if (minutes === 0) return hours + " h";
  return hours + " h " + minutes + " min";
}

function getLifeElapsed(now = Date.now()) {
  if (!session) return 0;
  return Math.max(0, now - (session.startedAt + INCUBATION_MS));
}

function getStageIndex(lifeElapsed) {
  let cumulative = 0;
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].durationMs;
    if (lifeElapsed < cumulative || i === STAGES.length - 1) return i;
  }
  return STAGES.length - 1;
}

function startOrResumePet() {
  selectedPet = "Gonguito";
  const saved = loadSession();
  const now = Date.now();

  if (saved && (saved.ended || now - (saved.startedAt + INCUBATION_MS) >= TOTAL_LIFE_MS)) {
    session = { startedAt: saved.startedAt, ended: true };
    saveSession();
    showPetScreen();
    renderLife();
    startMusic();
    return;
  }

  if (saved) {
    session = saved;
  } else {
    // La incubación dura 10 minutos; después comienza una vida de 2 horas.
    session = { startedAt: now, ended: false };
    saveSession();
  }

  showPetScreen();
  renderLife();
  startLifeClock();
  startMusic();
}

function showPetScreen() {
  showScreen("pet-screen");
}

function renderIncubation(elapsedSinceStart) {
  $("living-scene").hidden = false;
  $("death-scene").hidden = true;
  $("incubation-visual").hidden = false;
  $("worm").hidden = true;
  $("age-value").textContent = "Incubando";
  $("stage-value").textContent = "Incubación";
  const percent = Math.min(100, (elapsedSinceStart / INCUBATION_MS) * 100);
  $("life-progress").style.width = percent + "%";
  $("timeline-left-label").textContent = "Incubación";
  $("remaining-label").textContent = "Nace en " + formatDuration(INCUBATION_MS - elapsedSinceStart);
  document.querySelectorAll(".stage-dot").forEach((dot) => dot.classList.remove("active"));
  $("scene-caption-text").textContent = "Un pequeño milagro está por nacer";
}

function renderLivingStage(lifeElapsed) {
  $("living-scene").hidden = false;
  $("death-scene").hidden = true;
  $("incubation-visual").hidden = true;
  $("worm").hidden = false;
  const stageIndex = getStageIndex(lifeElapsed);
  const stage = STAGES[stageIndex];

  $("age-value").textContent = formatAge(lifeElapsed);
  $("stage-value").textContent = stage.name;
  $("timeline-left-label").textContent = "Vida de Gonguito";
  $("life-progress").style.width = Math.min(100, (lifeElapsed / TOTAL_LIFE_MS) * 100) + "%";
  $("remaining-label").textContent = formatDuration(TOTAL_LIFE_MS - lifeElapsed) + " de vida";
  $("scene-caption-text").textContent = stage.visual === "baby"
    ? "Gonguito está creciendo"
    : stage.visual === "adult"
      ? "Gonguito explora el mundo"
      : "Gonguito disfruta de su vejez";

  $("worm").classList.remove("worm--baby", "worm--adult", "worm--old");
  $("worm").classList.add("worm--" + stage.visual);
  $("worm").setAttribute("aria-label",
    stage.visual === "baby" ? "Gonguito, gusanito bebé" :
    stage.visual === "old" ? "Gonguito, gusano viejo con lentes" :
    "Gonguito, gusano adulto");

  document.querySelectorAll(".stage-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index <= stageIndex);
  });
}

function renderLife() {
  if (!session) return;

  const now = Date.now();
  const elapsedSinceStart = Math.max(0, now - session.startedAt);
  const lifeElapsed = getLifeElapsed(now);
  const finished = session.ended || lifeElapsed >= TOTAL_LIFE_MS;

  if (finished) {
    if (!session.ended) {
      session.ended = true;
      saveSession();
      stopLifeClock();
    }
    $("living-scene").hidden = true;
    $("death-scene").hidden = false;
    $("age-value").textContent = "2 h";
    $("stage-value").textContent = "Ciclo completado";
    $("life-progress").style.width = "100%";
    $("timeline-left-label").textContent = "Ciclo vital";
    $("remaining-label").textContent = "Vida completada";
    document.querySelectorAll(".stage-dot").forEach((dot) => dot.classList.add("active"));
    return;
  }

  if (elapsedSinceStart < INCUBATION_MS) {
    renderIncubation(elapsedSinceStart);
  } else {
    renderLivingStage(lifeElapsed);
  }
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
  $("incubation-visual").hidden = true;
  $("worm").hidden = false;
  $("worm").classList.remove("worm--baby", "worm--adult", "worm--old");
  $("age-value").textContent = "Incubando";
  $("stage-value").textContent = "Incubación";
  $("life-progress").style.width = "0%";
  $("timeline-left-label").textContent = "Incubación";
  $("remaining-label").textContent = "Nace en 10 min";
  $("scene-caption-text").textContent = "Un pequeño milagro está por nacer";
  document.querySelectorAll(".stage-dot").forEach((dot) => dot.classList.remove("active"));
  showScreen("home-screen");
}

function handleGraveActivation(event) {
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  if (event.type === "keydown") event.preventDefault();
  if (session && session.ended) returnToHome();
}

/* Música original sencilla generada con Web Audio para evitar archivos externos. */
function playTone(frequency, startAt, duration, waveform, volume) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function scheduleMusicStep() {
  if (!audioContext || !musicEnabled) return;
  const now = audioContext.currentTime;
  const note = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
  playTone(note, now + 0.02, 0.42, "triangle", 0.055);

  if (musicStep % 4 === 0) {
    const bassNotes = [146.83, 164.81, 196.00, 130.81];
    playTone(bassNotes[Math.floor(musicStep / 4) % bassNotes.length], now + 0.02, 1.35, "sine", 0.045);
  }
  if (musicStep % 8 === 4) {
    playTone(note * 2, now + 0.05, 0.2, "sine", 0.018);
  }
  musicStep = (musicStep + 1) % MUSIC_NOTES.length;
}

function syncMusicButtons() {
  const label = musicEnabled ? "♫ Música: apagar" : "♫ Música: activar";
  ["music-toggle-home", "music-toggle-pet"].forEach((id) => {
    const button = $(id);
    if (!button) return;
    button.textContent = label;
    button.setAttribute("aria-pressed", musicEnabled ? "true" : "false");
  });
}

function startMusic() {
  if (musicEnabled) {
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    $("music-status").textContent = "La música no está disponible en este navegador.";
    return;
  }

  try {
    if (!audioContext) audioContext = new AudioContextClass();
    audioContext.resume();
    musicEnabled = true;
    musicStep = 0;
    scheduleMusicStep();
    musicInterval = window.setInterval(scheduleMusicStep, 600);
    $("music-status").textContent = "Melodía fantástica en bucle";
    syncMusicButtons();
  } catch (error) {
    console.warn("No se pudo iniciar la música.", error);
    musicEnabled = false;
    syncMusicButtons();
  }
}

function stopMusic() {
  musicEnabled = false;
  if (musicInterval !== null) {
    window.clearInterval(musicInterval);
    musicInterval = null;
  }
  if (audioContext && audioContext.state === "running") audioContext.suspend();
  $("music-status").textContent = "Música pausada";
  syncMusicButtons();
}

function toggleMusic() {
  if (musicEnabled) stopMusic();
  else startMusic();
}

$("pet-option").addEventListener("click", () => {
  selectedPet = "Gonguito";
  $("pet-option").setAttribute("aria-pressed", "true");
});

$("start-button").addEventListener("click", startOrResumePet);
$("music-toggle-home").addEventListener("click", toggleMusic);
$("music-toggle-pet").addEventListener("click", toggleMusic);
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
  if (!document.hidden && musicEnabled && audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
});

syncMusicButtons();
runLoadingScreen();
