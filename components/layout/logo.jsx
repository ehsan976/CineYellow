import Link from "next/link";
import { Play } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_20px] shadow-primary/40">
        <Play className="size-4 fill-current" />
      </span>
      <span className="text-lg">
        Cine<span className="text-primary">Yellow</span>
      </span>
    </Link>
  );
}
