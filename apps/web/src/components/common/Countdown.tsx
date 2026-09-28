import { cn } from '@vero/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
  totalMs: number;
}

function parts(endsAt: number, now: number): CountdownParts {
  const totalMs = Math.max(0, endsAt - now);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: totalMs <= 0,
    totalMs,
  };
}

/** Ticks once per second until `endsAt` (ISO string). */
export function useCountdown(endsAt: string | undefined | null): CountdownParts | null {
  const end = endsAt ? new Date(endsAt).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(end)) return;
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= end) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [end]);
  if (!Number.isFinite(end)) return null;
  return parts(end, now);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2 d 04:12:33" style countdown. `variant="boxes"` renders digit tiles (product page, promotions). */
export function Countdown({
  endsAt,
  variant = 'inline',
  className,
  label,
}: {
  endsAt: string;
  variant?: 'inline' | 'boxes';
  className?: string;
  /** Visually hidden prefix for screen readers ("Promotion ends in"). */
  label?: string;
}) {
  const { t } = useTranslation();
  const c = useCountdown(endsAt);
  if (!c || c.done) return null;
  const readable = t('countdown.readable', { days: c.days, hours: c.hours, minutes: c.minutes });

  if (variant === 'boxes') {
    const units: Array<[number, string]> = [
      [c.days, t('countdown.d')],
      [c.hours, t('countdown.h')],
      [c.minutes, t('countdown.m')],
      [c.seconds, t('countdown.s')],
    ];
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)} role="timer" aria-live="off">
        <span className="sr-only">
          {label ? `${label}: ` : ''}
          {readable}
        </span>
        {units.map(([value, unit], i) => (
          <span key={i} aria-hidden="true" className="flex min-w-11 flex-col items-center rounded-md bg-graphite px-1.5 py-1 text-graphite-foreground dark:bg-secondary">
            <span className="text-base leading-tight font-bold tabular-nums">{pad(value)}</span>
            <span className="text-[10px] leading-tight font-medium tracking-wide uppercase opacity-70">{unit}</span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={cn('tabular-nums', className)} role="timer" aria-live="off">
      <span className="sr-only">
        {label ? `${label}: ` : ''}
        {readable}
      </span>
      <span aria-hidden="true">
        {c.days > 0 ? `${t('countdown.daysShort', { count: c.days })} ` : ''}
        {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
      </span>
    </span>
  );
}
