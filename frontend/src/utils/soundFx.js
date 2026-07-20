// utils/soundFx.js

let audioContext = null;
const lastPlayed = new Map();
const activeOscillators = new Set();
const MAX_SIMULTANEOUS_OSCILLATORS = 10;

// Estructura de notas: [freqInicial, delay, duracion, tipoOnda, volumen, freqFinal (opcional)]
const SOUNDS = {
  // --- Sonidos originales ---
  select:   { cooldown: 80,   notes: [[660, 0, 0.07, 'sine', 0.06]] },
  confirm:  { cooldown: 500,  notes: [[523, 0, 0.1, 'triangle', 0.07], [659, 0.08, 0.14, 'triangle', 0.07]] },
  newOrder: { cooldown: 1200, notes: [[660, 0, 0.15, 'sine', 0.1], [880, 0.18, 0.2, 'sine', 0.1]] },
  ready:    { cooldown: 1600, notes: [[880, 0, 0.12, 'sine', 0.1], [1047, 0.16, 0.2, 'sine', 0.1]] },
  canceled: { cooldown: 800,  notes: [[420, 0, 0.16, 'sawtooth', 0.05]] },
  call:     { cooldown: 1200, notes: [[740, 0, 0.12, 'sine', 0.08], [740, 0.2, 0.12, 'sine', 0.08]] },
  error:    { cooldown: 700,  notes: [[280, 0, 0.14, 'sine', 0.06]] },

  // --- Sonidos integrados del compañero (UI Actions) ---
  pop:      { cooldown: 100,  notes: [[450, 0, 0.05, 'sine', 0.15, 800]] },  // Sube a 800Hz
  add:      { cooldown: 150,  notes: [[520, 0, 0.08, 'triangle', 0.2, 1040]] }, // Sube a 1040Hz
  remove:   { cooldown: 150,  notes: [[600, 0, 0.08, 'sine', 0.2, 300]] },   // Baja a 300Hz
  bell:     { cooldown: 400,  notes: [[880, 0, 0.35, 'sine', 0.25]] },

  // --- Fusión de 'success' (Arpegio ascendente de 4 notas) ---
  success:  { cooldown: 800,  notes: [
    [523.25, 0.00, 0.25, 'sine', 0.15],
    [659.25, 0.06, 0.25, 'sine', 0.15],
    [783.99, 0.12, 0.25, 'sine', 0.15],
    [1046.50, 0.18, 0.25, 'sine', 0.15]
  ]}
};

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone(audio, freqStart, start, duration, type, volume, freqEnd) {
  if (activeOscillators.size >= MAX_SIMULTANEOUS_OSCILLATORS) return;
  
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  
  activeOscillators.add(oscillator);
  oscillator.type = type;
  
  // Configurar la frecuencia inicial
  oscillator.frequency.setValueAtTime(freqStart, start);
  
  // Si existe una frecuencia final, aplicar el pitch bend (deslizamiento)
  if (freqEnd) {
    oscillator.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
  }
  
  // Configurar el volumen
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  
  oscillator.connect(gain);
  gain.connect(audio.destination);
  
  oscillator.onended = () => activeOscillators.delete(oscillator);
  
  oscillator.start(start);
  oscillator.stop(start + duration);
}

// Exportación funcional original
export function playSound(kind) {
  try {
    const sound = SOUNDS[kind] ?? SOUNDS.error;
    const nowMs = Date.now();
    
    if (nowMs - (lastPlayed.get(kind) ?? 0) < sound.cooldown) return;
    lastPlayed.set(kind, nowMs);

    const audio = getContext();
    if (!audio) return;
    
    const now = audio.currentTime;
    
    sound.notes.forEach(([freqStart, delay, duration, type, volume, freqEnd]) => {
      playTone(audio, freqStart, now + delay, duration, type, volume, freqEnd);
    });
  } catch (err) {
    // El audio es progresivo: no debe bloquear operaciones del POS.
    console.warn('Audio no disponible:', err);
  }
}

// Exportación como objeto para mantener compatibilidad con el SoundManager de tu compañero
export const soundFx = {
  play: playSound
};