import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  show: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  items: [],
  show: (t) => {
    const id = nextId++;
    const item: ToastItem = { duration: t.action ? 5000 : 3200, ...t, id };
    // keep at most 3 visible, newest on top
    set((s) => ({
      items: [item, ...s.items.filter((x) => x.title !== item.title || x.message !== item.message)].slice(
        0,
        3,
      ),
    }));
    AccessibilityInfo.announceForAccessibility([item.title, item.message].filter(Boolean).join('. '));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

type Opts = { message?: string; action?: ToastAction; duration?: number };

const make =
  (type: ToastType) =>
  (title: string, opts: Opts = {}) =>
    useToasts.getState().show({ type, title, ...opts });

/** In-app banners (top of the screen). */
export const toast = {
  success: make('success'),
  error: make('error'),
  info: make('info'),
  warning: make('warning'),
  dismiss: (id: number) => useToasts.getState().dismiss(id),
};
