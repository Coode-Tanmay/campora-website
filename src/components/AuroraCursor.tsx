import { useEffect, useRef } from 'react';
import './AuroraCursor.css';

/**
 * A restrained, pointer-following aurora haze for fine-pointer devices.
 * Uses direct DOM updates instead of React state so pointer movement does not
 * trigger application-wide renders. It is decorative and never captures input.
 */
export function AuroraCursor() {
  const hazeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = hazeRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reducedMotion.matches || !finePointer.matches) return;

    let frame = 0;
    let x = -500;
    let y = -500;
    let visible = false;

    const render = () => {
      frame = 0;
      element.style.transform = `translate3d(${x - 190}px, ${y - 190}px, 0)`;
      element.style.opacity = visible ? '1' : '0';
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      x = event.clientX;
      y = event.clientY;
      visible = true;
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onLeave = () => {
      visible = false;
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={hazeRef} className="campora-aurora-cursor" aria-hidden="true" />;
}
