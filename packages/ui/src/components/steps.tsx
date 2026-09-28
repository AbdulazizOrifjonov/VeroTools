import * as React from 'react';

import { cn } from '../lib/utils';

export interface StepItem {
  id: string;
  label: React.ReactNode;
  /** Optional secondary line under the label (desktop only). */
  description?: React.ReactNode;
}

export interface StepsProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  steps: StepItem[];
  /** Active step: zero-based index or the step `id`. */
  current: number | string;
  /** Makes completed steps clickable (e.g. go back to "Delivery" from "Payment"). */
  onStepClick?: (index: number, step: StepItem) => void;
  /** Screen-reader suffix for completed steps, e.g. t('checkout.stepDone'). */
  completedLabel?: string;
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 8.4 6.6 11.5 12.5 4.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-check-draw [stroke-dasharray:1]"
      />
    </svg>
  );
}

/**
 * Horizontal checkout stepper. ≥768px: numbered circles joined by lines, completed steps show a check.
 * Phones: compact "2 / 5 · Delivery" with a progress bar.
 */
function Steps({ steps, current, onStepClick, completedLabel, className, ...props }: StepsProps) {
  const total = steps.length;
  const found = typeof current === 'number' ? current : steps.findIndex((step) => step.id === current);
  const activeIndex = Math.min(Math.max(found, 0), Math.max(total - 1, 0));
  const activeStep = steps[activeIndex];
  const progress = total > 0 ? ((activeIndex + 1) / total) * 100 : 0;

  return (
    <nav data-slot="steps" className={cn('w-full', className)} {...props}>
      {/* Phones */}
      <div data-slot="steps-compact" className="md:hidden">
        <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
          <span className="shrink-0 font-semibold text-muted-foreground tabular-nums">
            {activeIndex + 1} / {total}
          </span>
          <span aria-hidden="true" className="text-muted-foreground/60">
            ·
          </span>
          <span className="truncate font-bold text-foreground">{activeStep?.label}</span>
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--input)_70%,transparent)]">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-brand"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tablets / desktop */}
      <ol data-slot="steps-list" className="hidden items-start md:flex">
        {steps.map((step, index) => {
          const state = index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming';
          const clickable = state === 'complete' && Boolean(onStepClick);
          const content = (
            <>
              <span
                data-slot="step-indicator"
                className={cn(
                  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                  'transition-[background-color,border-color,color,box-shadow] duration-200 ease-brand',
                  state === 'complete' && 'bg-primary text-primary-foreground',
                  state === 'current' &&
                    'border-2 border-primary bg-surface-elevated text-primary shadow-[0_0_0_4px_var(--brand-soft)] dark:text-brand',
                  state === 'upcoming' && 'border border-input bg-surface-elevated text-muted-foreground',
                )}
              >
                {state === 'complete' ? <CheckMark className="size-4" /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pt-1.5">
                <span
                  className={cn(
                    'text-sm leading-tight',
                    state === 'upcoming'
                      ? 'font-medium text-muted-foreground'
                      : 'font-semibold text-foreground',
                  )}
                >
                  {step.label}
                  {state === 'complete' && completedLabel ? (
                    <span className="sr-only">, {completedLabel}</span>
                  ) : null}
                </span>
                {step.description ? (
                  <span className="text-xs leading-snug text-muted-foreground">{step.description}</span>
                ) : null}
              </span>
            </>
          );

          return (
            <li
              key={step.id}
              data-slot="step"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className="group/step relative flex flex-1 items-start gap-3 pe-3 last:flex-none last:pe-0"
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index, step)}
                  className="flex items-start gap-3 rounded-md text-start transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-start gap-3">{content}</div>
              )}
              {index < total - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-4 h-0.5 min-w-6 flex-1 rounded-full transition-colors duration-300',
                    index < activeIndex ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Steps };
