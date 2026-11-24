import { connection } from "next/server";
import { BadgeCheck, Languages } from "lucide-react";

import { languageName } from "@/lib/languages";
import { getTitleLanguages } from "@/lib/server/title-languages";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_SUBTITLES = 12;

/**
 * Audio and subtitle languages for the title page (from Postgres; Movie of the Night on the first
 * visit). Renders at request time only, so builds never call the API or write to the database.
 */
export async function TitleLanguages({ titleId, name, imdbId }: { titleId: string; name: string; imdbId: string | null }) {
  await connection();
  const data = await getTitleLanguages({ id: titleId, name, imdbId });
  const hasAny = Boolean(data && (data.audio.length || data.subtitles.length));

  return (
    <section aria-labelledby="languages-heading" className="border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id="languages-heading" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Languages className="size-4" /> Languages
        </h3>
        {hasAny &&
          (data.status === "verified" ? (
            <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
              <BadgeCheck className="size-3.5" /> Verified
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">Auto-detected</span>
          ))}
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">Language details coming soon.</p>
      ) : (
        <dl className="space-y-3 text-sm">
          {data.audio.length > 0 && <LanguageList label="Audio" codes={data.audio} />}
          {data.subtitles.length > 0 && <LanguageList label="Subtitles" codes={data.subtitles} limit={MAX_SUBTITLES} />}
        </dl>
      )}
    </section>
  );
}

function LanguageList({ label, codes, limit }: { label: string; codes: string[]; limit?: number }) {
  const shown = limit ? codes.slice(0, limit) : codes;
  const more = codes.length - shown.length;
  return (
    <div>
      <dt className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {shown.map((code) => (
          <Badge key={code} variant="outline" title={code}>
            {languageName(code)}
          </Badge>
        ))}
        {more > 0 && (
          <Badge variant="outline" className="text-muted-foreground" title={codes.slice(shown.length).map(languageName).join(", ")}>
            +{more} more
          </Badge>
        )}
      </dd>
    </div>
  );
}

export function LanguagesSkeleton() {
  return (
    <div className="space-y-2 border-t border-border pt-3" aria-busy="true" aria-label="Loading languages">
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}
