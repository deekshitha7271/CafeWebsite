import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

let audioCtx = null;

export const playOrderSuccessSound = async () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const playNote = (freq, start, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur);
      osc.start(audioCtx.currentTime + start);
      osc.stop(audioCtx.currentTime + start + dur);
    };
    playNote(523.25, 0, 0.3);   // C5
    playNote(659.25, 0.15, 0.3); // E5
    playNote(783.99, 0.3, 0.5);  // G5
  } catch (e) { 
    console.warn('Audio playback failed:', e);
  }
};
