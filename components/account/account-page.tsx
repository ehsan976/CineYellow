"use client";

import type { PlanId } from "@/lib/types";
import { useState } from "react";
import { Check, CreditCard, LogOut, Monitor, Smartphone, Tv } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { plans, updateAccount } from "@/lib/stores/account-store";
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

const demoDevices = [
  { id: "web", name: "This browser", detail: "Web · active now", icon: Monitor, current: true },
  { id: "tv", name: "Living room TV", detail: "Smart TV · 2 days ago", icon: Tv },
  { id: "phone", name: "Phone", detail: "Android app · last week", icon: Smartphone },
];

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/** Next monthly billing date on the same day of month as the sign-up date. */
function nextBilling(memberSince) {
  const day = new Date(`${memberSince}T00:00:00`).getDate();
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), day);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function AccountPage() {
  const { hydrated } = useApp();
  const account = useAccount();
  const [devices, setDevices] = useState(demoDevices);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!hydrated) {
    return (
      <>
        <PageHeading title="Account" />
        <SettingsSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeading title="Account" description="Membership, plan and devices." />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard title="Membership" description={`Member since ${formatDate(account.memberSince)}`}>
          {/* key: reopen the editor with the saved email after each save */}
          <EmailRow key={account.email} email={account.email} />
          <SettingRow label="Password" hint="Last changed 3 months ago">
            <Button variant="outline" onClick={() => toast("Password reset link sent", { description: account.email })}>
              Change password
            </Button>
          </SettingRow>
          <SettingRow label="Payment method" hint={`Next payment on ${nextBilling(account.memberSince)}`}>
            <span className="flex items-center gap-2 text-sm">
              <CreditCard className="size-4 text-primary" /> Visa •••• 4242
            </span>
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="Plan" description={`${account.planInfo.name} · ${account.planInfo.price}/month`}>
          <div className="grid gap-3 py-1 sm:grid-cols-3">
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
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{plan.name}</span>
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
                    disabled={current}
                    className="mt-4"
                    onClick={() => {
                      updateAccount({ plan: key as PlanId });
                      toast.success(`Plan changed to ${plan.name}`);
                    }}
                  >
                    {current ? "Your plan" : `Switch to ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard title="Devices" description="Where your account is signed in.">
          {devices.map((d) => (
            <SettingRow
              key={d.id}
              label={
                <span className="flex items-center gap-2">
                  <d.icon className="size-4 text-primary" /> {d.name}
                  {d.current && <Badge variant="outline" className="rounded-md text-[10px]">This device</Badge>}
                </span>
              }
              hint={d.detail}
            >
              {!d.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDevices((list) => list.filter((x) => x.id !== d.id));
                    toast.success(`Signed out of ${d.name}`);
                  }}
                >
                  <LogOut /> Sign out
                </Button>
              )}
            </SettingRow>
          ))}
        </SettingsCard>

        <SettingsCard title="Danger zone" className="ring-destructive/30">
          <SettingRow label="Sign out of all devices" hint="You'll need to sign in again everywhere.">
            <Button
              variant="outline"
              onClick={() => {
                setDevices((list) => list.filter((x) => x.current));
                toast.success("Signed out of all other devices");
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This would permanently delete {account.email} and all profiles. In this demo nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false);
                toast("Demo only", { description: "Account deletion will work once the API is connected." });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmailRow({ email }: { email: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  if (!editing) {
    return (
      <SettingRow label="Email" hint={email}>
        <Button variant="outline" onClick={() => setEditing(true)}>
          Change email
        </Button>
      </SettingRow>
    );
  }

  return (
    <form
      className="space-y-2 py-4 first:pt-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        updateAccount({ email: value.trim() });
        toast.success("Email updated", { description: value.trim() });
      }}
    >
      <label htmlFor="account-email" className="font-medium">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="account-email"
          type="email"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid || undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={!valid}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
      {!valid && <p className="text-xs text-destructive">Enter a valid email address.</p>}
    </form>
  );
}
