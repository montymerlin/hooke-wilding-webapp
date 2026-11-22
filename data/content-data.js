/* global window */

// Curated content for the Discover archive.
// Notes:
// - YouTube items: we fetch missing titles and credits at runtime via oEmbed (with offline-safe fallbacks).
// - Dates: YouTube oEmbed does not expose publish dates; leave `date` null unless you want to curate it manually.

window.__HOOKE_CONTENT__ = {
  featured: {
    id: "featured-5vOnRAyNWIw",
    displayTitle: "Back to the Wilding Weekends",
    type: "youtube",
    url: "https://www.youtube.com/watch?v=5vOnRAyNWIw&t=8s",
    title: "Did you come to one of our Wilding Weekends",
    author: "Julia Hailes",
    tags: ["Hooke Wilding", "Featured"],
    date: null,
  },
  picks: {
    talks: ["hooke-X3m18jbvRv0", "ww-7NclmBEJoOk"],
    articles: ["blog-leave-your-leaves-oct25", "blog-no-more-ww-jun25"],
  },
  items: [
    // Wilding Weekend (videos)
    {
      id: "ww-8_xMAAbjcaw",
      displayTitle: "The 2022 Wilding Weekend in twelve minutes",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=8_xMAAbjcaw",
      title: "Hooke Farm Wilding Weekend 2022   (12 mins Final)",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-A7Wg3MJ4b7Y",
      displayTitle: "Four minutes at the 2022 Wilding Weekend",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=A7Wg3MJ4b7Y",
      title: "2022 Hooke Farm Wilding Weekend Highlights (4 mins version)",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-Izy6GXhwt9s",
      displayTitle: "A short visit to the 2023 Wilding Weekend",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=Izy6GXhwt9s",
      title: "Wilding Weekend in West Dorset - A short overview - June 2023",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-cYCYuGORszg",
      displayTitle: "The 2023 Wilding Weekend in Dorset",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=cYCYuGORszg&pp=0gcJCU0KAYcqIYzv",
      title: "2023 WILDING WEEKEND IN DORSET - VS2 updated 10aug23",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-hTknDjRNTSA",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=hTknDjRNTSA",
      title: "Find out more about our Wilding Weekend 2023",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-HBiSTHp_RK8",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=HBiSTHp_RK8",
      title: "Bushbells Bunting at the Wilding Weekend",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },
    {
      id: "ww-7NclmBEJoOk",
      displayTitle: "Why scythe a wildflower meadow?",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=7NclmBEJoOk",
      title: "Why do Scything and Wilding go Hand-in-Hand?",
      author: "Julia Hailes",
      tags: ["Wilding Weekend"],
      date: null,
    },

    // Other Hooke wilding content (videos)
    {
      id: "hooke-OeOJNBs5VjI",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=OeOJNBs5VjI",
      title: "Barn owls have inhabited our barn owl box!",
      author: "Julia Hailes",
      tags: ["Hooke Wilding"],
      date: null,
    },
    {
      id: "hooke-X3m18jbvRv0",
      displayTitle: "Oscar McCarthy on the hibernaculum",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=X3m18jbvRv0",
      title: "2022 05 17 Oscar talking about the Hibernaculum",
      author: "Julia Hailes",
      tags: ["Hooke Wilding"],
      date: null,
    },

    // Other Hooke wilding content (blogs)
    {
      id: "blog-scything-oct23",
      type: "blog",
      url: "https://juliahailes.com/why-do-scything-wilding-go-hand-in-hand-oct23/",
      title: "Why do scything & wilding go hand in hand?",
      publisher: "juliahailes.com",
      tags: ["Blog", "Scything", "Hooke Wilding"],
      date: "2023-10-01",
    },
    {
      id: "blog-no-more-ww-jun25",
      type: "blog",
      url: "https://juliahailes.com/no-more-wilding-weekends-but-wilding-is-on-the-rise-jun25/",
      title: "No more wilding weekends — but wilding is on the rise",
      publisher: "juliahailes.com",
      tags: ["Blog", "Wilding Weekend", "Hooke Wilding"],
      date: "2025-06-01",
    },
    {
      id: "blog-leave-your-leaves-oct25",
      type: "blog",
      url: "https://juliahailes.com/leave-your-leaves-oct25/",
      title: "Leave your leaves",
      publisher: "juliahailes.com",
      tags: ["Blog", "Seasonal", "Hooke Wilding"],
      date: "2025-10-01",
    },
  ],
};


