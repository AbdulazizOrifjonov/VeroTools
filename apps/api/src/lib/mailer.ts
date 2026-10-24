import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (transporter) return transporter;
  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  } else {
    // Development: messages are rendered and logged instead of being delivered.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export const mailerConfigured = () => Boolean(env.SMTP_HOST);

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(input: MailInput): Promise<boolean> {
  if (isTest) return true;
  try {
    const info = await getTransport().sendMail({ from: env.MAIL_FROM, ...input });
    if (!env.SMTP_HOST) logger.info({ to: input.to, subject: input.subject }, '[mail:dev] e-mail rendered (SMTP not configured)');
    else logger.debug({ messageId: info.messageId }, 'mail sent');
    return true;
  } catch (err) {
    logger.error({ err, to: input.to }, 'mail delivery failed');
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Branded, inline-styled e-mail layout (works in all major mail clients). */
export function emailLayout(opts: { title: string; intro: string; button?: { label: string; url: string }; footer: string; body?: string }) {
  const button = opts.button
    ? `<p style="margin:28px 0"><a href="${esc(opts.button.url)}" style="background:#E67700;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;display:inline-block">${esc(opts.button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F6F6F7;font-family:Manrope,Segoe UI,Arial,sans-serif;color:#141416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #E6E6EA;overflow:hidden">
<tr><td style="background:#141417;padding:18px 24px"><span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:#FD8902;vertical-align:middle"></span><span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:.5px;margin-left:10px;vertical-align:middle">OCKEAN</span></td></tr>
<tr><td style="padding:28px 24px"><h1 style="margin:0 0 12px;font-size:22px">${esc(opts.title)}</h1><p style="margin:0;line-height:1.6;color:#3F3F47">${esc(opts.intro)}</p>${opts.body ?? ''}${button}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #EFEFF1;color:#75757F;font-size:12px;line-height:1.5">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
