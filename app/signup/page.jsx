import { Suspense } from "react";

import { AuthShell } from "@/components/site/auth-shell";
import { SignupForm } from "@/components/site/auth-forms";

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
