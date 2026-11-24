// The parts of TMDB's responses we read. Everything is optional: TMDB omits fields freely.

export interface TmdbListItem {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_language?: string;
  origin_country?: string[];
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
  adult?: boolean;
  /** Person results in /search/multi */
  known_for?: TmdbListItem[];
}

export interface TmdbList {
  page?: number;
  results?: TmdbListItem[];
  total_pages?: number;
  total_results?: number;
}

interface TmdbCastMember {
  name?: string;
  order?: number;
}

export interface TmdbDetails extends Omit<TmdbListItem, "genre_ids"> {
  genres?: { id: number; name: string }[];
  original_title?: string;
  original_name?: string;
  tagline?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: { season_number: number; episode_count?: number }[];
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  credits?: { cast?: TmdbCastMember[] };
  aggregate_credits?: { cast?: TmdbCastMember[] };
  release_dates?: { results?: { iso_3166_1: string; release_dates?: { certification?: string; type?: number }[] }[] };
  content_ratings?: { results?: { iso_3166_1: string; rating?: string }[] };
  recommendations?: TmdbList;
  similar?: TmdbList;
  videos?: { results?: TmdbVideo[] };
  /** append_to_response=watch/providers (JustWatch data), keyed by country code. */
  "watch/providers"?: { results?: Record<string, TmdbWatchRegion> };
}

export interface TmdbProvider {
  provider_id: number;
  provider_name?: string;
  logo_path?: string | null;
  display_priority?: number;
}

export interface TmdbWatchRegion {
  link?: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbVideo {
  key: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  iso_639_1?: string | null;
  published_at?: string;
}

export interface TmdbEpisode {
  episode_number: number;
  name?: string;
  overview?: string;
  runtime?: number | null;
  still_path?: string | null;
}

export interface TmdbSeason {
  episodes?: TmdbEpisode[];
}

export interface TmdbGenreList {
  genres?: { id: number; name: string }[];
}
