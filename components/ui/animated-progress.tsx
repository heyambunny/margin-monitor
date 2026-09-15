'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  duration?: number;
  color?: string;
}

export function AnimatedProgress({
  value,
  max = 100,
  className = '',
  duration = 1500,
  color = 'bg-blue-500',
}: AnimatedProgressProps) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = Date.now();
    const target = Math.min((value / max) * 100, 100);

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progressValue = Math.min(elapsed / duration, 1);
      // Ease out cubic for smoother feel
      const eased = 1 - Math.pow(1 - progressValue, 3);
      setProgress(eased * target);

      if (progressValue === 1) clearInterval(timer);
    }, 16); // 60fps

    return () => clearInterval(timer);
  }, [value, max, duration]);

  return (
    <div className={`w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        ref={ref}
        className={`h-full rounded-full transition-none ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
