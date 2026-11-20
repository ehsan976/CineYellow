"use client";

import type { PlanId } from "@/lib/types";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { plans } from "@/lib/stores/account-store";
import { payForPlan } from "@/lib/stores/payment-store";
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

/** One month of a plan through ZurvaPay's hosted checkout (JazzCash, EasyPaisa or Raast QR). */
export function PaymentDialog({ plan, onClose }: { plan: PlanId | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const info = plan ? plans[plan] : null;

  const close = () => {
    if (!busy) onClose();
  };

  const pay = async () => {
    if (!plan) return;
    setBusy(true);
    // On success the browser is already leaving for ZurvaPay's checkout page.
    const result = await payForPlan(plan);
    if (!result.ok) {
      setBusy(false);
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {info?.name} plan · {info?.price}
          </DialogTitle>
          <DialogDescription>One payment gives 30 days. Pay again any time to add another month.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• {info?.quality}</li>
          <li>• {info?.screens} screen{info && info.screens > 1 ? "s" : ""} at a time</li>
        </ul>

        <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          You&apos;ll pay on ZurvaPay&apos;s secure checkout page with JazzCash, EasyPaisa or Raast QR. Your wallet details are never entered on CineYellow.
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={pay} disabled={busy || !plan}>
            {busy && <Loader2 className="animate-spin" />} Continue to ZurvaPay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
