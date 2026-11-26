import { Suspense } from "react";
import { notFound } from "next/navigation";

import { passwordResetEnabled } from "@/lib/server/email";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  // Production without SMTP set up: no way to deliver the link (the login page hides the link too).
  if (!passwordResetEnabled) notFound();
  return (
    <AuthShell>
      {/* The form reads ?email= (useSearchParams), which needs a Suspense boundary */}
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
