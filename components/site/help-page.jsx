"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CreditCard, Keyboard, Mail, Search, Settings, User, Bookmark } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { contactTopics, faqs, helpCategories, shortcuts } from "@/lib/help";
import { PageHeading, SettingsCard } from "@/components/site/settings-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const quickLinks = [
  { href: "/account", label: "Account & plan", icon: CreditCard },
  { href: "/settings", label: "Playback settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/my-list", label: "My List", icon: Bookmark },
];

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const q = query.trim().toLowerCase();
  const visible = faqs.filter(
    (f) =>
      (category === "all" || f.category === category) &&
      (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  );

  return (
    <>
      <PageHeading title="Help Center" description="Answers to common questions, player shortcuts, and a way to reach us." />

      {/* Search */}
      <div className="relative mb-6 max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help — e.g. subtitles, quality, plan"
          aria-label="Search help articles"
          className="h-12 rounded-full pl-11 text-base"
        />
      </div>

      {/* Quick links */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl bg-card p-4 font-medium ring-1 ring-foreground/10 transition hover:ring-primary"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Icon className="size-4" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      {/* Heading + topic filter sit above the grid so the FAQ list and the side cards start on the same line */}
      <h2 id="faq-heading" className="mb-4 text-xl font-bold md:text-2xl">
        Frequently asked questions
      </h2>
      <ToggleGroup
        type="single"
        value={category}
        onValueChange={(v) => v && setCategory(v)}
        aria-label="Filter by topic"
        className="mb-5 w-full flex-wrap justify-start"
      >
        {[{ id: "all", label: "All" }, ...helpCategories].map((c) => (
          <ToggleGroupItem
            key={c.id}
            value={c.id}
            className="h-8 rounded-full border border-border px-3.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* FAQ */}
        <section aria-labelledby="faq-heading">
          {visible.length ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {visible.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
              No answers match &ldquo;{query}&rdquo;.{" "}
              <a href="#contact" className="font-medium text-primary hover:underline">
                Ask us directly
              </a>
              .
            </p>
          )}
        </section>

        <aside className="space-y-6">
          {/* Shortcuts */}
          <SettingsCard title={<span className="flex items-center gap-2"><Keyboard className="size-5 text-primary" /> Player shortcuts</span>}>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 py-1 text-sm">
              {shortcuts.map((s) => (
                <div key={s.action} className="contents">
                  <dt className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="min-w-7 rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="text-muted-foreground">{s.action}</dd>
                </div>
              ))}
            </dl>
          </SettingsCard>

          <ContactForm />
        </aside>
      </div>
    </>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: contactTopics[0], message: "" });
  const [tried, setTried] = useState(false);
  const errors = {
    name: !form.name.trim() && "Enter your name.",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && "Enter a valid email address.",
    message: form.message.trim().length < 10 && "Tell us a bit more (at least 10 characters).",
  };
  const invalid = Object.values(errors).some(Boolean);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const show = (key) => tried && errors[key];

  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    toast.success("Message sent", { description: `We'll reply to ${form.email.trim()} — demo only for now.` });
    setForm({ name: "", email: "", topic: contactTopics[0], message: "" });
    setTried(false);
  };

  return (
    <div id="contact" className="scroll-mt-24">
      <SettingsCard title={<span className="flex items-center gap-2"><Mail className="size-5 text-primary" /> Contact us</span>} description="Didn't find an answer? Send us a message.">
        <form onSubmit={submit} noValidate className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="help-name">Name</Label>
            <Input id="help-name" value={form.name} onChange={set("name")} aria-invalid={show("name") ? true : undefined} />
            {show("name") && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-email">Email</Label>
            <Input id="help-email" type="email" value={form.email} onChange={set("email")} aria-invalid={show("email") ? true : undefined} />
            {show("email") && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-topic">Topic</Label>
            <Select value={form.topic} onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}>
              <SelectTrigger id="help-topic" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {contactTopics.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-message">Message</Label>
            <textarea
              id="help-message"
              rows={4}
              value={form.message}
              onChange={set("message")}
              aria-invalid={show("message") ? true : undefined}
              className={cn(
                "w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors dark:bg-input/30",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              )}
              placeholder="What happened? Which title or episode?"
            />
            {show("message") && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>
          <Button type="submit" className="w-full">
            Send message
          </Button>
        </form>
      </SettingsCard>
    </div>
  );
}
