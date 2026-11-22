/* global window, document */

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node;
}

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function parseIsoDate(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  // Normalize to midnight UTC so comparisons are consistent.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function youtubeIdFromUrl(url) {
  try {
    const u = new URL(String(url));
    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id || null;
    }
    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v");
    if (v) return v.trim();
    // /embed/<id>
    const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m && m[1]) return m[1];
    return null;
  } catch {
    return null;
  }
}

const LS_META = "hookeContentMeta::v1";
const LS_BLOG_META = "hookeContentBlogMeta::v1";

function loadMetaCache() {
  try {
    const raw = window.localStorage.getItem(LS_META);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveMetaCache(cache) {
  try {
    window.localStorage.setItem(LS_META, JSON.stringify(cache || {}));
  } catch {
    // ignore
  }
}

function loadBlogMetaCache() {
  try {
    const raw = window.localStorage.getItem(LS_BLOG_META);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveBlogMetaCache(cache) {
  try {
    window.localStorage.setItem(LS_BLOG_META, JSON.stringify(cache || {}));
  } catch {
    // ignore
  }
}

async function fetchYouTubeOEmbed(url) {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", String(url));
  const res = await fetch(String(endpoint), { method: "GET" });
  if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
  const data = await res.json();
  return data && typeof data === "object" ? data : null;
}

async function fetchWordpressOEmbed(postUrl) {
  // WordPress exposes an oEmbed endpoint that usually includes `thumbnail_url`
  // (often the SEO / featured image).
  const u = new URL(String(postUrl));
  const endpoint = new URL(`${u.origin}/wp-json/oembed/1.0/embed`);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", String(postUrl));
  const res = await fetch(String(endpoint), { method: "GET" });
  if (!res.ok) throw new Error(`WP oEmbed failed: ${res.status}`);
  const data = await res.json();
  return data && typeof data === "object" ? data : null;
}

function main() {
  const data = window.__HOOKE_CONTENT__;
  if (!data || !data.featured || !Array.isArray(data.items)) {
    document.body.innerHTML =
      "<div style='padding:24px;font-family:system-ui'>Missing content data. Expected window.__HOOKE_CONTENT__.</div>";
    return;
  }

  const featured = { ...data.featured };
  const items = data.items.map((it) => ({ ...it }));

  // Normalize: attach derived fields
  function normalizeItem(it, order) {
    const type = it.type === "blog" ? "blog" : "youtube";
    const tags = Array.isArray(it.tags) ? it.tags : [];
    const url = String(it.url || "").trim();
    const date = it.date ? String(it.date) : null;
    const vid = type === "youtube" ? youtubeIdFromUrl(url) : null;
    return { ...it, type, tags, url, date, youtubeId: vid, order: Number.isFinite(order) ? order : 0 };
  }

  const all = [normalizeItem(featured, -1), ...items.map((it, idx) => normalizeItem(it, idx))];

  const cache = loadMetaCache();
  const blogCache = loadBlogMetaCache();
  const $featuredCard = el("featuredCard");

  function applyCredits() {
    for (const item of all) {
      const meta = item.type === "blog" ? blogCache[item.url] : cache[item.youtubeId];
      if (!meta) continue;
      item.title ||= meta.title;
      item.author ||= meta.author;
      item.publisher ||= meta.publisher;
    }
  }
  applyCredits();

  const $search = el("contentSearch");
  const $types = el("contentTypes");
  const $tags = el("contentTags");
  const $grid = el("contentGrid");
  const $meta = el("contentMeta");
  const $clear = el("contentClear");
  const $sort = el("contentSort");
  const $dateFrom = el("dateFrom");
  const $dateTo = el("dateTo");

  const $videoModal = el("videoModal");
  const $videoModalTitle = el("videoModalTitle");
  const $videoModalMeta = el("videoModalMeta");
  const $videoModalClose = el("videoModalClose");
  const $videoModalOpen = el("videoModalOpen");
  const $videoFrame = el("videoFrame");

  const state = {
    q: "",
    tags: new Set(),
    types: new Set(), // "youtube" | "blog"
    from: "",
    to: "",
    sort: "date_desc",
  };

  function updateClearVisibility() {
    const hasActive =
      !!String(state.q || "").trim() ||
      state.tags.size > 0 ||
      state.types.size > 0 ||
      !!String(state.from || "").trim() ||
      !!String(state.to || "").trim() ||
      state.sort !== "date_desc";
    $clear.hidden = !hasActive;
  }

  function allTags() {
    return unique(all.flatMap((it) => it.tags || [])).sort((a, b) => a.localeCompare(b));
  }

  function matches(it) {
    const q = normalize(state.q);
    const typeOk = state.types.size === 0 || state.types.has(it.type);
    const tagOk = state.tags.size === 0 || (it.tags || []).some((t) => state.tags.has(t));
    const hay = normalize(
      [
        it.title || "",
        it.displayTitle || "",
        it.author || "",
        it.publisher || "",
        it.url || "",
        (it.tags || []).join(" "),
        it.type,
      ].join(" ")
    );
    const qOk = !q || hay.includes(q);

    const d = parseIsoDate(it.date);
    const from = parseIsoDate(state.from);
    const to = parseIsoDate(state.to);
    const fromOk = !from || (d && d.getTime() >= from.getTime());
    const toOk = !to || (d && d.getTime() <= to.getTime());

    return qOk && typeOk && tagOk && fromOk && toOk;
  }

  function compareItems(a, b) {
    if (state.sort === "title_asc") {
      return storyTitle(a).localeCompare(storyTitle(b));
    }
    const da = parseIsoDate(a.date);
    const db = parseIsoDate(b.date);
    // Unknown dates always last
    const aHas = !!da;
    const bHas = !!db;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!da || !db) return Number(a.order || 0) - Number(b.order || 0);
    const diff = da.getTime() - db.getTime();
    if (diff === 0) return Number(a.order || 0) - Number(b.order || 0);
    return state.sort === "date_asc" ? diff : -diff;
  }

  function storyTitle(item) {
    return item.displayTitle || item.title || item.url;
  }

  const monthYear = new Intl.DateTimeFormat("en-GB", {
    month: "long", year: "numeric", timeZone: "UTC",
  });

  function storyLink(item, compact) {
    const article = item.type === "blog";
    const date = parseIsoDate(item.date);
    const credit = [item.author || item.publisher, date && monthYear.format(date)].filter(Boolean).join(" · ");
    const format = article ? "Article" : "Film";
    const action = article ? "Read" : "Watch";
    return `<li><a href="${escapeHtml(item.url)}" class="story-link" target="_blank" rel="noopener noreferrer" data-story-id="${escapeHtml(item.id)}">
      ${compact ? "" : `<span class="story-link__format">${format}</span>`}
      <span class="story-link__text"><span class="story-link__title">${escapeHtml(storyTitle(item))}</span>
      ${compact || !credit ? "" : `<span class="story-link__credit">${escapeHtml(credit)}</span>`}</span>
      <span class="story-link__action">${action} <span aria-hidden="true">${article ? "↗" : "▷"}</span></span>
    </a></li>`;
  }

  function renderPicks(element, ids) {
    const picks = ids.map(id => all.find(item => item.id === id)).filter(Boolean);
    element.innerHTML = picks.map(item => storyLink(item, true)).join("");
  }

  function renderFilters() {
    const typeDefs = [
      { id: "youtube", label: "Films & talks" },
      { id: "blog", label: "Articles" },
    ];
    const focusedType = $types.contains(document.activeElement) ? document.activeElement.getAttribute("data-content-type") : null;
    $types.innerHTML = typeDefs
      .map((t) => {
        const active = state.types.has(t.id);
        return `<button class="chip ${active ? "is-active" : ""}" type="button" aria-pressed="${active}" data-content-type="${escapeHtml(
          t.id
        )}">${escapeHtml(t.label)}</button>`;
      })
      .join("");

    const tagsList = allTags();
    const focusedTag = $tags.contains(document.activeElement) ? document.activeElement.getAttribute("data-content-tag") : null;
    $tags.innerHTML = tagsList
      .map((t) => {
        const active = state.tags.has(t);
        return `<button class="chip ${active ? "is-active" : ""}" type="button" aria-pressed="${active}" data-content-tag="${escapeHtml(t)}">${escapeHtml(
          t
        )}</button>`;
      })
      .join("");

    updateClearVisibility();
    if (focusedType !== null) $types.querySelector('[data-content-type="' + CSS.escape(focusedType) + '"]')?.focus({ preventScroll: true });
    if (focusedTag !== null) $tags.querySelector('[data-content-tag="' + CSS.escape(focusedTag) + '"]')?.focus({ preventScroll: true });
  }

  function renderGrid() {
    const filtered = all.filter(matches).sort(compareItems);
    $meta.textContent = filtered.length === 1 ? "1 story" : `${filtered.length} stories`;
    $grid.innerHTML = filtered.length
      ? filtered.map(item => storyLink(item, false)).join("")
      : "<li class='archive-empty'>No stories found. Try another word or clear the filters.</li>";
  }

  function openVideoById(videoId, url, title) {
    if (!videoId) return;
    // Local files have no HTTP Referer. YouTube rejects those embeds with error 153.
    // Use a normal watch page instead; HTTP(S) previews retain the inline player.
    if (window.location.protocol === "file:") {
      window.open(url || `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, "_blank", "noopener");
      return;
    }
    $videoModalTitle.textContent = title || "Video";
    $videoModalMeta.textContent = url ? `YouTube · ${url}` : "YouTube";
    if (url) {
      $videoModalOpen.href = url;
      $videoModalOpen.removeAttribute("aria-disabled");
    } else {
      $videoModalOpen.href = "#";
      $videoModalOpen.setAttribute("aria-disabled", "true");
    }

    // Identify the HTTP(S) parent. The iframe also sends its origin as the Referer.
    const originOk = window.location && window.location.origin && window.location.origin !== "null";
    const originParam = originOk ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
    const src = `https://www.youtube.com/embed/${encodeURIComponent(
      videoId
    )}?autoplay=1&rel=0&modestbranding=1&playsinline=1${originParam}`;
    $videoFrame.src = src;
    if (!$videoModal.open) $videoModal.showModal();
  }

  function closeVideo() {
    try {
      $videoFrame.src = "about:blank";
    } catch {
      // ignore
    }
    if ($videoModal.open) $videoModal.close();
  }

  function resetFilters() {
    state.q = "";
    state.tags.clear();
    state.types.clear();
    state.from = "";
    state.to = "";
    state.sort = "date_desc";
    $search.value = "";
    $dateFrom.value = "";
    $dateTo.value = "";
    $sort.value = "date_desc";
    renderFilters();
    renderGrid();
  }

  $featuredCard.href = featured.url;
  $featuredCard.dataset.storyId = featured.id;
  renderPicks(el("talkPicks"), data.picks.talks);
  renderPicks(el("articlePicks"), data.picks.articles);
  renderFilters();
  renderGrid();

  // Events
  $search.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    updateClearVisibility();
    renderGrid();
  });
  $sort.addEventListener("change", (e) => {
    state.sort = e.target.value || "date_desc";
    updateClearVisibility();
    renderGrid();
  });
  $dateFrom.addEventListener("change", (e) => {
    state.from = e.target.value || "";
    updateClearVisibility();
    renderGrid();
  });
  $dateTo.addEventListener("change", (e) => {
    state.to = e.target.value || "";
    updateClearVisibility();
    renderGrid();
  });
  $clear.addEventListener("click", resetFilters);

  document.addEventListener("click", (e) => {
    const typeBtn = e.target.closest("[data-content-type]");
    if (typeBtn) {
      const t = typeBtn.dataset.contentType;
      if (state.types.has(t)) state.types.delete(t);
      else state.types.add(t);
      renderFilters();
      renderGrid();
      return;
    }

    const tagBtn = e.target.closest("[data-content-tag]");
    if (tagBtn) {
      const t = tagBtn.dataset.contentTag;
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);
      renderFilters();
      renderGrid();
      return;
    }

    const link = e.target.closest("[data-story-id]");
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const item = all.find(entry => entry.id === link.dataset.storyId);
    if (item?.youtubeId) {
      e.preventDefault();
      openVideoById(item.youtubeId, item.url, item.title || storyTitle(item));
    }
  });

  $videoModalClose.addEventListener("click", closeVideo);
  $videoModal.addEventListener("click", (e) => {
    if (e.target === $videoModal) closeVideo();
  });
  $videoModal.addEventListener("close", () => {
    // A queued close event must not stop a film opened immediately afterwards.
    if ($videoModal.open) return;
    // Ensure video stops when user presses Esc.
    try {
      $videoFrame.src = "about:blank";
    } catch {
      // ignore
    }
  });

  // Fetch missing YouTube meta (best-effort; offline-safe).
  const youtubeToFetch = unique(
    all
      .filter((it) => it.type === "youtube" && it.youtubeId && (!it.title || !it.author))
      .map((it) => it.youtubeId)
      .filter((id) => !cache[id])
  );

  if (youtubeToFetch.length) {
    Promise.all(
      youtubeToFetch.map(async (id) => {
        const it = all.find((x) => x.youtubeId === id);
        if (!it) return;
        try {
          const meta = await fetchYouTubeOEmbed(it.url);
          if (!meta) return;
          cache[id] = {
            title: typeof meta.title === "string" ? meta.title : "",
            author: typeof meta.author_name === "string" ? meta.author_name : "",
            thumbnail: typeof meta.thumbnail_url === "string" ? meta.thumbnail_url : "",
          };
        } catch {
          // ignore (offline / CORS / blocked)
        }
      })
    ).then(() => {
      saveMetaCache(cache);
      // Re-render once with whatever metadata we managed to fetch.
      applyCredits();
      renderGrid();
    });
  }

  // Fill in credits for articles added with only a source URL.
  const blogToFetch = unique(
    all
      .filter((it) => it.type === "blog" && it.url && (!it.title || !it.publisher))
      .map((it) => it.url)
      .filter((url) => !blogCache[url])
  );

  if (blogToFetch.length) {
    Promise.all(
      blogToFetch.map(async (url) => {
        try {
          const meta = await fetchWordpressOEmbed(url);
          if (!meta) return;
          blogCache[url] = {
            title: typeof meta.title === "string" ? meta.title : "",
            author: typeof meta.author_name === "string" ? meta.author_name : "",
            publisher: typeof meta.provider_name === "string" ? meta.provider_name : "",
            thumbnail: typeof meta.thumbnail_url === "string" ? meta.thumbnail_url : "",
          };
        } catch {
          // ignore (offline / blocked / non-WordPress)
        }
      })
    ).then(() => {
      saveBlogMetaCache(blogCache);
      applyCredits();
      renderGrid();
    });
  }
}

main();


