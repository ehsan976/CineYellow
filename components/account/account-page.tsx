"use client";

import type { PlanId } from "@/lib/types";
import { useEffect, useState } from "react";
import { Check, Loader2, LogOut, Monitor, Smartphone, Tv } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { authClient, useSession } from "@/lib/auth/client";
import { plans, updateAccount } from "@/lib/stores/account-store";
import { changePassword, deleteAccount, signOut } from "@/lib/stores/auth-store";
import { checkPendingPayment } from "@/lib/stores/payment-store";
import { PaymentDialog } from "@/components/account/payment-dialog";
import { TraktCard } from "@/components/account/trakt-card";
import { useApp } from "@/components/providers/app-context";
import { useAccount } from "@/hooks/use-account";
import { PageHeading, SettingRow, SettingsCard, SettingsSkeleton } from "@/components/account/settings-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const formatLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export function AccountPage() {
  const { hydrated } = useApp();
  const account = useAccount();
  const { data: session, isPending } = useSession();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [payPlan, setPayPlan] = useState<PlanId | null>(null);

  // Back from Safepay (?payment=…), or sent here by sign-up with a plan to pay for (?plan=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("payment");
    if (outcome === "success") toast.success("Payment received — enjoy watching!");
    if (outcome === "pending") toast("Payment not confirmed yet", { description: "Use “Check status” on this page in a minute." });
    if (outcome === "failed") toast.error("The payment didn't go through.", { description: "No money was taken. Please try again." });
    if (outcome === "cancelled") toast("Payment cancelled.");
    // Back from Trakt (/api/trakt/callback).
    const traktOutcome = params.get("trakt");
    if (traktOutcome === "connected") toast.success("Trakt connected");
    if (traktOutcome === "cancelled") toast("Trakt link cancelled.");
    if (traktOutcome === "error") toast.error("Couldn't connect Trakt. Please try again.");
    if (traktOutcome === "unavailable") toast.error("Trakt isn't set up on this site.");
    const plan = params.get("plan");
    if (outcome || plan || traktOutcome) window.history.replaceState(null, "", "/account");
    if (!plan || !(plan in plans)) return;
    // Open the payment dialog once the page has rendered.
    const id = setTimeout(() => setPayPlan(plan as PlanId), 0);
    return () => clearTimeout(id);
  }, []);

  if (!hydrated || isPending) {
    return (
      <>
        <PageHeading title="Account" />
        <SettingsSkeleton />
      </>
    );
  }

  const email = session?.user.email ?? "";
  // Sign-up date from the database; the stored demo date only as a fallback.
  const memberSince = session ? new Date(session.user.createdAt).toISOString().slice(0, 10) : account.memberSince;

  const removeAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    if (!result.ok) {
      setDeleting(false);
      return toast.error(result.error);
    }
    await signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops signed-in cached pages
    window.location.assign("/welcome");
  };

  return (
    <>
      <PageHeading title="Account" description="Membership, plan and devices." />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard title="Membership" description={`Member since ${formatDate(memberSince)}`}>
          <SettingRow label="Email" hint={email}>
            <span className="text-sm text-muted-foreground">{session?.user.name}</span>
          </SettingRow>
          <SettingRow label="Password" hint="At least 8 characters.">
            <Button variant="outline" onClick={() => setPasswordOpen(true)}>
              Change password
            </Button>
          </SettingRow>
        </SettingsCard>

        <SettingsCard
          title="Plan"
          description={account.planInfo ? `${account.planInfo.name} · ${account.planInfo.price}/month` : "No plan yet — choose one to start watching."}
        >
          {account.billing ? (
            <>
              <AccessRow />
              {account.checkoutPaused && (
                <p className="pb-3 text-sm text-muted-foreground">
                  Plans open as soon as the first movies and shows are streaming on CineYellow. Until then you can browse
                  everything and see where each title is streaming.
                </p>
              )}
            </>
          ) : (
            <p className="pb-3 text-sm text-muted-foreground">
              Demo mode: plans switch for free. Add your Safepay keys to <code>.env</code> to take real payments.
            </p>
          )}
          {/* Three across only when the card itself is wide enough (it's half width on large screens). */}
          <div className="grid gap-3 py-3 @lg:grid-cols-3">
            {Object.entries(plans).map(([key, plan]) => {
              const current = key === account.plan;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col rounded-xl p-4 ring-1 transition",
                    current ? "bg-primary/10 ring-primary" : "ring-foreground/10 hover:ring-foreground/25"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-bold">{plan.name}</span>
                    {current && <Badge className="rounded-md">Current</Badge>}
                  </div>
                  <span className="mt-2 text-2xl font-black">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </span>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary" /> {plan.quality}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary" /> {plan.screens} screen{plan.screens > 1 ? "s" : ""} at a time
                    </li>
                  </ul>
                  <Button
                    size="sm"
                    variant={current ? "secondary" : "default"}
                    disabled={(current && !account.billing) || (account.billing && account.checkoutPaused)}
                    className="mt-4 h-auto min-h-7 py-1 whitespace-normal"
                    onClick={() => {
                      if (account.billing) return setPayPlan(key as PlanId);
                      updateAccount({ plan: key as PlanId });
                      toast.success(`Plan changed to ${plan.name}`);
                    }}
                  >
                    {account.billing && account.checkoutPaused
                      ? "Coming soon"
                      : !account.billing
                      ? current
                        ? "Your plan"
                        : `Switch to ${plan.name}`
                      : current
                        ? "Add 30 days"
                        : account.plan
                          ? `Switch to ${plan.name}`
                          : `Pay ${plan.price}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </SettingsCard>

        <DevicesCard currentToken={session?.session.token} />

        <TraktCard />

        <SettingsCard title="Danger zone" className="ring-destructive/30">
          <SettingRow label="Sign out of all devices" hint="You'll need to sign in again everywhere.">
            <Button
              variant="outline"
              onClick={async () => {
                const { error } = await authClient.revokeOtherSessions();
                if (error) return toast.error("Couldn't sign out other devices.");
                toast.success("Signed out of all other devices");
                // Reload so the devices list shows only this one.
                window.location.reload();
              }}
            >
              Sign out everywhere
            </Button>
          </SettingRow>
          <SettingRow label="Delete account" hint="Permanently removes your account and data.">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </SettingRow>
        </SettingsCard>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <PaymentDialog plan={payPlan} onClose={() => setPayPlan(null)} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes {email} and signs you out everywhere. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={removeAccount}>
              {deleting && <Loader2 className="animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Paid-until date, plus "Check status" for a payment the gateway hasn't confirmed yet. */
function AccessRow() {
  const { access, pendingPayment, planInfo } = useAccount();
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!pendingPayment) return;
    setChecking(true);
    const result = await checkPendingPayment(pendingPayment.id);
    setChecking(false);
    if (!result.ok) return toast.error(result.error);
    if (result.status === "paid") toast.success("Payment confirmed — enjoy watching!");
    else if (result.status === "failed") toast.error("That payment didn't go through. No money was taken.");
    else toast("Still waiting for Safepay to confirm. Try again in a minute.");
  };

  return (
    <>
      <SettingRow
        label={access ? `${planInfo?.name} plan · paid until ${formatLongDate(access.until)}` : "No active plan"}
        hint={
          access
            ? `Paid${access.method ? ` by ${access.method}` : ""} through Safepay. Plans don't renew automatically — pay again before it ends.`
            : "Choose a plan below and pay securely with Safepay."
        }
        className="pb-3"
      >
        <span />
      </SettingRow>
      {pendingPayment && (
        <SettingRow
          label="Payment waiting for confirmation"
          hint={`${plans[pendingPayment.plan].name} plan through Safepay`}
          className="pb-3"
        >
          <Button variant="outline" disabled={checking} onClick={check}>
            {checking && <Loader2 className="animate-spin" />} Check status
          </Button>
        </SettingRow>
      )}
    </>
  );
}

type SessionRow = { id: string; token: string; userAgent?: string | null; updatedAt: Date | string };

/** "Chrome on Windows" + an icon, from the session's user agent. */
function describeDevice(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const icon = /SmartTV|Tizen|Web0S|TV\b/.test(ua) ? Tv : /Mobile|Android|iPhone|iPad/.test(ua) ? Smartphone : Monitor;
  return { name: os ? `${browser} on ${os}` : browser, icon };
}

const formatDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Every signed-in session for this account, from Better Auth. */
function DevicesCard({ currentToken }: { currentToken?: string }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    authClient.listSessions().then(({ data }) => {
      if (!live) return;
      if (data) setSessions(data);
      else setError(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const revoke = async (s: SessionRow, name: string) => {
    const { error } = await authClient.revokeSession({ token: s.token });
    if (error) return toast.error("Couldn't sign out that device.");
    setSessions((list) => list?.filter((x) => x.id !== s.id) ?? null);
    toast.success(`Signed out of ${name}`);
  };

  // Current session first, then the most recently active.
  const rows = [...(sessions ?? [])].sort(
    (a, b) =>
      Number(b.token === currentToken) - Number(a.token === currentToken) ||
      +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );

  return (
    <SettingsCard title="Devices" description="Where your account is signed in.">
      {error && <p className="py-3 text-sm text-muted-foreground">Couldn&apos;t load your devices.</p>}
      {!sessions && !error && <Skeleton className="my-3 h-10 w-full" />}
      {rows.map((s) => {
        const current = s.token === currentToken;
        const { name, icon: Icon } = describeDevice(s.userAgent ?? "");
        return (
          <SettingRow
            key={s.id}
            label={
              <span className="flex flex-wrap items-center gap-2">
                <Icon className="size-4 text-primary" /> {name}
                {current && <Badge variant="outline" className="rounded-md text-[10px]">This device</Badge>}
              </span>
            }
            hint={current ? "Active now" : `Last active ${formatDay(s.updatedAt)}`}
          >
            {!current && (
              <Button variant="ghost" size="sm" onClick={() => revoke(s, name)}>
                <LogOut /> Sign out
              </Button>
            )}
          </SettingRow>
        );
      })}
    </SettingsCard>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const errors = {
    current: !form.current && "Enter your current password.",
    next: form.next.length < 8 && "Use at least 8 characters.",
    confirm: form.confirm !== form.next && "Passwords don't match.",
  };
  const show = (key: keyof typeof errors) => (tried ? errors[key] : null);
  const set = (key: keyof typeof form) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setForm({ current: "", next: "", confirm: "" });
      setTried(false);
      setServerError("");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    setServerError("");
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    const result = await changePassword({ currentPassword: form.current, newPassword: form.next });
    setBusy(false);
    if (!result.ok) {
      return setServerError(result.error.startsWith("Incorrect") ? "Your current password is incorrect." : result.error);
    }
    close(false);
    toast.success("Password changed", { description: "Other devices were signed out." });
  };

  const fields: [keyof typeof form, string, string][] = [
    ["current", "Current password", "current-password"],
    ["next", "New password", "new-password"],
    ["confirm", "Confirm new password", "new-password"],
  ];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Other devices will be signed out.</DialogDescription>
        </DialogHeader>
        <form id="change-password" onSubmit={submit} noValidate className="space-y-3">
          {fields.map(([key, label, autoComplete]) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={`pw-${key}`} className="text-sm font-medium">
                {label}
              </label>
              <Input
                id={`pw-${key}`}
                type="password"
                autoComplete={autoComplete}
                value={form[key]}
                onChange={set(key)}
                aria-invalid={!!show(key) || undefined}
              />
              {show(key) && <p className="text-xs text-destructive">{show(key)}</p>}
            </div>
          ))}
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="change-password" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
