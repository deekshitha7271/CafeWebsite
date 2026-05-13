import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines tailwind classes safely.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Optimized Cloudinary transformations
 */
export const getOptimizedCloudinaryUrl = (url, { width, quality = 'auto', format = 'auto' } = {}) => {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('cloudinary.com')) return url;

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  const transformations = [];
  if (format) transformations.push(`f_${format}`);
  if (quality) transformations.push(`q_${quality}`);
  if (width) transformations.push(`w_${width}`);

  const transformationStr = transformations.join(',');
  return `${parts[0]}/upload/${transformationStr}/${parts[1]}`;
};

/**
 * Formats a given image URL to ensure it is valid and points to the correct location.
 * Handles relative paths, Cloudinary patterns, and missing protocols.
 */
export const formatImageUrl = (url, width) => {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // Handle Cloudinary specifically
  if (trimmedUrl.includes('cloudinary.com')) {
    return getOptimizedCloudinaryUrl(trimmedUrl, { width });
  }

  // 1. If it's already an absolute URL, return it
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:')) {
    return trimmedUrl;
  }

  // 2. If it's a relative path starting with /, assume it's from the public folder
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  // 3. If it's a relative path without /, add it
  return `/${trimmedUrl}`;
};

/**
 * Returns a high-quality fallback image based on the item type.
 */
export const getFallbackImage = (type = 'coffee') => {
  const fallbacks = {
    coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop',
    food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
    dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop'
  };
  return fallbacks[type] || fallbacks.coffee;
};

/**
 * Plays a premium success chime using synthesized Web Audio API.
 * This is browser-safe and doesn't require external assets.
 */
export const playOrderSuccessSound = async () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const playNote = (freq, start, dur, vol = 0.1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    const now = ctx.currentTime;
    // Harmonic Arpeggio (C Major)
    playNote(523.25, now, 0.5); // C5
    playNote(659.25, now + 0.12, 0.5); // E5
    playNote(783.99, now + 0.24, 0.5); // G5
    playNote(1046.50, now + 0.36, 0.8, 0.15); // C6 (Slightly louder finale)
  } catch (e) {
    console.warn('Success sound could not play:', e);
  }
};

/**
 * Plays a subtle notification sound for general UI feedback.
 */
export const playNotificationSound = async () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) { }
};
