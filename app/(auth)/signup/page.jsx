import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
