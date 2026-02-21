import React, { useEffect, useRef } from 'react';

interface ASMRStaticBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showOverlay?: boolean;
}

const ASMRStaticBackground: React.FC<ASMRStaticBackgroundProps> = ({
  children,
  className = '',
  showOverlay = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number;
    let height: number;
    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };

    const PARTICLE_COUNT = 8000;
    const MAGNETIC_RADIUS = 250;
    const VORTEX_STRENGTH = 0.15;
    const PULL_STRENGTH = 0.25;

    class Particle {
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      size: number = 0;
      alpha: number = 0;
      color: string = '';
      rotation: number = 0;
      rotationSpeed: number = 0;
      frictionGlow: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 0.15 + 0.05;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        const isGlass = Math.random() > 0.7;
        this.color = isGlass ? '240, 245, 255' : '80, 80, 85';
        this.alpha = Math.random() * 0.3 + 0.05;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAGNETIC_RADIUS) {
          const force = (MAGNETIC_RADIUS - dist) / MAGNETIC_RADIUS;

          this.vx += (dx / dist) * force * PULL_STRENGTH;
          this.vy += (dy / dist) * force * PULL_STRENGTH;

          this.vx += (dy / dist) * force * VORTEX_STRENGTH * 10;
          this.vy -= (dx / dist) * force * VORTEX_STRENGTH * 10;

          this.frictionGlow = force * 0.7;
        } else {
          this.frictionGlow *= 0.92;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.98;
        this.vy *= 0.98;

        this.vx += (Math.random() - 0.5) * 0.08;
        this.vy += (Math.random() - 0.5) * 0.08;

        this.rotation += this.rotationSpeed + (Math.abs(this.vx) + Math.abs(this.vy)) * 0.05;

        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const finalAlpha = Math.min(this.alpha + this.frictionGlow, 0.9);
        ctx.fillStyle = `rgba(${this.color}, ${finalAlpha})`;

        if (this.frictionGlow > 0.3) {
          ctx.shadowBlur = 5 * this.frictionGlow;
          ctx.shadowColor = `rgba(180, 220, 255, ${this.frictionGlow * 0.7})`;
        }

        ctx.beginPath();
        ctx.moveTo(0, -this.size * 1.5);
        ctx.lineTo(this.size * 0.6, 0);
        ctx.lineTo(0, this.size * 1.5);
        ctx.lineTo(-this.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    };

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 12, 0.18)';
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    init();
    render();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative w-full h-full bg-[#0a0a0c] overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full"
      />

      {showOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="px-8 py-4 border border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-sm">
            <h2 className="text-white/30 font-light tracking-[0.7em] uppercase text-sm md:text-xl">
              Atmospheric Friction
            </h2>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
            <p className="text-[10px] text-white/10 tracking-widest text-center">
              INTERACTIVE KINETIC ENVIRONMENT
            </p>
          </div>
        </div>
      )}

      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default ASMRStaticBackground;
