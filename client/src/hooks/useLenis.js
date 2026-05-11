import { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';

/**
 * Initialises Lenis smooth-scroll via the npm package (already installed).
 * Identical config to the inline <script> that was in index.html, so the
 * scroll feel is completely unchanged — just non-blocking.
 */
export const useLenis = () => {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 2.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smoothTouch: false, // better perf on mobile; visually identical
            touchMultiplier: 2,
        });

        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            cancelAnimationFrame(rafId);
        };
    }, []);
};
