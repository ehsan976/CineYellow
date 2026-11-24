import { Suspense } from "react";
import { redirect } from "next/navigation";

import { motn } from "@/lib/motn/config";
import { requireAdmin } from "@/lib/server/dal";
import { listTitleLanguages, type StatusFilter } from "@/lib/server/title-languages";
import { PageHeading } from "@/components/account/settings-ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { TitleLanguagesAdmin } from "@/components/admin/title-languages-admin";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Admin · Languages" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function LanguagesAdminPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 pt-24 pb-8 md:px-10">
      <PageHeading
        title="Admin"
        description="Audio and subtitle languages per title. New titles are filled in from Movie of the Night (India); check them and mark them verified."
      />
      <AdminNav />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <LanguagesContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LanguagesContent({ searchParams }: Props) {
  // proxy.ts already keeps non-admins out of /admin; this re-checks the role in the database.
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }
  const params = await searchParams;
  const statusParam = first(params.status);
  const status: StatusFilter = statusParam === "verified" || statusParam === "all" ? statusParam : "unverified";
  const q = first(params.q).slice(0, 100);
  const page = Math.min(Math.max(1, Number.parseInt(first(params.page), 10) || 1), 1000);
  const data = await listTitleLanguages({ status, q, page });
  return <TitleLanguagesAdmin {...data} status={status} q={q} motnEnabled={motn.enabled} />;
}
