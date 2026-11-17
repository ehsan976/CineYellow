"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { CircleX, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Netflix-style input: label sits inside and floats up on focus or when filled. */
export interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  invalid?: boolean;
  inputClassName?: string;
  /** Element shown inside the field on the right, e.g. the show-password button. */
  right?: ReactNode;
}

export function FloatingInput({ id, label, invalid, className, inputClassName, right, ...props }: FloatingInputProps) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        placeholder=" "
        aria-invalid={invalid || undefined}
        {...props}
        className={cn(
          "peer h-14 w-full rounded-md border border-white/40 bg-neutral-900/70 px-4 pt-5 pb-1.5 text-base text-white outline-none transition",
          "focus:border-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black",
          "aria-invalid:border-red-500 aria-invalid:focus:ring-red-500",
          right && "pr-12",
          inputClassName
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-white/65 transition-all duration-150",
          "peer-focus:top-4 peer-focus:text-xs peer-not-placeholder-shown:top-4 peer-not-placeholder-shown:text-xs"
        )}
      >
        {label}
      </label>
      {right && <div className="absolute top-1/2 right-2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

export function FloatingPassword(props: Omit<FloatingInputProps, "type" | "right">) {
  const [show, setShow] = useState(false);
  return (
    <FloatingInput
      {...props}
      type={show ? "text" : "password"}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="rounded-md p-2 text-white/70 hover:text-primary"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}

/** Netflix-style field error: red text with a circled ×. */
export function AuthError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-500">
      <CircleX className="mt-0.5 size-4 shrink-0" /> {children}
    </p>
  );
}
