-- Seed the video provider registry and copy legacy title_video links into video_source.
-- Additive and safe to re-run: every insert skips rows that already exist.
--
-- Providers are only hosts whose videos the site can have the rights to show: its own HLS/CDN
-- and the official players of licensed video hosts (the same list lib/videos.ts accepted before).
-- Hosts match a hostname or any subdomain of it; an empty list means any https host.
INSERT INTO "video_provider" ("id", "name", "kind", "priority", "hosts", "health_method") VALUES
  ('own-hls',     'Own HLS stream',   'hls',   10, '{}',                                                     'manifest'),
  ('bunny',       'Bunny Stream',     'embed', 20, '{iframe.mediadelivery.net,player.mediadelivery.net}',    'none'),
  ('cloudflare',  'Cloudflare Stream','embed', 20, '{iframe.videodelivery.net,cloudflarestream.com}',        'none'),
  ('mux',         'Mux',              'embed', 20, '{player.mux.com}',                                       'none'),
  ('youtube',     'YouTube',          'embed', 50, '{youtube.com,youtube-nocookie.com,youtu.be}',            'oembed'),
  ('vimeo',       'Vimeo',            'embed', 50, '{vimeo.com}',                                            'oembed'),
  ('dailymotion', 'Dailymotion',      'embed', 60, '{dailymotion.com,dai.ly}',                               'oembed')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Titles that have legacy videos (only well-formed ids: "movie-550", "tv-1399").
INSERT INTO "title" ("id", "media", "tmdb_id", "name")
SELECT DISTINCT ON (tv."title_id")
  tv."title_id",
  split_part(tv."title_id", '-', 1),
  split_part(tv."title_id", '-', 2)::integer,
  tv."title_name"
FROM "title_video" tv
WHERE tv."title_id" ~ '^(movie|tv)-[0-9]{1,9}$'
ORDER BY tv."title_id", tv."updated_at" DESC
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Each legacy link becomes a manual, locked source (an admin made it; automation must not touch it).
INSERT INTO "video_source" (
  "title_id", "season", "episode", "provider_id", "kind", "url", "origin", "locked", "status", "priority",
  "subtitles", "intro_start", "intro_end", "credits_at", "created_by", "created_at", "updated_at"
)
SELECT
  tv."title_id", tv."season", tv."episode",
  CASE
    WHEN tv."kind" = 'hls' THEN 'own-hls'
    WHEN h.host ~ '(^|\.)(mediadelivery\.net)$' THEN 'bunny'
    WHEN h.host ~ '(^|\.)(videodelivery\.net|cloudflarestream\.com)$' THEN 'cloudflare'
    WHEN h.host ~ '(^|\.)mux\.com$' THEN 'mux'
    WHEN h.host ~ '(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$' THEN 'youtube'
    WHEN h.host ~ '(^|\.)vimeo\.com$' THEN 'vimeo'
    WHEN h.host ~ '(^|\.)(dailymotion\.com|dai\.ly)$' THEN 'dailymotion'
  END,
  tv."kind", tv."url", 'manual', true, 'active', 100,
  tv."subtitles", tv."intro_start", tv."intro_end", tv."credits_at", tv."created_by", tv."created_at", tv."updated_at"
FROM "title_video" tv
CROSS JOIN LATERAL (SELECT lower(substring(tv."url" from '^https://([^/:?#]+)')) AS host) h
WHERE tv."title_id" ~ '^(movie|tv)-[0-9]{1,9}$'
  -- Embeds from a host that isn't a provider any more are left behind (they were already ignored).
  AND (tv."kind" = 'hls' OR h.host ~ '(^|\.)(mediadelivery\.net|videodelivery\.net|cloudflarestream\.com|mux\.com|youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|dailymotion\.com|dai\.ly)$')
ON CONFLICT ON CONSTRAINT "video_source_url_uq" DO NOTHING;
