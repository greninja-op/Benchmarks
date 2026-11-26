import { useEffect, useRef } from 'react';

export default function useScrollProgress() {
  const progressRef = useRef(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (!wrapRef.current) return;
      const el = wrapRef.current;
      const max = el.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), max);
      const target = max > 0 ? y / max : 0;
      // smooth in rAF
      cancelAnimationFrame(raf);
      const tick = () => {
        progressRef.current += (target - progressRef.current) * 0.12;
        if (Math.abs(target - progressRef.current) < 0.0005) progressRef.current = target;
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // direct sync per frame for scrub fidelity
  useEffect(() => {
    const id = setInterval(() => {
      if (!wrapRef.current) return;
      const el = wrapRef.current;
      const max = el.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), max);
      const target = max > 0 ? y / max : 0;
      progressRef.current += (target - progressRef.current) * 0.18;
    }, 16);
    return () => clearInterval(id);
  }, []);

  return { progressRef, wrapRef };
}
