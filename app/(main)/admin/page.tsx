import { Suspense } from "react";
import { redirect } from "next/navigation";

import { billingEnabled } from "@/lib/payments/config";
import { requireAdmin } from "@/lib/server/dal";
import { AdminPage } from "@/components/admin/admin-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Admin" };

export default function Admin() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 pt-24 pb-8 md:px-10">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  // proxy.ts keeps non-admins out using the session cookie cache (up to 5 minutes old); this
  // re-checks the role and ban flag in the database, like the other admin pages. Every admin API
  // call is also checked again by Better Auth's admin plugin.
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }
  return <AdminPage billing={billingEnabled} />;
}
