// Help Center content. Replace with your CMS/API later — the page only reads these exports.

export const helpCategories = [
  { id: "start", label: "Getting started" },
  { id: "playback", label: "Playback & quality" },
  { id: "profiles", label: "Profiles & My List" },
  { id: "account", label: "Account & billing" },
  { id: "devices", label: "Devices" },
];

export const faqs = [
  {
    category: "start",
    q: "How do I start watching?",
    a: "Pick any title on the home page and press Play or Watch Now. Series start from Season 1, Episode 1, or from where you left off.",
  },
  {
    category: "start",
    q: "How do I find a specific movie or show?",
    a: "Use the search bar at the top. You can search by title, genre (for example \"Thriller\") or an actor's name. Movies, Series and Anime pages also have genre filters and sorting.",
  },
  {
    category: "start",
    q: "What does \"Continue Watching\" show?",
    a: "Everything you've started but not finished, most recent first. Click a card to resume exactly where you stopped.",
  },
  {
    category: "playback",
    q: "How do I change the video quality?",
    a: "While watching, open Settings (gear icon) → Quality and pick a resolution, or leave it on Auto. To set a default for every video, go to Settings → Video quality.",
  },
  {
    category: "playback",
    q: "How do I turn on subtitles or change the audio language?",
    a: "In the player, open the Audio & Subtitles button next to the gear. Your choice is remembered for the next episode. You can also set defaults in Settings → Audio & Subtitles.",
  },
  {
    category: "playback",
    q: "Can I skip the intro or jump to the next episode?",
    a: "Yes. A Skip Intro button appears during the opening, and a Next Episode card appears when the credits start. Autoplay can be turned off in Settings → Playback.",
  },
  {
    category: "playback",
    q: "The video keeps buffering. What can I do?",
    a: "Check your connection, then try Settings → Video quality → Data saver. Closing other apps or tabs that use the network also helps.",
  },
  {
    category: "playback",
    q: "How do I watch in picture-in-picture?",
    a: "Press the picture-in-picture button in the player, or the I key. The video keeps playing in a small window while you use other apps.",
  },
  {
    category: "profiles",
    q: "How do I switch or edit a profile?",
    a: "Click your avatar → Switch profile. To change the name, avatar color, language or turn on Kids mode, open Profile from the same menu.",
  },
  {
    category: "profiles",
    q: "How do I add something to My List?",
    a: "Press the + button on any title card, in the title popup or on the title page. Press it again (it shows a check mark) to remove it.",
  },
  {
    category: "profiles",
    q: "What is a Kids profile?",
    a: "A profile meant for children, limited to titles rated 7+. Turn it on or off in Profile → Edit profile.",
  },
  {
    category: "account",
    q: "How do I change my plan?",
    a: "Go to Account → Plan and choose Basic, Standard or Premium. The change shows on your profile right away.",
  },
  {
    category: "account",
    q: "How do I change my email or password?",
    a: "Open Account → Membership. Use Change email to update it, or Change password to get a reset link.",
  },
  {
    category: "account",
    q: "When will I be charged?",
    a: "Your next payment date is shown under Account → Membership → Payment method.",
  },
  {
    category: "devices",
    q: "How do I sign out of a device I don't use?",
    a: "Go to Account → Devices and press Sign out next to it, or use Sign out everywhere in the Danger zone.",
  },
  {
    category: "devices",
    q: "Which devices are supported?",
    a: "Any modern browser on a computer, tablet or phone. On phones you can double-tap the left or right side of the video to skip 10 seconds.",
  },
];

export const shortcuts = [
  { keys: ["Space", "K"], action: "Play / pause" },
  { keys: ["←", "→"], action: "Back / forward 10 seconds" },
  { keys: ["↑", "↓"], action: "Volume up / down" },
  { keys: ["M"], action: "Mute" },
  { keys: ["F"], action: "Fullscreen" },
  { keys: ["C"], action: "Subtitles on / off" },
  { keys: ["I"], action: "Picture-in-picture" },
  { keys: ["S"], action: "Skip intro" },
  { keys: ["N"], action: "Next episode" },
  { keys: ["<", ">"], action: "Slower / faster" },
  { keys: ["0–9"], action: "Jump to 0%–90%" },
];

export const contactTopics = ["Playback problem", "Account & billing", "Profiles & My List", "Something else"];
