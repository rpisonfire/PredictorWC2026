"use client";

// Swoosh - krótki dźwięk syntetyzowany Web Audio API (bez plików).
// Biały szum + filter sweep od 3kHz do 200Hz w 220ms = klasyczny swoosh.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch { return null; }
  }
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("wcp_sound_enabled") !== "0"; // domyślnie ON
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wcp_sound_enabled", on ? "1" : "0");
}

export function playSwoosh() {
  if (!isSoundEnabled()) return;
  const audio = getCtx();
  if (!audio) return;
  try {
    // Wznów AudioContext jeśli suspended (mobile Safari itd.)
    if (audio.state === "suspended") audio.resume();

    const now = audio.currentTime;
    const duration = 0.22;

    // Generuj bufor białego szumu
    const bufferSize = Math.floor(audio.sampleRate * duration);
    const noiseBuffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noise = audio.createBufferSource();
    noise.buffer = noiseBuffer;

    // Lowpass filter sweep 3kHz -> 200Hz
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 4;
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    // Envelope: attack 20ms, decay reszta
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch {
    // fail silently
  }
}
