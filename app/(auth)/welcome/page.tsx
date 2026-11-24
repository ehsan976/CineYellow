import { getPosterWall, getTopPicks } from "@/lib/tmdb/home";
import { LandingPage } from "@/components/auth/landing-page";

export const metadata = {
  title: { absolute: "CineYellow — Watch movies, series and anime online" },
  description: "Unlimited movies, series, anime and more. Plans start at $6.99. Cancel anytime.",
};

export default async function WelcomePage() {
  const [posters, trending] = await Promise.all([getPosterWall(), getTopPicks(10)]);
  return <LandingPage posters={posters} trending={trending} />;
}
