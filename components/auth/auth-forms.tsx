"use client";

import type { PlanId } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { plans } from "@/lib/stores/account-store";
import { safeNext, signIn, signInWithGoogle, signUp } from "@/lib/stores/auth-store";
import { AuthError, FloatingInput, FloatingPassword } from "@/components/auth/auth-fields";
import { Checkbox } from "@/components/ui/checkbox";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const primaryBtn =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none";
const secondaryBtn =
  "flex h-11 w-full items-center justify-center gap-3 rounded-md bg-white/20 disabled:opacity-60 text-base font-semibold text-white transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

function Banner({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mb-4 rounded-md bg-amber-500/90 px-4 py-3 text-sm font-medium text-black">
      {children}
    </p>
  );
}

function RememberMe({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2.5 text-base text-white">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="size-[18px] border-white/60 bg-transparent data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
      />
      Remember me
    </label>
  );
}

function GoogleButton({ next, label }: { next: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={secondaryBtn}
      onClick={async () => {
        setBusy(true);
        const result = await signInWithGoogle(next);
        // On success the browser is already leaving for Google.
        if (!result.ok) {
          setBusy(false);
          toast.error(result.error);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/** Text for ?error= when Google sends the user back without signing in. */
const oauthErrors: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  account_not_linked: "This email already has a password account. Sign in with your password.",
  state_not_found: "Google sign-in expired or was opened directly. Please press the Google button again.",
  state_mismatch: "Google sign-in expired. Please press the Google button again.",
  state_security_mismatch: "Google sign-in expired. Please press the Google button again.",
  banned_user: "Your account has been suspended. Please contact support.",
};

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const oauthError = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [tried, setTried] = useState(false);
  const [banner, setBanner] = useState(() =>
    oauthError ? (oauthErrors[oauthError.toLowerCase()] ?? "Google sign-in didn't work. Please try again.") : ""
  );
  const [busy, setBusy] = useState(false);

  const emailError = tried && !isEmail(email) && "Please enter a valid email address.";
  const passwordError = tried && !password && "Please enter your password.";

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    setBanner("");
    if (!isEmail(email) || !password) return;
    setBusy(true);
    const result = await signIn({ email: email.trim(), password, remember });
    if (!result.ok) {
      setBusy(false);
      return setBanner(result.error);
    }
    // Full navigation (not router.replace) so the server and the client cache see the new session.
    window.location.assign(next);
  };

  return (
    <>
      <h1 className="mb-7 text-3xl font-bold">Sign In</h1>
      <Banner>{banner}</Banner>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <FloatingInput
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!emailError}
            aria-describedby={emailError ? "login-email-error" : undefined}
          />
          <AuthError id="login-email-error">{emailError}</AuthError>
        </div>

        <div>
          <FloatingPassword
            id="login-password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!passwordError}
            aria-describedby={passwordError ? "login-password-error" : undefined}
          />
          <AuthError id="login-password-error">{passwordError}</AuthError>
        </div>

        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Sign In
        </button>

        {googleEnabled && (
          <>
            <p className="text-center text-base text-white/70">OR</p>
            <GoogleButton next={next} label="Sign in with Google" />
          </>
        )}

        <RememberMe checked={remember} onChange={setRemember} />
      </form>

      <p className="mt-5 text-base text-white/70">
        New to CineYellow?{" "}
        <Link
          href={next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold text-white hover:underline"
        >
          Sign up now.
        </Link>
      </p>
    </>
  );
}

/** 0–4 based on length, case mix, digits and symbols. */
function passwordScore(pw) {
  if (!pw) return 0;
  let score = pw.length >= 8 ? 1 : 0;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const strength = [
  { label: "Too short", bar: "bg-red-500" },
  { label: "Weak", bar: "bg-red-500" },
  { label: "Fair", bar: "bg-orange-400" },
  { label: "Good", bar: "bg-primary" },
  { label: "Strong", bar: "bg-emerald-400" },
];

export function SignupForm({ googleEnabled = false, billingEnabled = false }: { googleEnabled?: boolean; billingEnabled?: boolean }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // "Get Started" on the landing page passes the email along.
  const [form, setForm] = useState(() => ({
    name: "",
    email: params.get("email") ?? "",
    password: "",
    confirm: "",
    plan: "standard" as PlanId,
    terms: false,
  }));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const score = passwordScore(form.password);

  const errors = {
    name: !form.name.trim() && "Please enter your name.",
    email: !isEmail(form.email) && "Please enter a valid email address.",
    password: form.password.length < 8 && "Use at least 8 characters.",
    confirm: !form.confirm ? "Please confirm your password." : form.confirm !== form.password && "Passwords don't match.",
    terms: !form.terms && "Please accept the terms to continue.",
  };
  const show = (key) => (tried ? errors[key] : null);

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    const name = form.name.trim().slice(0, 24);
    const email = form.email.trim();
    // Better Auth creates the user and its databaseHooks add the profiles. Demo mode stores the
    // chosen plan on the user; with ZurvaPay on, the Account page asks for payment.
    const result = await signUp({ name, email, password: form.password, plan: billingEnabled ? undefined : form.plan });
    if (!result.ok) {
      setBusy(false);
      return toast.error(result.error);
    }
    // Billing on: straight to the Account page with the payment dialog open for the chosen plan.
    window.location.assign(billingEnabled ? `/account?plan=${form.plan}` : next);
  };

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Create account</h1>
      <p className="mb-7 text-white/70">Movies, series and anime — start watching in a minute.</p>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <FloatingInput id="signup-name" label="Name" autoComplete="name" value={form.name} onChange={set("name")} invalid={!!show("name")} />
          <AuthError>{show("name")}</AuthError>
        </div>
        <div>
          <FloatingInput id="signup-email" label="Email address" type="email" autoComplete="email" value={form.email} onChange={set("email")} invalid={!!show("email")} />
          <AuthError>{show("email")}</AuthError>
        </div>
        <div>
          <FloatingPassword id="signup-password" label="Password" autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!show("password")} />
          {form.password && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-full bg-white/15", i <= Math.max(score, 1) && strength[score].bar)} />
                ))}
              </div>
              <span className="w-16 text-right text-xs text-white/60">{strength[score].label}</span>
            </div>
          )}
          <AuthError>{show("password")}</AuthError>
        </div>
        <div>
          <FloatingPassword id="signup-confirm" label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} invalid={!!show("confirm")} />
          <AuthError>{show("confirm")}</AuthError>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-white/80">Choose a plan</legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(plans).map(([key, plan]) => {
              const selected = form.plan === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setForm((f) => ({ ...f, plan: key as PlanId }))}
                  className={cn(
                    "relative rounded-md border p-3 text-left transition",
                    selected ? "border-primary bg-primary/10" : "border-white/25 hover:border-white/50"
                  )}
                >
                  {selected && <Check className="absolute top-2 right-2 size-3.5 text-primary" />}
                  <span className="block text-sm font-bold">{plan.name}</span>
                  <span className="block text-xs text-white/60">{plan.price}/mo</span>
                  <span className="mt-1 block text-[11px] text-white/50">{plan.quality.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/80">
            <Checkbox
              checked={form.terms}
              onCheckedChange={(v) => setForm((f) => ({ ...f, terms: v === true }))}
              aria-invalid={!!show("terms") || undefined}
              className="mt-0.5 size-[18px] border-white/60 bg-transparent data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
            <span>I agree to the Terms of Use and Privacy Policy.</span>
          </label>
          <AuthError>{show("terms")}</AuthError>
        </div>

        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy && <Loader2 className="size-4 animate-spin" />} Create account
        </button>

        {googleEnabled && (
          <>
            <p className="text-center text-base text-white/70">OR</p>
            <GoogleButton next={next} label="Sign up with Google" />
          </>
        )}
      </form>

      <p className="mt-6 text-base text-white/70">
        Already have an account?{" "}
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-white hover:underline">
          Sign in now.
        </Link>
      </p>
    </>
  );
}
