'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/providers/ThemeProvider';
import {
  Home,
  ArrowLeft,
  Gem,
  IndianRupee,
  Percent,
  TrendingDown,
  FileQuestion,
  Compass,
  Receipt,
} from 'lucide-react';

const FLOATING_ICONS = [IndianRupee, Percent, TrendingDown, FileQuestion, Compass, Receipt];

const MESSAGES = [
  "This invoice got lost in the ledger.",
  "Looks like this margin went negative.",
  "This page didn't make the cut this quarter.",
  "404 - client not found in our records.",
  "This route never got billed.",
  "Even Finance couldn't reconcile this URL.",
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  icon: typeof FLOATING_ICONS[number];
  size: number;
  baseRotation: number;
}

export default function NotFound() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  // Random positions must not be generated during the initial render - that
  // runs on both server and client, and the two Math.random() calls produce
  // different values, causing a hydration mismatch. Generate them client-only.
  const particles = useRef<Particle[]>([]);

  const [message, setMessage] = useState(MESSAGES[0]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    particles.current = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      icon: FLOATING_ICONS[i % FLOATING_ICONS.length],
      size: 16 + Math.random() * 20,
      baseRotation: Math.random() * 360,
    }));
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    setMounted(true);
  }, []);

  useEffect(() => {
    let raf: number;

    const step = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        particles.current.forEach((p, i) => {
          const px = (p.x / 100) * rect.width;
          const py = (p.y / 100) * rect.height;
          const dx = px - mouse.current.x;
          const dy = py - mouse.current.y;
          const dist = Math.hypot(dx, dy);

          let vx = p.vx;
          let vy = p.vy;
          if (dist < 130 && dist > 0.01) {
            const force = (130 - dist) / 130;
            vx += (dx / dist) * force * 0.7;
            vy += (dy / dist) * force * 0.7;
          }

          vx *= 0.94;
          vy *= 0.94;

          let nx = p.x + vx;
          let ny = p.y + vy;
          if (nx < 2) { nx = 2; vx = Math.abs(vx); }
          if (nx > 98) { nx = 98; vx = -Math.abs(vx); }
          if (ny < 2) { ny = 2; vy = Math.abs(vy); }
          if (ny > 98) { ny = 98; vy = -Math.abs(vy); }

          p.x = nx;
          p.y = ny;
          p.vx = vx;
          p.vy = vy;

          const el = iconRefs.current[i];
          if (el) {
            const px2 = (p.x / 100) * rect.width;
            const py2 = (p.y / 100) * rect.height;
            el.style.transform = `translate(-50%, -50%) translate(${px2}px, ${py2}px) rotate(${p.baseRotation + p.x}deg)`;
          }
        });
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setTilt({
      x: ((e.clientY - rect.top) / rect.height - 0.5) * -8,
      y: ((e.clientX - rect.left) / rect.width - 0.5) * 8,
    });
  };

  const handleMouseLeave = () => {
    mouse.current = { x: -1000, y: -1000 };
    setTilt({ x: 0, y: 0 });
  };

  const bg = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const iconColor = isDark ? 'text-white/[0.08]' : 'text-gray-900/[0.06]';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 ${bg} transition-colors duration-300`}
    >
      {mounted && particles.current.map((p, i) => {
        const Icon = p.icon;
        return (
          <div
            key={i}
            ref={(el) => { iconRefs.current[i] = el; }}
            className={`pointer-events-none absolute left-0 top-0 ${iconColor}`}
            style={{ willChange: 'transform' }}
          >
            <Icon style={{ width: p.size, height: p.size }} strokeWidth={1.5} />
          </div>
        );
      })}

      <div
        className="relative z-10 text-center select-none"
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div className="mb-5 flex items-center justify-center gap-2">
          <Gem className="h-5 w-5 text-blue-400" />
          <span className={`text-sm font-medium ${textMuted}`}>Margin Monitor</span>
        </div>

        <h1 className={`text-[6rem] font-bold leading-none tracking-tight sm:text-[9rem] ${textMain}`}>
          4<span className="text-blue-400">0</span>4
        </h1>

        <p className={`mt-3 text-lg font-medium ${textMain}`}>Page not found</p>
        <p className={`mt-1 text-sm ${textMuted}`}>{message}</p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition ${
              isDark
                ? 'border-white/10 text-white/70 hover:bg-white/5'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
