"use client";

import type { PlanId } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { plans, updateAccount } from "@/lib/stores/account-store";
import { safeNext, signIn, signInWithCode, signUp } from "@/lib/stores/auth-store";
import { setActiveProfile, updateProfile } from "@/lib/stores/profile-store";
import { AuthError, FloatingInput, FloatingPassword } from "@/components/auth/auth-fields";
import { Checkbox } from "@/components/ui/checkbox";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const primaryBtn =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none";
const secondaryBtn =
  "flex h-11 w-full items-center justify-center rounded-md bg-white/20 text-base font-semibold text-white transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

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

export function LoginForm() {
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState("password"); // "password" | "code"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [tried, setTried] = useState(false);
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const emailError = tried && !isEmail(email) && "Please enter a valid email address.";
  const passwordError = tried && mode === "password" && password.length < 6 && "Your password must contain between 6 and 60 characters.";
  const codeError = tried && codeSent && !/^\d{4}$/.test(code) && "Enter the 4-digit code.";

  const done = () => {
    updateAccount({ email: email.trim() });
    // Full navigation (not router.replace) so the server and the client cache see the new session.
    window.location.assign(next);
  };

  const switchMode = (m) => {
    setMode(m);
    setTried(false);
    setBanner("");
    setCode("");
    setCodeSent(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    setBanner("");
    if (!isEmail(email)) return;

    if (mode === "password") {
      if (password.length < 6) return;
      setBusy(true);
      const result = await signIn({ email: email.trim(), password, remember });
      setBusy(false);
      return result.ok ? done() : setBanner(result.error);
    }

    if (!codeSent) {
      setCodeSent(true);
      setTried(false);
      toast.success("Sign-in code sent", { description: email.trim() });
      return;
    }
    if (!/^\d{4}$/.test(code)) return;
    setBusy(true);
    const result = await signInWithCode({ email: email.trim(), code, remember });
    setBusy(false);
    return result.ok ? done() : setBanner(result.error);
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
            disabled={mode === "code" && codeSent}
            aria-describedby={emailError ? "login-email-error" : undefined}
          />
          <AuthError id="login-email-error">{emailError}</AuthError>
        </div>

        {mode === "password" && (
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
        )}

        {mode === "code" && codeSent && (
          <div>
            <p className="mb-3 text-sm text-white/70">
              Enter the code we sent to <span className="font-semibold text-white">{email.trim()}</span>.
            </p>
            <FloatingInput
              id="login-code"
              label="4-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              invalid={!!codeError}
              inputClassName="text-xl tracking-[0.6em]"
            />
            <AuthError>{codeError}</AuthError>
            <button
              type="button"
              className="mt-2 text-sm text-white/70 underline-offset-2 hover:text-white hover:underline"
              onClick={() => toast.success("New code sent", { description: email.trim() })}
            >
              Resend code
            </button>
          </div>
        )}

        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "code" && !codeSent ? "Send Sign-In Code" : "Sign In"}
        </button>

        <p className="text-center text-base text-white/70">OR</p>

        <button type="button" className={secondaryBtn} onClick={() => switchMode(mode === "password" ? "code" : "password")}>
          {mode === "password" ? "Use a Sign-In Code" : "Use Password"}
        </button>

        {mode === "password" && (
          <p className="text-center">
            <button
              type="button"
              className="text-base text-white underline-offset-2 hover:underline"
              onClick={() =>
                isEmail(email)
                  ? toast.success("Password reset link sent", { description: email.trim() })
                  : (setTried(true), toast("Enter your email first", { description: "We'll send the reset link there." }))
              }
            >
              Forgot password?
            </button>
          </p>
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

export function SignupForm() {
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
    const result = await signUp({ name, email, password: form.password });
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    updateAccount({ email, plan: form.plan, memberSince: new Date().toISOString().slice(0, 10) });
    updateProfile("guest", { name });
    setActiveProfile("guest");
    window.location.assign(next);
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
