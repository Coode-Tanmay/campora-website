import { useEffect, useRef } from 'react';

/**
 * Lightweight decorative gold spark trail for desktop pointer devices.
 * It never captures pointer events and respects reduced-motion preferences.
 */
export function GoldSparkCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const media = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!media.matches || reducedMotion.matches) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; rotation: number };
    const sparks: Spark[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let lastSpawn = 0;
    let active = true;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const now = performance.now();
      if (now - lastSpawn < 12) return;
      lastSpawn = now;
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i += 1) {
        if (sparks.length >= 64) sparks.shift();
        const maxLife = 34 + Math.random() * 24;
        sparks.push({
          x: event.clientX + (Math.random() - 0.5) * 9,
          y: event.clientY + (Math.random() - 0.5) * 9,
          vx: (Math.random() - 0.5) * 1.15,
          vy: -0.35 - Math.random() * 1.15,
          life: maxLife,
          maxLife,
          size: 1.1 + Math.random() * 2.1,
          rotation: Math.random() * Math.PI,
        });
      }
    };

    const draw = () => {
      if (!active) return;
      context.clearRect(0, 0, width, height);
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.018;
        spark.vx *= 0.985;
        spark.life -= 1;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const opacity = Math.max(0, spark.life / spark.maxLife);
        context.save();
        context.translate(spark.x, spark.y);
        context.rotate(spark.rotation);
        context.globalAlpha = opacity * 0.9;
        context.shadowColor = 'rgba(229, 181, 43, 0.9)';
        context.shadowBlur = 9;
        context.fillStyle = i % 3 === 0 ? '#FFF0A6' : '#E5B52B';
        context.beginPath();
        context.moveTo(0, -spark.size * 1.7);
        context.lineTo(spark.size * 0.65, 0);
        context.lineTo(0, spark.size * 1.7);
        context.lineTo(-spark.size * 0.65, 0);
        context.closePath();
        context.fill();
        context.restore();
      }
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      sparks.length = 0;
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
