import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  Button,
} from '@vero/ui';
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** extra content (e.g. a reason field) between the description and the buttons */
  children?: ReactNode;
  confirmLabel?: ReactNode;
  tone?: 'danger' | 'warning' | 'brand';
  /** async action; the dialog closes when it resolves and stays open (button re-enabled) when it throws */
  onConfirm: () => Promise<unknown> | unknown;
  confirmDisabled?: boolean;
}

/**
 * Confirmation for destructive / important actions. The confirm button shows a pending state while the
 * request runs; errors are handled by the caller (toast) and keep the dialog open.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  confirmDisabled,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      /* caller already reported the error */
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia tone={tone === 'brand' ? 'brand' : tone}>{tone === 'danger' ? <Trash2Icon /> : <TriangleAlertIcon />}</AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('confirm.cancel')}</AlertDialogCancel>
          <Button variant={tone === 'danger' ? 'destructive' : 'default'} loading={pending} disabled={confirmDisabled} onClick={() => void run()}>
            {confirmLabel ?? (tone === 'danger' ? t('confirm.delete') : t('confirm.confirm'))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Dialog state holder: const del = useConfirm<Item>(); del.ask(item); <ConfirmDialog open={del.open} …/>
 * The target stays set while the dialog animates out (it is replaced by the next `ask`).
 */
export function useConfirm<T>() {
  const [state, setState] = useState<{ target: T | null; open: boolean }>({ target: null, open: false });
  const actions = useMemo(
    () => ({
      ask: (item: T) => setState({ target: item, open: true }),
      onOpenChange: (open: boolean) => setState((s) => ({ ...s, open })),
      close: () => setState((s) => ({ ...s, open: false })),
    }),
    [],
  );
  return { target: state.target, open: state.open, ...actions };
}

/** Same state holder for any dialog / drawer bound to one record. */
export const useDialogTarget = useConfirm;
