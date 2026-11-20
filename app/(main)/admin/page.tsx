import { billingEnabled } from "@/lib/payments/config";
import { AdminPage } from "@/components/admin/admin-page";

export const metadata = { title: "Admin" };

// proxy.ts only lets users with the "admin" role open this page, and every admin API call
// is checked again on the server by Better Auth's admin plugin.
export default function Admin() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 pt-24 pb-8 md:px-10">
      <AdminPage billing={billingEnabled} />
    </main>
  );
}
