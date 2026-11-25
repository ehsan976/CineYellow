// Vitest runs outside Next.js, where "server-only" would throw on import. The real guard still
// applies in the app build; tests only exercise pure functions from those modules.
export {};
