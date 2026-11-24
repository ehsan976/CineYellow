"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { COMMON_LANGUAGE_CODES, languageName, normalizeLanguageCode, sortLanguages } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Pick languages: tap common ones, or type any code / name ("hin", "ta", "Urdu"). */
export function LanguagePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const selected = new Set(value);
  const options = sortLanguages([...COMMON_LANGUAGE_CODES, ...value]);

  const toggle = (code: string) =>
    onChange(selected.has(code) ? value.filter((c) => c !== code) : sortLanguages([...value, code]));

  function addTyped() {
    const raw = text.trim();
    if (!raw) return;
    const byName = options.find((c) => languageName(c).toLowerCase() === raw.toLowerCase());
    const code = byName ?? normalizeLanguageCode(raw);
    if (!code) {
      setError("Use a language code like hin, eng or ta.");
      return;
    }
    setError("");
    setText("");
    if (!selected.has(code)) onChange(sortLanguages([...value, code]));
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">
        {label} <span className="font-normal text-muted-foreground">({value.length})</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((code) => {
          const on = selected.has(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(code)}
              title={code}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary"
              )}
            >
              {languageName(code)}
              {on && <X className="size-3" />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTyped();
            }
          }}
          placeholder="Other language (code or name)"
          aria-label={`Add ${label.toLowerCase()} language`}
          className="h-8 max-w-60 text-sm"
        />
        <button
          type="button"
          onClick={addTyped}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}
