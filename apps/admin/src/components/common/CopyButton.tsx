import { Button, cn, toast, Tooltip, TooltipContent, TooltipTrigger } from '@vero/ui';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Icon button that copies a value (order number, SKU, URL) to the clipboard. */
export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('common:status.error'));
    }
  };
  const text = copied ? t('common.copied') : (label ?? t('common.copy'));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className={cn('size-7 text-muted-foreground', className)} onClick={() => void copy()} aria-label={text}>
          {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
