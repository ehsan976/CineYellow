import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      {/* The form reads ?token= from the email link (useSearchParams), which needs a Suspense boundary */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
