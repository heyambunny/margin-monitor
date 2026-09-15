'use client';

import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  format?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 1500,
  className = '',
  prefix = '',
  suffix = '',
  format,
}: AnimatedNumberProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * value));

      if (progress === 1) clearInterval(timer);
    }, 30);

    return () => clearInterval(timer);
  }, [value, duration]);

  const formattedValue = format ? format(count) : count.toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
