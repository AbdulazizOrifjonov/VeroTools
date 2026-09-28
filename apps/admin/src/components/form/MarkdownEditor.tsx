import { cn, Textarea } from '@vero/ui';
import { BoldIcon, Heading2Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon } from 'lucide-react';
import { lazy, Suspense, useId, useRef, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

const Markdown = lazy(() => import('../common/Markdown').then((m) => ({ default: m.Markdown })));

type Action = 'bold' | 'italic' | 'heading' | 'bullet' | 'numbered' | 'link' | 'quote';

function apply(text: string, start: number, end: number, action: Action): { text: string; start: number; end: number } {
  const selected = text.slice(start, end);
  const wrap = (left: string, right: string, placeholder: string) => {
    const inner = selected || placeholder;
    const next = `${text.slice(0, start)}${left}${inner}${right}${text.slice(end)}`;
    return { text: next, start: start + left.length, end: start + left.length + inner.length };
  };
  const linePrefix = (prefix: (i: number) => string) => {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = text.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
    const block = text.slice(lineStart, lineEnd);
    const lines = block.split('\n').map((l, i) => `${prefix(i)}${l}`);
    const replaced = lines.join('\n');
    return { text: `${text.slice(0, lineStart)}${replaced}${text.slice(lineEnd)}`, start: lineStart, end: lineStart + replaced.length };
  };
  switch (action) {
    case 'bold':
      return wrap('**', '**', 'text');
    case 'italic':
      return wrap('*', '*', 'text');
    case 'link':
      return wrap('[', '](https://)', 'link');
    case 'heading':
      return linePrefix(() => '## ');
    case 'bullet':
      return linePrefix(() => '- ');
    case 'numbered':
      return linePrefix((i) => `${i + 1}. `);
    case 'quote':
      return linePrefix(() => '> ');
  }
}

export interface MarkdownEditorProps extends Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

/** Markdown textarea with a small formatting toolbar and a live preview (storefront renderer). */
export function MarkdownEditor({ value, onChange, rows = 10, className, id, ...props }: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoId = useId();
  const textareaId = id ?? autoId;

  const run = (action: Action) => {
    const el = ref.current;
    if (!el) return;
    const result = apply(value ?? '', el.selectionStart, el.selectionEnd, action);
    onChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  const tools: Array<{ action: Action; label: string; icon: typeof BoldIcon }> = [
    { action: 'bold', label: t('form.bold'), icon: BoldIcon },
    { action: 'italic', label: t('form.italic'), icon: ItalicIcon },
    { action: 'heading', label: t('form.heading'), icon: Heading2Icon },
    { action: 'bullet', label: t('form.bulletList'), icon: ListIcon },
    { action: 'numbered', label: t('form.numberedList'), icon: ListOrderedIcon },
    { action: 'quote', label: t('form.quote'), icon: QuoteIcon },
    { action: 'link', label: t('form.link'), icon: LinkIcon },
  ];

  return (
    <div className={cn('overflow-hidden rounded-md border border-input bg-surface-elevated shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20', className)}>
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-surface px-1.5 py-1">
        <div role="tablist" aria-label={t('form.preview')} className="flex items-center gap-0.5">
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-controls={`${textareaId}-${m}`}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-sm px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
                mode === m && 'bg-surface-elevated text-foreground shadow-xs',
              )}
            >
              {m === 'write' ? t('form.write') : t('form.preview')}
            </button>
          ))}
        </div>
        {mode === 'write' ? (
          <div className="flex items-center gap-0.5" role="toolbar" aria-label="Markdown">
            {tools.map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                type="button"
                onClick={() => run(action)}
                aria-label={label}
                title={label}
                className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {mode === 'write' ? (
        <Textarea
          {...props}
          id={textareaId}
          ref={ref}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          autoResize={false}
          className="min-h-40 resize-y rounded-none border-0 bg-transparent font-mono text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
        />
      ) : (
        <div id={`${textareaId}-preview`} role="tabpanel" className="max-h-[32rem] min-h-40 overflow-y-auto px-4 py-3">
          {value?.trim() ? (
            <Suspense fallback={null}>
              <Markdown>{value}</Markdown>
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">{t('form.previewEmpty')}</p>
          )}
        </div>
      )}
    </div>
  );
}
