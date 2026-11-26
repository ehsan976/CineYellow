// Outgoing email (password reset links) over SMTP. Defaults are for Gmail: set SMTP_USER to the
// Gmail address and SMTP_PASS to a Google "App password" (Google Account → Security → 2-Step
// Verification → App passwords). Another provider works too with SMTP_HOST / SMTP_PORT.
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const user = process.env.SMTP_USER?.trim();
// Google shows app passwords in groups of four ("abcd efgh ijkl mnop"); the spaces aren't part of it.
const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT) || 465;
const from = process.env.EMAIL_FROM?.trim() || (user ? `CineYellow <${user}>` : "");

/** True when SMTP credentials are set in .env. */
export const emailEnabled = Boolean(user && pass);

/**
 * Forgot password works with email set up, and also in development without it (the link is
 * printed in the terminal instead). In production without SMTP the "Forgot password?" link is hidden.
 */
export const passwordResetEnabled = emailEnabled || process.env.NODE_ENV !== "production";

let transport: Transporter | null = null;
function getTransport() {
  // Port 465 is TLS from the start; 587 (and others) upgrade with STARTTLS.
  transport ??= nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return transport;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends the password reset link. Throws when SMTP rejects it (the caller logs it). */
export async function sendPasswordResetEmail({ to, name, url }: { to: string; name: string; url: string }) {
  if (!emailEnabled) {
    console.info(`[email] SMTP isn't set up. Password reset link for ${to}:\n${url}`);
    return;
  }
  const greeting = name ? `Hi ${name},` : "Hi,";
  await getTransport().sendMail({
    from,
    to,
    subject: "Reset your CineYellow password",
    text: `${greeting}\n\nSomeone asked to reset the password for your CineYellow account. Open this link to choose a new one:\n\n${url}\n\nThe link works for 1 hour. If you didn't ask for this, ignore this email; your password stays the same.\n`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Reset your password</h1>
  <p>${escapeHtml(greeting)}</p>
  <p>Someone asked to reset the password for your CineYellow account. Press the button to choose a new one.</p>
  <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#f5c518;color:#000;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
  <p style="font-size:13px;color:#555">The link works for 1 hour. If you didn't ask for this, ignore this email; your password stays the same.</p>
  <p style="font-size:12px;color:#888;word-break:break-all">Button not working? Paste this into your browser:<br>${escapeHtml(url)}</p>
</div>`,
  });
}
