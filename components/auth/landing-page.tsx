"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, MonitorSmartphone, Plus, Smile, Tv } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTitle } from "@/lib/data/catalog";
import { trendingRows } from "@/lib/data/content";
import { plans } from "@/lib/stores/account-store";
import { BrandLogo, MarketingFooter } from "@/components/auth/marketing";
import { PosterWall } from "@/components/auth/poster-wall";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Mix of today's top movies and series
const trending = [0, 1, 2, 3, 4]
  .flatMap((i) => [trendingRows[1].items[i], trendingRows[0].items[i]])
  .map((item) => getTitle(item.titleId))
  .filter(Boolean)
  .slice(0, 10);

const reasons = [
  { title: "Enjoy on your TV", text: "Watch on smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players and more.", icon: Tv },
  { title: "Watch offline", text: "Save your favourites to My List and always have something to watch.", icon: Download },
  { title: "Watch everywhere", text: "Stream unlimited movies, series and anime on your phone, tablet, laptop and TV.", icon: MonitorSmartphone },
  { title: "Create profiles for kids", text: "Send kids on adventures with their favourite characters in a space made just for them.", icon: Smile },
];

const faqs = [
  {
    q: "What is CineYellow?",
    a: "CineYellow is a streaming service with movies, series and anime. Watch as much as you want, whenever you want — with audio and subtitles in many languages.",
  },
  {
    q: "How much does CineYellow cost?",
    a: `Plans start at ${plans.basic.price} a month. Standard is ${plans.standard.price} and Premium (4K, four screens at once) is ${plans.premium.price}. Switch or cancel any time from your Account page.`,
  },
  {
    q: "Where can I watch?",
    a: "Watch in your browser on any computer, phone, tablet or smart TV. Sign in with your account and your profiles, My List and Continue Watching follow you everywhere.",
  },
  {
    q: "How do I cancel?",
    a: "There's no contract. Change or cancel your plan in two clicks from Account → Plan.",
  },
  {
    q: "What can I watch on CineYellow?",
    a: "Blockbuster movies, binge-worthy series, true stories, documentaries and a big anime collection — with new titles added every week.",
  },
  {
    q: "Is CineYellow good for kids?",
    a: "Yes. Create a Kids profile that only shows titles rated 7+. Parents can turn it on or off any time from Profile.",
  },
];

/** Email + Get Started, as in the hero and at the bottom of the page. */
function EmailSignup({ id }: { id: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const invalid = tried && !isEmail(email);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!isEmail(email)) return;
        router.push(`/signup?email=${encodeURIComponent(email.trim())}`);
      }}
      className="mx-auto w-full max-w-xl"
    >
      <p className="mb-4 text-base text-white/90 sm:text-lg">Ready to watch? Enter your email to create or restart your membership.</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="relative w-full flex-1">
          <input
            id={id}
            type="email"
            autoComplete="email"
            placeholder=" "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={invalid || undefined}
            className={cn(
              "peer h-14 w-full rounded-md border border-white/40 bg-black/60 px-4 pt-5 pb-1.5 text-base text-white outline-none backdrop-blur-sm transition",
              "focus:border-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black aria-invalid:border-red-500"
            )}
          />
          <label
            htmlFor={id}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-white/70 transition-all peer-focus:top-4 peer-focus:text-xs peer-not-placeholder-shown:top-4 peer-not-placeholder-shown:text-xs"
          >
            Email address
          </label>
          {invalid && <p className="mt-1.5 text-left text-sm text-red-500">Please enter a valid email address.</p>}
        </div>
        <button
          type="submit"
          className="flex h-14 shrink-0 items-center gap-2 rounded-md bg-primary px-6 text-xl font-bold text-primary-foreground transition hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none sm:text-2xl"
        >
          Get Started <ChevronRight className="size-6" />
        </button>
      </div>
    </form>
  );
}

export function LandingPage() {
  const [open, setOpen] = useState(null);

  return (
    <div className="bg-black text-white">
      {/* Hero */}
      <section className="relative flex min-h-[640px] flex-col sm:min-h-[700px] lg:min-h-[86svh]">
        <PosterWall className="absolute inset-0" />
        <div aria-hidden className="absolute inset-0 bg-black/60" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-black/90 via-black/30 to-black/95" />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 lg:px-36">
          <BrandLogo />
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            Sign In
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
          <h1 className="max-w-3xl text-4xl leading-tight font-black tracking-tight sm:text-5xl lg:text-6xl">
            Unlimited movies, series, anime and more
          </h1>
          <p className="mt-4 text-lg font-semibold sm:text-xl">Starts at {plans.basic.price}. Cancel anytime.</p>
          <div className="mt-8 w-full">
            <EmailSignup id="hero-email" />
          </div>
        </div>
      </section>

      {/* Glowing curve between the hero and the rest (Netflix-style) */}
      <div aria-hidden className="relative z-10 -mt-14 h-28 overflow-hidden">
        <div className="absolute inset-x-[-10%] top-6 h-64 rounded-[50%] border-t-4 border-primary bg-linear-to-b from-primary/25 via-black to-black shadow-[0_-12px_60px_-8px] shadow-primary/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] space-y-16 px-5 pb-20 sm:px-10">
        {/* Trending Now */}
        <section aria-labelledby="trending-heading">
          <h2 id="trending-heading" className="mb-4 text-xl font-bold sm:text-2xl">
            Trending Now
          </h2>
          <Carousel opts={{ align: "start", dragFree: true, slidesToScroll: "auto" }} className="group/row">
            <CarouselContent className="-ml-3 py-2">
              {trending.map((t, i) => (
                <CarouselItem key={t.id} className="basis-[46%] pl-3 sm:basis-[30%] md:basis-1/4 lg:basis-1/5">
                  <Link href="/signup" aria-label={`${i + 1}. ${t.title} — sign up to watch`} className="group/card relative flex justify-end">
                    <span
                      aria-hidden
                      style={{ WebkitTextStroke: "3px rgb(255 255 255 / 0.9)", color: "#000" }}
                      className="pointer-events-none absolute bottom-0 left-0 z-10 text-[6.5rem] leading-[0.78] font-black tracking-[-0.08em] sm:text-[8rem]"
                    >
                      {i + 1}
                    </span>
                    <span className="relative block aspect-2/3 w-[78%] overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 group-hover/card:scale-105 group-hover/card:ring-2 group-hover/card:ring-primary">
                      <Image src={t.poster} alt="" fill sizes="(max-width: 640px) 40vw, 16vw" className="object-cover" />
                      <span className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                      {/* right-aligned so the big number doesn't cover it */}
                      <span className="absolute right-2 bottom-2 left-[30%] text-right text-sm leading-tight font-black uppercase">{t.title}</span>
                    </span>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-3 hidden size-10 border-0 bg-white/15 text-white hover:bg-white/30 disabled:opacity-0 md:flex" />
            <CarouselNext className="-right-3 hidden size-10 border-0 bg-white/15 text-white hover:bg-white/30 disabled:opacity-0 md:flex" />
          </Carousel>
        </section>

        {/* More Reasons to Join */}
        <section aria-labelledby="reasons-heading">
          <h2 id="reasons-heading" className="mb-4 text-xl font-bold sm:text-2xl">
            More Reasons to Join
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ title, text, icon: Icon }) => (
              <article
                key={title}
                className="relative flex min-h-[230px] flex-col rounded-2xl bg-linear-to-br from-[#1f1d14] via-[#16150f] to-[#1d120a] p-5 ring-1 ring-white/5 lg:min-h-[290px]"
              >
                <h3 className="text-xl leading-tight font-bold sm:text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{text}</p>
                <span className="mt-auto ml-auto flex size-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-orange-500 text-black shadow-[0_0_40px] shadow-primary/40">
                  <Icon className="size-8" />
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-8">
          <h2 id="faq-heading" className="mb-4 text-xl font-bold sm:text-2xl">
            Frequently Asked Questions
          </h2>
          <ul className="space-y-2">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 bg-neutral-800 px-6 py-6 text-left text-lg transition-colors hover:bg-neutral-700 sm:text-2xl"
                    >
                      {f.q}
                      <Plus className={cn("size-8 shrink-0 font-light transition-transform duration-300 sm:size-10", isOpen && "rotate-45")} strokeWidth={1.25} />
                    </button>
                  </h3>
                  <div
                    id={`faq-${i}`}
                    role="region"
                    hidden={!isOpen}
                    className="mt-px bg-neutral-800 px-6 py-6 text-lg leading-relaxed sm:text-2xl"
                  >
                    {f.a}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="text-center">
          <EmailSignup id="footer-email" />
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
