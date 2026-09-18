'use client';

import { useSession } from '@/lib/providers/SessionProvider';
import { ShieldCheck } from 'lucide-react';

interface SessionTimerProps {
  isDark: boolean;
}

// Turns amber in the last 5 minutes and red in the last minute (matching
// the warning modal's own threshold), so it stays out of the way as a
// quiet, muted line for most of a session.
const CAUTION_UNDER_SECONDS = 5 * 60;
const URGENT_UNDER_SECONDS = 60;

export function SessionTimer({ isDark }: SessionTimerProps) {
  const { secondsUntilLogout, isWarning } = useSession();

  const urgent = isWarning || secondsUntilLogout <= URGENT_UNDER_SECONDS;
  const caution = secondsUntilLogout <= CAUTION_UNDER_SECONDS;
  const mins = Math.floor(secondsUntilLogout / 60);
  const secs = secondsUntilLogout % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  const colorClass = urgent
    ? isDark ? 'text-red-400' : 'text-red-600'
    : caution
    ? isDark ? 'text-amber-400' : 'text-amber-600'
    : isDark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-[10px] ${colorClass}`}
      title="Time remaining before you are automatically logged out due to inactivity"
    >
      <ShieldCheck className="h-3 w-3" />
      <span>Session ends in {formatted}</span>
    </div>
  );
}
