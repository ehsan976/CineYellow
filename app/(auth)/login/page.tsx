import { Suspense } from "react";

import { googleEnabled } from "@/lib/auth/server";
import { passwordResetEnabled } from "@/lib/server/email";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthShell>
      {/* LoginForm reads ?next= (useSearchParams), which needs a Suspense boundary */}
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} resetEnabled={passwordResetEnabled} />
      </Suspense>
    </AuthShell>
  );
}
