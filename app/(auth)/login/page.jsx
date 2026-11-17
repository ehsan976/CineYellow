import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthShell>
      {/* LoginForm reads ?next= (useSearchParams), which needs a Suspense boundary */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
