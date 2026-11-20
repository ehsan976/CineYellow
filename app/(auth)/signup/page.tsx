import { Suspense } from "react";

import { googleEnabled } from "@/lib/auth/server";
import { billingEnabled } from "@/lib/payments/config";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignupForm googleEnabled={googleEnabled} billingEnabled={billingEnabled} />
      </Suspense>
    </AuthShell>
  );
}
