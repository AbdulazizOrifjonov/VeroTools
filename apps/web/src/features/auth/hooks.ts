import { isApiError, qk, useApi } from '@vero/api-client';
import type { VerifyOtpInput } from '@vero/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

/*
 * @vero/api-client exposes these endpoints (api.auth.*) but no React hooks for them —
 * thin wrappers live here (see the report).
 */

export function useVerifyEmail() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.auth.verifyEmail(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useRequestEmailVerification() {
  const api = useApi();
  return useMutation({ mutationFn: () => api.auth.requestEmailVerification() });
}

export function useSendPhoneOtp() {
  const api = useApi();
  return useMutation({ mutationFn: (phone: string) => api.auth.sendOtp(phone, 'verify_phone') });
}

export function useVerifyPhoneOtp() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyOtpInput) => api.auth.verifyOtp(input),
    onSuccess: async () => {
      // refresh the cached user (isPhoneVerified) and the session store
      const user = await api.auth.me();
      qc.setQueryData(qk.me(), user);
    },
  });
}

/** Seconds left from an OTP_COOLDOWN error (`details.cooldownSeconds`). */
export function cooldownFromError(error: unknown): number | null {
  if (!isApiError(error) || error.code !== 'OTP_COOLDOWN') return null;
  const s = (error.details as { cooldownSeconds?: unknown } | undefined)?.cooldownSeconds;
  return typeof s === 'number' && s > 0 ? Math.ceil(s) : 60;
}

/** "Resend in 42 s" countdown. */
export function useCooldown(initialSeconds = 0) {
  const [until, setUntil] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setUntil(current + Math.max(0, seconds) * 1000);
  }, []);

  return { left: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
