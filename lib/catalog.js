// Mock catalog: one record per title. Images come from Unsplash.

export const img = (id, w = 800, h = 450) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
export const landscape = (id) => img(id, 800, 450);
export const poster = (id) => img(id, 400, 600);
export const backdrop = (id) => img(id, 1920, 1080);

// Small deterministic hash so mock values stay stable between server and client.
const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const castPool = [
  "Aria Kapoor", "Noah Reyes", "Zara Malik", "Leo Hartman", "Mira Chen", "Omar Siddiqui",
  "Isla Novak", "Dev Sharma", "Hana Sato", "Felix Grant", "Amara Okafor", "Ravi Menon",
  "Lena Fischer", "Kenji Mori", "Sofia Alvarez", "Yusuf Demir", "Priya Nair", "Elias Ward",
];
const castFor = (id) => {
  const h = hash(id);
  return [0, 5, 11].map((step) => castPool[(h + step) % castPool.length]);
};

// [id, title, type, genres, year, rating, length, imageId, description]
// length: runtime string for movies, number of seasons for series/anime.
const rows = [
  // ---------- Movies ----------
  ["last-horizon", "The Last Horizon", "movie", ["Adventure", "Fantasy"], 2026, "13+", "2h 14m", "1519681393784-d120267933ba", "A daring expedition into an uncharted mountain range uncovers a hidden world — and a secret that changes everything."],
  ["rogue-planet", "Rogue Planet", "movie", ["Sci-Fi", "Thriller"], 2025, "13+", "1h 58m", "1462331940025-496dfbfc7564", "Stranded between stars, a five-person crew must decide who gets the last seat home."],
  ["under-neon-skies", "Under Neon Skies", "movie", ["Sci-Fi", "Romance"], 2024, "16+", "1h 47m", "1550745165-9bc0b252726f", "In a city that never sleeps, a hacker and an arcade owner fall for each other one glitch at a time."],
  ["midnight-letters", "Midnight Letters", "movie", ["Romance", "Drama"], 2025, "13+", "1h 52m", "1502920917128-1aa500764cbd", "Unsent letters found in an old bookshop lead two strangers toward a love story fifty years in the making."],
  ["dust-road", "Dust Road", "movie", ["Drama", "Adventure"], 2026, "13+", "2h 05m", "1500530855697-b586d89ba3ee", "Based on a true story: a village teacher drives across the desert to get her students to the national finals."],
  ["final-over", "The Final Over", "movie", ["Sports", "Drama"], 2025, "7+", "2h 21m", "1461896836934-ffe607ba8211", "An underdog team, one last match, and six balls that will decide a nation's pride."],
  ["silent-signal", "Silent Signal", "movie", ["Thriller", "Drama"], 2024, "16+", "1h 49m", "1494790108377-be9c29b29330", "A radio operator intercepts a message she was never meant to hear — and now someone is listening to her."],
  ["champion", "Champion", "movie", ["Sports", "Drama"], 2026, "13+", "2h 10m", "1517649763962-0c623066013b", "A retired cyclist coaches a ragtag team of teenagers through the toughest race on the continent."],
  ["full-throttle", "Full Throttle", "movie", ["Action", "Sports"], 2025, "13+", "1h 56m", "1504608524841-42fe6f032b4b", "A sim-racing champion gets one shot behind the wheel of a real race car."],
  ["ocean-bound", "Ocean Bound", "movie", ["Adventure", "Drama"], 2024, "7+", "1h 41m", "1507525428034-b723cf961d3e", "Two siblings set sail to fulfil their grandfather's final wish."],
  ["old-kingdom", "The Old Kingdom", "movie", ["Fantasy", "Adventure"], 2025, "13+", "2h 28m", "1472214103451-9374bd1c798e", "A shepherd discovers she is the heir to a kingdom that vanished from every map."],
  ["paradise-lost", "Paradise Lost", "movie", ["Drama", "Mystery"], 2024, "16+", "1h 59m", "1469474968028-56623f02e42e", "A family's dream retreat in the hills hides a past the locals refuse to talk about."],
  ["skyward", "Skyward", "movie", ["Sci-Fi", "Adventure"], 2026, "13+", "2h 02m", "1446776811953-b23d57bd21aa", "The first civilian mission to orbit goes wrong in the most spectacular way."],
  ["legends-of-fire", "Legends of Fire", "movie", ["Action", "Fantasy"], 2025, "16+", "2h 17m", "1516450360452-9312f5e86fc7", "A rock band's final tour awakens an ancient force that feeds on music."],
  ["festival-of-lights", "Festival of Lights", "movie", ["Comedy", "Drama"], 2026, "7+", "2h 08m", "1529156069898-49953e39b3ac", "Five cousins, one crumbling family home and the most chaotic festival week ever."],
  ["the-village", "The Village", "movie", ["Drama"], 2025, "13+", "1h 54m", "1507003211169-0a1dd7228f2d", "A city doctor returns to his village and finds it needs him more than he needs the city."],
  ["strange-night", "Strange Night", "movie", ["Thriller", "Crime"], 2026, "16+", "1h 46m", "1544005313-94ddf0286df2", "One night, one taxi, and a passenger who knows far too much about the driver."],
  ["jungle-world", "Jungle World", "movie", ["Adventure", "Action"], 2025, "13+", "2h 13m", "1441974231531-c6227db76b6e", "A research team goes missing deep in the rainforest. The rescue team is about to find out why."],
  ["dont-trouble-trouble", "Don't Trouble Trouble", "movie", ["Comedy", "Romance"], 2026, "13+", "1h 44m", "1488426862026-3ee34a7d66df", "A wedding planner and a professional wedding crasher keep ending up at the same parties."],
  ["the-breach", "The Breach", "movie", ["Sci-Fi", "Action"], 2025, "16+", "1h 51m", "1451187580459-43490279c0fa", "When the global network goes dark, one engineer holds the only key to turn it back on."],
  ["life-once-more", "Life Once More", "movie", ["Comedy", "Drama"], 2024, "13+", "2h 35m", "1522202176988-66273c2fd55f", "Three old friends take the road trip they promised each other twenty years ago."],
  ["lost-ladies", "Lost Ladies", "movie", ["Comedy", "Drama"], 2024, "13+", "2h 04m", "1517841905240-472988babdf9", "Two brides get swapped on a crowded train, and both their lives change for the better."],
  ["total-chaos-3", "Total Chaos 3", "movie", ["Comedy", "Action"], 2023, "13+", "2h 20m", "1511632765486-a01980e01a18", "The gang is back, the stakes are higher, and the plan is somehow even worse."],
  ["the-return", "The Return", "movie", ["Drama", "Comedy"], 2023, "13+", "2h 18m", "1539571696357-5a69c17a67c6", "A failed musician moves back home and accidentally becomes the town's wedding singer."],
  ["night-drive", "Night Drive", "movie", ["Action", "Crime"], 2025, "16+", "1h 39m", "1492144534655-ae79c964c9d7", "A getaway driver's last job turns into a city-wide chase before sunrise."],
  ["frozen-peaks", "Frozen Peaks", "movie", ["Documentary", "Adventure"], 2026, "7+", "1h 33m", "1464822759023-fed622ff2c3b", "Climbers attempt the most dangerous winter ascent ever filmed."],
  ["sail-away", "Sail Away", "movie", ["Drama", "Romance"], 2025, "13+", "2h 11m", "1516035069371-29a1b244cc32", "A photographer and a fisherman's daughter chase one perfect shot along the coast."],
  ["dorothy", "Dorothy", "movie", ["Comedy", "Drama"], 2025, "13+", "2h 01m", "1485846234645-a62644f84728", "A small-town film crew tries to finish their first movie with no money and lots of heart."],
  ["sigma", "Sigma", "movie", ["Thriller", "Crime"], 2026, "16+", "2h 09m", "1555066931-4365d14bab8c", "A coder discovers her app is being used to plan the perfect heist."],
  ["window-seat", "Window Seat", "movie", ["Drama"], 2024, "13+", "1h 57m", "1504384308090-c894fdcc538d", "A burned-out office worker starts a new life from one small desk by the window."],
  ["blast", "Blast", "movie", ["Action", "Thriller"], 2025, "16+", "2h 15m", "1542751371-adc38448a05e", "A pro gamer is pulled into a real-life mission that plays out like his favourite game."],
  ["cinema-hall", "Cinema Hall", "movie", ["Comedy", "Drama"], 2024, "7+", "1h 48m", "1440404653325-ab127d49abc1", "The staff of a single-screen theatre fight to save it from closing down."],

  // ---------- Series ----------
  ["city-of-echoes", "City of Echoes", "series", ["Thriller", "Crime", "Mystery"], 2026, "16+", 2, "1514565131-fce0801e5785", "Every street remembers. One detective is about to listen."],
  ["silent-truth", "The Silent Truth", "series", ["Horror", "Mystery"], 2025, "18+", 1, "1509248961158-e54f6934749c", "A small town's annual carnival returns — and so do the people who vanished at the last one."],
  ["comedy-hour", "The Comedy Hour", "series", ["Comedy"], 2026, "13+", 4, "1493225457124-a3eb161ffa5f", "The country's funniest stand-up comics take the stage every week in front of a live crowd."],
  ["cursed-temple", "Cursed Temple", "series", ["Horror", "Fantasy"], 2026, "18+", 1, "1518709268805-4e9042af9f23", "Archaeologists open a sealed temple. Something inside has been waiting."],
  ["circle-of-fate", "Circle of Fate", "series", ["Drama", "Thriller"], 2026, "16+", 1, "1531746020798-e6953c6e8e04", "Three strangers keep waking up in each other's lives."],
  ["warrior-king", "Warrior King", "series", ["Action", "Fantasy"], 2026, "16+", 2, "1501785888041-af3ef285b470", "A banished prince builds an army in the mountains to reclaim his throne."],
  ["little-hero", "Little Hero", "series", ["Comedy", "Adventure"], 2025, "7+", 5, "1511512578047-dfb367046420", "A gamer kid gets sucked into his console and has to save the day — before dinner."],
  ["whispers-woods", "Whispers in the Woods", "series", ["Mystery", "Horror"], 2025, "16+", 3, "1470071459604-3b5ec3a7fe05", "Hikers who enter the fog come back different. Nobody knows why."],
  ["ember", "Ember", "series", ["Drama", "Thriller"], 2026, "16+", 1, "1534528741775-53994a69daeb", "A firefighter suspects the fires in her city are being set to send her a message."],
  ["dead-end-job", "Dead-End Job", "series", ["Comedy", "Drama"], 2026, "16+", 1, "1500648767791-00dcc994a43e", "A funeral home intern discovers he's surprisingly good at the job."],
  ["neon-hearts", "Neon Hearts", "series", ["Romance", "Drama"], 2025, "13+", 2, "1501281668745-f7f57925c3b4", "Love, rivalry and late-night gigs in the city's music scene."],
  ["northern-lights", "Northern Lights", "series", ["Documentary", "Adventure"], 2025, "7+", 2, "1502134249126-9f3755a50d78", "A stunning journey to the planet's darkest skies."],
  ["faces", "Faces", "series", ["Drama"], 2024, "16+", 1, "1524504388940-b1c1722653e1", "Eight portraits, eight lives, one photographer who ties them all together."],
  ["wild-hearts", "Wild Hearts", "series", ["Romance", "Adventure"], 2025, "13+", 2, "1473448912268-2022ce9509d8", "Two rival park rangers are forced to share a cabin for one long winter."],
  ["the-investigator", "The Investigator", "series", ["Crime", "Mystery"], 2026, "16+", 3, "1506794778202-cad84cf45f1d", "A retired detective takes the cases no one else will touch."],
  ["last-element", "The Last Element", "series", ["Fantasy", "Adventure"], 2026, "7+", 2, "1534447677768-be436bb09401", "A young sky-reader must unite four lost tribes before the stars go out."],
  ["love-in-paris", "Love in Paris", "series", ["Romance", "Comedy"], 2025, "13+", 4, "1520813792240-56fc4a3765a7", "A marketing intern moves to Paris and gets far more than a job."],
  ["sweet-summer", "Sweet Summer", "series", ["Romance", "Drama"], 2026, "13+", 3, "1500964757637-c85e8a162699", "One summer in a seaside town changes four friends forever."],
  ["code-red", "Code Red", "series", ["Thriller", "Sci-Fi"], 2025, "16+", 1, "1526374965328-7f61d4dc18c5", "A cyber-security team has 24 hours to stop an attack on the city's power grid."],
  ["village-tales", "Village Tales", "series", ["Comedy", "Drama"], 2024, "7+", 2, "1472099645785-5658abf4ff4e", "Heart-warming stories from the quirkiest village in the country."],

  // ---------- Anime ----------
  ["neon-ronin", "Neon Ronin", "anime", ["Action", "Sci-Fi"], 2026, "16+", 2, "1542051841857-5f90071e7989", "In a neon-lit future Tokyo, a masterless swordsman protects the city's forgotten streets."],
  ["akiba-nights", "Akiba Nights", "anime", ["Comedy", "Romance"], 2025, "13+", 1, "1551641506-ee5bf4cb45f1", "A shy game-shop clerk and a famous streamer team up for the city's biggest tournament."],
  ["spirit-of-fuji", "Spirit of Fuji", "anime", ["Fantasy", "Adventure"], 2026, "7+", 3, "1490806843957-31f4c9a91c65", "A girl who can talk to mountain spirits sets out to heal a dying forest."],
  ["sakura-promise", "Sakura Promise", "anime", ["Romance", "Drama"], 2025, "13+", 1, "1522383225653-ed111181a951", "Two childhood friends promised to meet again when the cherry trees bloom."],
  ["temple-guardians", "Temple Guardians", "anime", ["Action", "Fantasy"], 2026, "13+", 2, "1493976040374-85c8e12f0c0e", "Teen monks train to defend an ancient temple from demons of the old world."],
  ["tokyo-drift-zero", "Tokyo Drift Zero", "anime", ["Action", "Sports"], 2025, "13+", 1, "1540959733332-eab4deabeeaf", "Street racers battle across Tokyo's highways for the title of Zero."],
  ["lanterns-of-kyoto", "Lanterns of Kyoto", "anime", ["Mystery", "Fantasy"], 2026, "13+", 1, "1545569341-9eb8b30979d9", "Every lantern in old Kyoto holds a soul. One has gone missing."],
  ["city-of-rain", "City of Rain", "anime", ["Drama", "Mystery"], 2024, "16+", 1, "1503899036084-c55cdd92da26", "It has rained for 300 days. A detective searches for the girl who stopped the sun."],
  ["crimson-academy", "Crimson Peak Academy", "anime", ["Comedy", "Fantasy"], 2025, "13+", 2, "1528164344705-47542687000d", "A magic school at the foot of a mountain, and the worst student it has ever had."],
  ["shibuya-signal", "Shibuya Signal", "anime", ["Sci-Fi", "Thriller"], 2026, "16+", 1, "1536098561742-ca998e48cbcc", "Strange signals on Shibuya's screens are rewriting people's memories."],
  ["paper-moon-cafe", "Paper Moon Café", "anime", ["Comedy", "Romance"], 2024, "7+", 2, "1480796927426-f609979314bd", "A tiny café where every customer brings a story — and the barista is a fox spirit."],
];

export const titles = rows.map(
  ([id, title, type, genres, year, rating, length, imageId, description], index) => ({
    id,
    title,
    type,
    genres,
    year,
    rating,
    duration: type === "movie" ? length : null,
    seasons: type === "movie" ? null : length,
    imageId,
    image: landscape(imageId),
    poster: poster(imageId),
    backdrop: backdrop(imageId),
    description,
    cast: castFor(id),
    match: 80 + (hash(id) % 19),
    popularity: rows.length - index,
  })
);

const byId = new Map(titles.map((t) => [t.id, t]));

export const typeLabels = { movie: "Movie", series: "Series", anime: "Anime" };

export function getTitle(id) {
  return byId.get(id);
}

export function getByType(type) {
  return titles.filter((t) => t.type === type);
}

export function genresFor(type) {
  const list = type ? getByType(type) : titles;
  return [...new Set(list.flatMap((t) => t.genres))].sort();
}

export function searchTitles(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return titles
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.genres.some((g) => g.toLowerCase().includes(q)) ||
        t.cast.some((c) => c.toLowerCase().includes(q)) ||
        typeLabels[t.type].toLowerCase().includes(q)
    )
    .sort((a, b) => {
      // Title matches first
      const am = a.title.toLowerCase().includes(q) ? 0 : 1;
      const bm = b.title.toLowerCase().includes(q) ? 0 : 1;
      return am - bm || b.popularity - a.popularity;
    });
}

export function similarTitles(id, limit = 9) {
  const base = getTitle(id);
  if (!base) return [];
  return titles
    .filter((t) => t.id !== id)
    .map((t) => ({
      t,
      score:
        t.genres.filter((g) => base.genres.includes(g)).length * 2 + (t.type === base.type ? 1 : 0),
    }))
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score || b.t.popularity - a.t.popularity)
    .slice(0, limit)
    .map((x) => x.t);
}

const episodeNames = [
  "The Beginning", "Echoes", "No Way Back", "The Stranger", "Fault Lines", "Into the Dark",
  "Old Friends", "The Deal", "Crossroads", "Breaking Point", "Ghosts", "Homecoming",
];
const episodeSummaries = [
  "A surprising discovery sets everything in motion, and nothing will be the same again.",
  "Old secrets resurface while an unexpected ally offers help — at a price.",
  "Trust is tested when a plan goes sideways and someone has to take the blame.",
  "A race against time forces an impossible choice between two people.",
  "New clues point somewhere no one wanted to look.",
  "Tensions boil over and a long-buried truth finally comes out.",
  "A quiet moment turns into the most dangerous night yet.",
  "Everything leads to a confrontation that changes the rules of the game.",
];
const episodeImages = [
  "1477959858617-67f85cf4f1df", "1519501025264-65ba15a82390", "1506905925346-21bda4d32df4",
  "1489599849927-2ee91cede3ba", "1536440136628-849c177e76a1", "1478720568477-152d9b164e26",
  "1438761681033-6461ffad8d80", "1502134249126-9f3755a50d78",
];

export function getEpisodes(title, season = 1) {
  if (!title || title.type === "movie") return [];
  const h = hash(`${title.id}-${season}`);
  const count = 6 + (h % 3); // 6–8 episodes
  return Array.from({ length: count }, (_, i) => {
    const n = (h + i * 7) % episodeNames.length;
    const imageId = i === 0 ? title.imageId : episodeImages[(h + i) % episodeImages.length];
    return {
      id: `${title.id}-s${season}e${i + 1}`,
      number: i + 1,
      name: episodeNames[n],
      runtime: `${title.type === "anime" ? 22 + ((h + i) % 4) : 40 + ((h + i * 3) % 19)}m`,
      image: img(imageId, 320, 180),
      summary: episodeSummaries[(h + i * 5) % episodeSummaries.length],
    };
  });
}

export function metaLine(t) {
  return t.type === "movie" ? t.duration : `${t.seasons} Season${t.seasons > 1 ? "s" : ""}`;
}
