/* global window, document */

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "feature";
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function seededRand(seedStr) {
  // Simple deterministic PRNG from string seed.
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let x = h >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function toParagraphs(text, highlightQuery) {
  const clean = String(text || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!clean) return "<p class=\"muted\">No extracted text found for this PDF.</p>";
  const parts = clean
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts
    .map((p) => `<p>${highlightPlain(p, highlightQuery).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function extractFacts(text) {
  const t = String(text || "");
  const facts = [];
  // numbers/dates
  const numMatches = t.match(/\b(1[0-9]{3}|20[0-9]{2}|\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\b/g) || [];
  const uniqNums = unique(numMatches).slice(0, 4);
  if (uniqNums.length) facts.push(`Notable numbers: ${uniqNums.join(", ")}.`);

  // latin names
  const latin = t.match(/\b[A-Z][a-z]+ [a-z]{3,}\b/g) || [];
  const latinUniq = unique(latin).slice(0, 3);
  if (latinUniq.length) facts.push(`Species spotted: ${latinUniq.join(", ")}.`);

  // strong lines
  const lines = t
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 18);
  const shouty = lines.filter((l) => /^[A-Z0-9 '’\-:!]{8,}$/.test(l) && l.length <= 60).slice(0, 2);
  shouty.forEach((s) => facts.push(`“${s}”`));

  return facts.slice(0, 4);
}

function generateNarrative(feature) {
  const rng = seededRand(feature.id || feature.title || "hooke");
  const title = feature.title || "A wilding feature";
  const tags = (feature.tags || []).slice(0, 5);

  const openings = [
    "You arrive as if the map itself has leaned in to whisper a secret.",
    "Step closer. This corner of Hooke Farm has a small story it’s been saving for you.",
    "If wilding had a voice, it would sound like this: quiet, busy, and delightfully alive.",
    "Here’s one of those places that looks like an illustration—until it starts moving.",
  ];
  const moods = [
    "tender and practical",
    "slightly mischievous",
    "ancient-feeling, but very present",
    "alive with tiny, purposeful drama",
    "calm on the surface, bustling underneath",
  ];
  const senses = [
    "listen for the hush of wings",
    "watch for a flicker in the hedge line",
    "notice how the ground tells on itself",
    "let your eyes follow the pathways of chance",
    "remember: the smallest lives do the most work",
  ];

  const facts = extractFacts(feature.text || "");
  const factLine = facts.length ? `A few clues from the board: ${facts.join(" ")}` : "";

  const tagLine = tags.length
    ? `It’s a place that sits somewhere between ${tags.join(", ")} — and whatever comes next.`
    : "It’s a place that sits between intention and surprise.";

  const p1 = `<p><strong>${escapeHtml(title)}.</strong> ${escapeHtml(pick(rng, openings))}</p>`;
  const p2 = `<p>Up close, it feels <em>${escapeHtml(pick(rng, moods))}</em>. ${escapeHtml(
    pick(rng, senses)
  )}. ${escapeHtml(tagLine)}</p>`;

  const p3 = factLine
    ? `<p>${escapeHtml(factLine)}</p>`
    : `<p>What matters here isn’t perfection—it’s permission. Space for creatures to shelter, forage, argue, and thrive.</p>`;

  const closings = [
    "Leave it a little wilder than you found it—by simply noticing it.",
    "Wilding isn’t a single act; it’s a long conversation. This is one of the best sentences.",
    "Carry the feeling forward: life loves edges, textures, and gentle neglect.",
    "If you’re lucky, you’ll spot the next chapter before you even turn away.",
  ];
  const p4 = `<p>${escapeHtml(pick(rng, closings))}</p>`;

  return `${p1}${p2}${p3}${p4}`;
}

const LS_TAGS_PREFIX = "hookeTags::";
const LS_CUSTOM_FEATURES = "hookeCustomFeatures::v1";
const LS_OVERRIDES_PREFIX = "hookeOverrides::v1::";
const LS_VISITED = "hookeVisited::v1";
const SS_ADMIN = "hookeAdminUnlocked::v1";
const ADMIN_PASSWORD = "h00kewilding";

function loadTagOverrides(featureId) {
  try {
    const raw = window.localStorage.getItem(`${LS_TAGS_PREFIX}${featureId}`);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.map((t) => String(t)).filter((t) => t.trim() !== "");
  } catch {
    return null;
  }
}

function saveTagOverrides(featureId, tags) {
  try {
    window.localStorage.setItem(`${LS_TAGS_PREFIX}${featureId}`, JSON.stringify(tags));
  } catch {
    // ignore
  }
}

function loadOverrides(featureId) {
  try {
    const raw = window.localStorage.getItem(`${LS_OVERRIDES_PREFIX}${featureId}`);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function saveOverrides(featureId, overrides) {
  try {
    window.localStorage.setItem(`${LS_OVERRIDES_PREFIX}${featureId}`, JSON.stringify(overrides || {}));
  } catch {
    // ignore
  }
}

function clearOverrides(featureId) {
  try {
    window.localStorage.removeItem(`${LS_OVERRIDES_PREFIX}${featureId}`);
  } catch {
    // ignore
  }
}

function loadCustomFeatures() {
  try {
    const raw = window.localStorage.getItem(LS_CUSTOM_FEATURES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x === "object" && typeof x.id === "string");
  } catch {
    return [];
  }
}

function saveCustomFeatures(arr) {
  try {
    window.localStorage.setItem(LS_CUSTOM_FEATURES, JSON.stringify(arr || []));
  } catch {
    // ignore
  }
}

function loadVisited() {
  try {
    const raw = window.localStorage.getItem(LS_VISITED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function saveVisited(set) {
  try {
    window.localStorage.setItem(LS_VISITED, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function getEffectiveTags(feature) {
  const base = Array.isArray(feature.tags) ? feature.tags : [];
  const overrides = loadTagOverrides(feature.id);
  if (!overrides) return unique(base).sort((a, b) => a.localeCompare(b));
  return unique(overrides).sort((a, b) => a.localeCompare(b));
}

function getEffectiveTitle(feature) {
  const o = loadOverrides(feature.id);
  const t = o && typeof o.title === "string" ? o.title.trim() : "";
  return t || feature.title || "Untitled feature";
}

function getEffectiveStoryText(feature) {
  const o = loadOverrides(feature.id);
  const s = o && typeof o.story === "string" ? o.story : "";
  return s || (typeof feature.story === "string" ? feature.story : "") || "";
}

function getEffectiveImage(feature) {
  const o = loadOverrides(feature.id);
  const img = o && typeof o.imageDataUrl === "string" ? o.imageDataUrl : "";
  return img || feature.imageDataUrl || "";
}

function getEffectiveGallery(feature) {
  const o = loadOverrides(feature.id);
  const g = o && Array.isArray(o.gallery) ? o.gallery : null;
  const base = Array.isArray(feature.gallery) ? feature.gallery : [];
  const merged = (g ? [...base, ...g] : base).filter((x) => x && typeof x === "object" && typeof x.url === "string");
  // Deduplicate by url (stable)
  const seen = new Set();
  return merged.filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

function guessSeasonalNotes(feature) {
  const t = normalize(getEffectiveTitle(feature));
  const tags = getEffectiveTags(feature).map((x) => normalize(x));
  const text = normalize(feature.text || "");
  const has = (k) => t.includes(k) || text.includes(k) || tags.some((tg) => tg.includes(k));

  const pick = (lines) => lines.filter(Boolean).slice(0, 2).join(" ");
  const spring = pick([
    has("bee") || has("insect") ? "Look for early pollinator activity on warm, still days." : "Notice the first flush of growth along edges and paths.",
    has("bird") ? "Listen for busy nesting chatter and dawn choruses." : "Watch for fresh leaves, buds, and the first wildflowers.",
  ]);
  const summer = pick([
    has("bee") || has("insect") ? "Midday can be loud with wingbeats—scan flowers and sunny banks." : "Follow the heat: where sun meets shade is where the action is.",
    has("bat") ? "At dusk, watch for bats feeding above hedges and open rides." : "Bring slow attention: tiny movements often reveal the best sightings.",
  ]);
  const autumn = pick([
    has("seed") || has("track") ? "Notice seed heads and textures—this is a season of structure and decay." : "Look for ripening berries, fungi, and the changing palette.",
    has("stone") ? "Low light makes shapes pop—great for noticing stones, contours, and shelter spots." : "Watch for late nectar sources and busy foraging before winter.",
  ]);
  const winter = pick([
    has("hibern") || has("bat") ? "This is shelter season—think crevices, cavities, and quiet corners." : "Read the land by tracks, stems, and silhouettes.",
    has("bird") ? "Winter birds love food and cover—scan hedges and evergreen pockets." : "Even ‘still’ places are alive—move slowly and you’ll spot it.",
  ]);

  return { Spring: spring, Summer: summer, Autumn: autumn, Winter: winter };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightPlain(text, query) {
  const q = String(query || "").trim();
  if (!q) return escapeHtml(text);
  const re = new RegExp(escapeRegExp(q), "ig");
  const parts = String(text).split(re);
  const matches = String(text).match(re) || [];
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += escapeHtml(parts[i]);
    if (i < matches.length) out += `<mark>${escapeHtml(matches[i])}</mark>`;
  }
  return out;
}

function isHidden(feature) {
  const o = loadOverrides(feature.id);
  if (o && o.hidden === true) return true;
  return feature && feature.hidden === true;
}

function isDeleted(feature) {
  const o = loadOverrides(feature.id);
  if (o && o.deleted === true) return true;
  return feature && feature.deleted === true;
}

function getDefaultPin(featureId, fallbacks) {
  return (fallbacks || []).find((p) => p.featureId === featureId) || null;
}

function main() {
  const data = window.__HOOKE_DATA__;
  if (!data || !Array.isArray(data.features)) {
    document.body.innerHTML =
      "<div style='padding:24px;font-family:system-ui'>Missing data bundle. Expected window.__HOOKE_DATA__.</div>";
    return;
  }

  const baseFeatures = data.features.map((f) => ({ ...f, isCustom: false }));
  let features = [...baseFeatures, ...loadCustomFeatures().map((f) => ({ ...f, isCustom: true }))];
  const visited = loadVisited();
  const tour = { active: false, ids: [], idx: 0 };

  const state = {
    q: "",
    tags: new Set(),
    activeFeatureId: null,
  };

  const $grid = el("grid");
  const $search = el("search");
  const $tagList = el("tagList");
  const $resultMeta = el("resultMeta");
  const $tagToggle = el("tagToggle");
  $tagToggle.addEventListener("click", () => {
    $tagList.hidden = !$tagList.hidden;
    $tagToggle.setAttribute("aria-expanded", String(!$tagList.hidden));
  });
  const $btnTour = el("btnTour");
  const $clearFilters = document.getElementById("clearFilters");

  const $modal = el("modal");
  const $modalTitle = el("modalTitle");
  const $modalBoardImg = el("modalBoardImg");
  const $modalDesc = el("modalDesc");
  const $modalNarrative = el("modalNarrative");
  const $modalTags = el("modalTags");
  const $modalClose = el("modalClose");
  const $modalPrevFeature = el("modalPrevFeature");
  const $modalNextFeature = el("modalNextFeature");
  const $modalSeasonal = el("modalSeasonal");
  const $modalGallery = el("modalGallery");
  const $galleryPrev = el("galleryPrev");
  const $galleryNext = el("galleryNext");
  const $galleryCounter = el("galleryCounter");
  const $tourPanel = el("tourPanel");
  const $tourLayer = el("tourLayer");
  const $tourPath = el("tourPath");
  const $tourPanelTitle = el("tourPanelTitle");
  const $tourPanelMeta = el("tourPanelMeta");
  const $tourPanelText = el("tourPanelText");
  const $tourPanelPrev = el("tourPanelPrev");
  const $tourPanelNext = el("tourPanelNext");
  const $tourPanelEnd = el("tourPanelEnd");
  const $tourPanelOpen = el("tourPanelOpen");
  const $tagInput = el("tagInput");
  const $tagAdd = el("tagAdd");

  const $btnAbout = document.getElementById("btnAbout");
  const $btnRandom = el("btnRandom");

  // Map / HUD (keep existing map features working even if pins are not used)
  const $mapPins = el("mapPins");
  const $mapHud = el("mapHud");
  const $hudX = el("hudX");
  const $hudY = el("hudY");
  const $hudStatus = el("hudStatus");
  const $togglePins = el("togglePins");

  // Admin UI
  const $btnAdmin = el("btnAdmin");
  const $adminDialog = el("adminDialog");
  const $adminClose = el("adminClose");
  const $adminLoginView = el("adminLoginView");
  const $adminPanelView = el("adminPanelView");
  const $adminPassword = el("adminPassword");
  const $adminUnlock = el("adminUnlock");
  const $adminStatus = el("adminStatus");
  const $adminLock = el("adminLock");
  const $adminFeatureSelect = el("adminFeatureSelect");
  const $adminFeatureSearch = el("adminFeatureSearch");
  const $adminOpenFeature = el("adminOpenFeature");
  const $adminEditToggle = el("adminEditToggle");
  const $adminPickPin = el("adminPickPin");
  const $adminTitle = el("adminTitle");
  const $adminPinLabel = el("adminPinLabel");
  const $adminPinX = el("adminPinX");
  const $adminPinY = el("adminPinY");
  const $adminTags = el("adminTags");
  const $adminStory = el("adminStory");
  const $adminImage = el("adminImage");
  const $adminGalleryAdd = el("adminGalleryAdd");
  const $adminGalleryList = el("adminGalleryList");
  const $adminSaveFeature = el("adminSaveFeature");
  const $adminResetFeature = el("adminResetFeature");
  const $adminToggleHidden = el("adminToggleHidden");
  const $adminDeleteFeature = el("adminDeleteFeature");
  const $adminSaveStatus = el("adminSaveStatus");
  const $adminCreateFeature = el("adminCreateFeature");
  const $adminCreateStatus = el("adminCreateStatus");
  const $newTitle = el("newTitle");
  const $newPinLabel = el("newPinLabel");
  const $newPinX = el("newPinX");
  const $newPinY = el("newPinY");
  const $newTags = el("newTags");
  const $newStory = el("newStory");
  const $newImage = el("newImage");
  const $newGallery = el("newGallery");
  const $tagEditor = el("tagEditor");
  const $tagEditorAdd = el("tagEditorAdd");
  const $adminTabEdit = el("adminTabEdit");
  const $adminTabAdd = el("adminTabAdd");
  const $adminEditView = el("adminEditView");
  const $adminAddView = el("adminAddView");
  const $adminPreviewImg = el("adminPreviewImg");
  const $adminPreviewPin = el("adminPreviewPin");
  const $adminPickStatus = el("adminPickStatus");
  const $newPreviewImg = el("newPreviewImg");
  const $newPreviewPin = el("newPreviewPin");
  const $newPickStatus = el("newPickStatus");
  const $newPickPin = el("newPickPin");
  const $adminContentCard = el("adminContentCard");
  const $adminMapCard = el("adminMapCard");
  const $adminEditActions = el("adminEditActions");

  // Default pins (can be overridden in admin via localStorage overrides).
  const DEFAULT_PINS = [
    // Bat Egg: just beneath the center of the "Hooke Farm" title (initial placement)
    { featureId: "the-bat-egg", label: "The Bat Egg", xPct: 50.0, yPct: 22.0 },

    // Provided coordinates:
    { featureId: "dead-hedge", label: "Dead Hedge", xPct: 19.5, yPct: 80.9 },
    { featureId: "fallen-tree", label: "Fallen Tree", xPct: 75.6, yPct: 57.1 },
    { featureId: "giant-chair", label: "Giant Chair", xPct: 25.2, yPct: 16.7 },
    { featureId: "barn-owl-box", label: "Barn Owl Box", xPct: 27.5, yPct: 29.0 },
    { featureId: "hen-henge", label: "Hen Henge", xPct: 83.1, yPct: 76.1 },
    { featureId: "ichthyosaurus", label: "Ichthyosaurus", xPct: 78.4, yPct: 53.0 },
    { featureId: "insect-homes", label: "Insect Homes", xPct: 12.4, yPct: 26.2 },
    { featureId: "monkey-puzzle", label: "Monkey Puzzle", xPct: 31.8, yPct: 37.5 },
    { featureId: "old-mill-pond", label: "Old Mill Pond", xPct: 74.7, yPct: 46.0 },
    { featureId: "orchard", label: "Orchard", xPct: 11.3, yPct: 57.1 },
    { featureId: "public-bridleway", label: "Public Bridleway", xPct: 17.0, yPct: 52.9 },
    { featureId: "standing-stones", label: "Standing Stones", xPct: 27.3, yPct: 49.4 },
    { featureId: "tree-lith", label: "Tree Lith", xPct: 27.2, yPct: 55.4 },
    { featureId: "toad-pond", label: "Toad Pond", xPct: 53.2, yPct: 70.3 },
    { featureId: "wild-veg-garden", label: "Wild Veg Garden", xPct: 51.9, yPct: 46.5 },
    { featureId: "green-roof", label: "Green roof", xPct: 61.9, yPct: 79.2 },
    { featureId: "wild-bees-birds", label: "Wild Bees & Birds", xPct: 43.1, yPct: 75.1 },
    { featureId: "wildflower-meadow", label: "Wildflower Meadow", xPct: 49.4, yPct: 29.7 },
    { featureId: "our-sweet-track", label: "Sweet Track", xPct: 88.3, yPct: 68.4 },
    { featureId: "hibernaculum", label: "Hibernaculum", xPct: 92.9, yPct: 56.6 },
    { featureId: "mount-scotland", label: "Mount Scotland", xPct: 40.4, yPct: 23.5 },
  ];

  function getEffectivePin(feature) {
    const o = loadOverrides(feature.id) || {};
    const pinO = o && typeof o.pin === "object" && o.pin ? o.pin : null;
    const def = getDefaultPin(feature.id, DEFAULT_PINS);

    const base = feature.isCustom
      ? feature.pin || null
      : def;

    const label = (pinO && typeof pinO.label === "string" ? pinO.label : "") || (base && base.label) || getEffectiveTitle(feature);
    const xPct =
      (pinO && typeof pinO.xPct === "number" ? pinO.xPct : null) ?? (base && typeof base.xPct === "number" ? base.xPct : null);
    const yPct =
      (pinO && typeof pinO.yPct === "number" ? pinO.yPct : null) ?? (base && typeof base.yPct === "number" ? base.yPct : null);

    if (typeof xPct !== "number" || typeof yPct !== "number") return null;
    return { featureId: feature.id, label, xPct, yPct, mapNumber: features.indexOf(feature) + 1 };
  }

  function renderMapPins() {
    const pins = features
      .filter((f) => !isDeleted(f))
      .filter((f) => !isHidden(f))
      .map((f) => getEffectivePin(f))
      .filter(Boolean);
    $mapPins.innerHTML = pins
      .map((p) => {
        const left = `${p.xPct}%`;
        const top = `${p.yPct}%`;
        const visitedClass = visited.has(p.featureId) ? " is-visited" : "";
        return `
          <button class="pin${visitedClass}" type="button" data-feature-id="${escapeHtml(p.featureId)}" data-map-number="${p.mapNumber}" style="left:${left};top:${top}">
            <div class="pin__bubble">
              <span class="pin__dot" aria-hidden="true"></span>
              <span class="pin__label">${escapeHtml(p.label)}</span>
            </div>
            <div class="pin__stem" aria-hidden="true"></div>
          </button>
        `;
      })
      .join("");
  }

  // --- Admin mode (session unlock) ---
  let isAdmin = false;
  let adminActiveTab = "edit"; // "edit" | "new"
  let pickMode = null; // "edit" | "new" | null
  let isEditingFeature = false;

  function setAdminMode(on) {
    isAdmin = !!on;
    document.body.classList.toggle("is-admin", isAdmin);
    $btnAdmin.textContent = isAdmin ? "Admin (on)" : "Admin";
    // Map HUD only makes sense in admin
    if (!isAdmin) {
      $mapHud.hidden = true;
    }
  }

  function persistAdmin(on) {
    try {
      if (on) window.sessionStorage.setItem(SS_ADMIN, "1");
      else window.sessionStorage.removeItem(SS_ADMIN);
    } catch {
      // ignore
    }
  }

  function readAdminPersisted() {
    try {
      return window.sessionStorage.getItem(SS_ADMIN) === "1";
    } catch {
      return false;
    }
  }

  function openAdminDialog() {
    const preserve = arguments.length > 0 && arguments[0] && arguments[0].preserveForm;
    $adminStatus.textContent = "";
    if (isAdmin) {
      $adminLoginView.hidden = true;
      $adminPanelView.hidden = false;
      setAdminTab(adminActiveTab);
      if (!preserve) {
        hydrateAdminSelect();
        // If nothing is selected, pick the first option so preview + form populate.
        if (!$adminFeatureSelect.value && $adminFeatureSelect.options.length) {
          $adminFeatureSelect.value = $adminFeatureSelect.options[0].value;
        }
        loadAdminFormFromSelected();
      }
    } else {
      $adminLoginView.hidden = false;
      $adminPanelView.hidden = true;
      $adminPassword.value = "";
    }
    $adminDialog.showModal();
    if (isAdmin) $adminFeatureSelect.focus();
    else $adminPassword.focus();
  }

  function closeDialog(d) {
    if (d && typeof d.close === "function") d.close();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function parseTagsCsv(s) {
    return unique(
      String(s || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b));
  }

  function hydrateAdminSelect() {
    const q = normalize($adminFeatureSearch.value || "");
    const list = [...features]
      .filter((f) => !isDeleted(f))
      .filter((f) => !q || normalize(getEffectiveTitle(f)).includes(q))
      .sort((a, b) => getEffectiveTitle(a).localeCompare(getEffectiveTitle(b)))
      .map((f) => {
        const title = getEffectiveTitle(f);
        const suffix = `${f.isCustom ? " (custom)" : ""}${isHidden(f) ? " (hidden)" : ""}`;
        return `<option value="${escapeHtml(f.id)}">${escapeHtml(title)}${escapeHtml(suffix)}</option>`;
      })
      .join("");
    const selectedId = $adminFeatureSelect.value || state.activeFeatureId;
    $adminFeatureSelect.innerHTML = list;
    if ([...$adminFeatureSelect.options].some((option) => option.value === selectedId)) {
      $adminFeatureSelect.value = selectedId;
    }
  }

  function updateAdminPreviewForFeature(f) {
    const effTitle = getEffectiveTitle(f);
    const overrideImg = getEffectiveImage(f);
    const img = overrideImg || (f.pages && f.pages[0] && f.pages[0].image) || f.thumb || "";
    if (!img) {
      $adminPreviewImg.removeAttribute("src");
      $adminPreviewImg.alt = "";
    } else {
      $adminPreviewImg.src = img.startsWith("data:") ? img : `./${img}`;
      $adminPreviewImg.alt = effTitle;
    }
    const pin = getEffectivePin(f);
    $adminPreviewPin.textContent = pin ? `xPct:${Number(pin.xPct).toFixed(1)}, yPct:${Number(pin.yPct).toFixed(1)}` : "—";
  }

  function updateNewPreview() {
    const imgFile = ($newImage.files && $newImage.files[0]) || null;
    if (!imgFile) {
      $newPreviewImg.removeAttribute("src");
      $newPreviewImg.alt = "";
    } else {
      fileToDataUrl(imgFile)
        .then((url) => {
          $newPreviewImg.src = url;
          $newPreviewImg.alt = ($newTitle.value || "New feature").trim();
        })
        .catch(() => {
          // ignore
        });
    }
    const x = String($newPinX.value || "").trim();
    const y = String($newPinY.value || "").trim();
    $newPreviewPin.textContent = x && y ? `xPct:${Number(x).toFixed(1)}, yPct:${Number(y).toFixed(1)}` : "—";
  }

  function loadAdminFormFromSelected() {
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;

    const o = loadOverrides(id) || {};
    const effPin = getEffectivePin(f);
    $adminTitle.value = getEffectiveTitle(f);
    // Prefill with current story: override > custom story > generated narrative (as plain text)
    const overrideStory = (o && typeof o.story === "string" ? o.story : "") || "";
    if (overrideStory) {
      $adminStory.value = overrideStory;
    } else if (typeof f.story === "string" && f.story.trim()) {
      $adminStory.value = f.story.trim();
    } else {
      // Generate the same narrative shown in the modal, then strip HTML tags for editing.
      const html = generateNarrative({ ...f, title: getEffectiveTitle(f), tags: getEffectiveTags(f) });
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      $adminStory.value = (tmp.textContent || "").trim();
    }
    $adminTags.value = getEffectiveTags(f).join(", ");
    $adminPinLabel.value = (effPin && effPin.label) || "";
    $adminPinX.value = effPin ? String(effPin.xPct) : "";
    $adminPinY.value = effPin ? String(effPin.yPct) : "";
    $adminImage.value = "";
    $adminSaveStatus.textContent = "";
    updateAdminPreviewForFeature(f);
    const hidden = isHidden(f);
    $adminToggleHidden.textContent = hidden ? "Show feature" : "Hide feature";
    renderAdminGallery(f);
  }

  function setEditing(on) {
    isEditingFeature = !!on;
    $adminContentCard.hidden = !isEditingFeature;
    $adminMapCard.hidden = !isEditingFeature;
    $adminEditActions.hidden = !isEditingFeature;
    $adminEditToggle.textContent = isEditingFeature ? "Done" : "Edit";
  }

  function refreshFromStorage() {
    features = [...baseFeatures, ...loadCustomFeatures().map((f) => ({ ...f, isCustom: true }))];
    renderMapPins();
    renderTagButtons();
    renderGrid();
    if (isAdmin) {
      hydrateAdminSelect();
    }
  }

  function renderAdminGallery(feature) {
    const items = getEffectiveGallery(feature);
    $adminGalleryList.innerHTML = items
      .map((it, idx) => {
        const src = resolveImg(it.url);
        return `<div class="admin-gallery__item">
          <img src="${src}" alt="" loading="lazy" />
          <button class="admin-gallery__x" type="button" data-gallery-remove="${escapeHtml(String(idx))}" aria-label="Remove photo">×</button>
        </div>`;
      })
      .join("");
  }

  function setAdminTab(which) {
    const isEdit = which === "edit";
    adminActiveTab = isEdit ? "edit" : "new";
    $adminTabEdit.classList.toggle("is-active", isEdit);
    $adminTabAdd.classList.toggle("is-active", !isEdit);
    $adminTabEdit.setAttribute("aria-selected", isEdit ? "true" : "false");
    $adminTabAdd.setAttribute("aria-selected", !isEdit ? "true" : "false");
    $adminEditView.hidden = !isEdit;
    $adminAddView.hidden = isEdit;
    $adminEditView.setAttribute("aria-hidden", isEdit ? "false" : "true");
    $adminAddView.setAttribute("aria-hidden", isEdit ? "true" : "false");
  }

  function setPickMode(mode) {
    pickMode = mode; // "edit" | "new" | null
    document.body.classList.toggle("is-picking-pin", !!pickMode);
    if (pickMode && isAdmin) {
      $mapHud.hidden = false;
      setHudStatus("Pick mode: click the map to set pin coordinates");
    }
  }

  function allEffectiveTags() {
    return unique(features.flatMap((f) => getEffectiveTags(f))).sort((a, b) => a.localeCompare(b));
  }

  function matches(f) {
    const q = normalize(state.q);
    const tags = state.tags;
    const effTags = getEffectiveTags(f);
    const hay = normalize([getEffectiveTitle(f), getEffectiveStoryText(f), f.description, f.text, effTags.join(" "), f.sourcePdf].join(" "));
    const qOk = !q || hay.includes(q);
    const tagOk = tags.size === 0 || effTags.some((t) => tags.has(t));
    return qOk && tagOk;
  }

  function setModalOpenState(open) {
    document.body.classList.toggle("is-modal-open", !!open);
  }

  function filteredFeatureIds() {
    return features
      .filter((f) => !isDeleted(f))
      .filter((f) => !isHidden(f))
      .filter(matches)
      .sort((a, b) => getEffectiveTitle(a).localeCompare(getEffectiveTitle(b)))
      .map((f) => f.id);
  }

  function updateModalPrevNextButtons() {
    const ids = filteredFeatureIds();
    const idx = state.activeFeatureId ? ids.indexOf(state.activeFeatureId) : -1;
    const hasMany = ids.length > 1 && idx >= 0;
    $modalPrevFeature.disabled = !hasMany;
    $modalNextFeature.disabled = !hasMany;
    $modalPrevFeature.hidden = ids.length <= 1;
    $modalNextFeature.hidden = ids.length <= 1;
  }

  function renderTagButtons() {
    const tags = allEffectiveTags();
    const buttons = tags.map((tag) => {
      const active = state.tags.has(tag);
      return `<button class="chip" type="button" aria-pressed="${active}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    });
    $tagList.innerHTML = buttons.join("");
  }

  function renderGrid() {
    const filtered = features.filter((f) => !isDeleted(f)).filter((f) => !isHidden(f)).filter(matches);
    $clearFilters.hidden = !state.tags.size && !state.q;
    $tagToggle.textContent = state.tags.size ? `Filters (${state.tags.size})` : "Filters";
    $resultMeta.textContent = `${filtered.length} feature${filtered.length === 1 ? "" : "s"} showing`;

    if (filtered.length === 0) {
      $grid.innerHTML = `<div class="panel" style="grid-column:1 / -1">
        <div class="panel__title">No matches</div>
        <div class="panel__meta">Try clearing tags or using a shorter search.</div>
      </div>`;
      return;
    }

    $grid.innerHTML = filtered
      .map((f) => {
        const preview = (f.pages && f.pages[0] && f.pages[0].textPreview) || "";
        const tags = getEffectiveTags(f).slice(0, 3);
        const title = getEffectiveTitle(f);
        const overrideImg = getEffectiveImage(f);
        const cardImg = overrideImg || f.thumb;
        const pin = getEffectivePin(f);
        const mapNumber = pin ? ` data-map-number="${pin.mapNumber}"` : "";
        const titleHtml = highlightPlain(title, state.q);
        const previewHtml = highlightPlain(preview || "Open to read more…", state.q);
        return `
          <article class="card" role="button" tabindex="0" data-id="${escapeHtml(f.id)}"${mapNumber} aria-label="Open ${escapeHtml(
          title
        )}">
            <img class="card__img" src="${cardImg.startsWith("data:") ? cardImg : `./${escapeHtml(cardImg)}`}" alt="" loading="lazy" />
            <div class="card__body">
              <div class="card__title">${titleHtml}</div>
              <div class="card__sub">${previewHtml}</div>
              <div class="card__chips">
                ${tags.map((t) => `<span class="mini">${escapeHtml(t)}</span>`).join("")}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function resolveImg(url) {
    if (!url) return "";
    return url.startsWith("data:") ? url : `./${url}`;
  }

  function renderSeasonal(feature) {
    const seasonalNotes =
      feature &&
      feature.seasonalNotes &&
      typeof feature.seasonalNotes === "object" &&
      typeof feature.seasonalNotes.Spring === "string" &&
      typeof feature.seasonalNotes.Summer === "string" &&
      typeof feature.seasonalNotes.Autumn === "string" &&
      typeof feature.seasonalNotes.Winter === "string"
        ? feature.seasonalNotes
        : guessSeasonalNotes(feature);

    const seasons = ["Spring", "Summer", "Autumn", "Winter"];
    $modalSeasonal.innerHTML = seasons.map((season) =>
      `<div><dt>${season}</dt><dd>${escapeHtml(seasonalNotes[season])}</dd></div>`
    ).join("");
  }

  const $study = el("photoStudy");
  const galleryState = { items: [], idx: 0, board: null, study: null };
  const $stage = el("galleryStage");
  const $zoom = el("featureZoom");
  const $zoomImage = el("featureZoomImage");
  const $viewport = el("featureZoomViewport");
  const $zoomScale = el("featureZoomScale");

  function isTypingInField() {
    return document.activeElement?.matches("input, textarea, select, [contenteditable=true]");
  }

  function setGalleryIndex(nextIdx) {
    const { items } = galleryState;
    if (!items.length) return;
    const idx = ((nextIdx % items.length) + items.length) % items.length;
    galleryState.idx = idx;
    const item = items[idx];
    $modalBoardImg.src = item.src;
    $modalBoardImg.alt = item.caption;
    $stage.toggleAttribute("data-board", item.isBoard === true);
    el("galleryCaption").textContent = item.caption;
    $galleryCounter.textContent = `${idx + 1} / ${items.length}`;
    $galleryPrev.hidden = $galleryNext.hidden = $modalGallery.hidden = items.length < 2;
    for (const button of $modalGallery.children) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.idx) === idx));
    }
    // Move only the filmstrip. Scrolling the document would lose the reader’s place.
    const thumb = $modalGallery.children[idx];
    if (thumb && $modal.open) {
      const stripBounds = $modalGallery.getBoundingClientRect();
      const bounds = thumb.getBoundingClientRect();
      if (bounds.left < stripBounds.left) $modalGallery.scrollLeft += bounds.left - stripBounds.left - 3;
      if (bounds.right > stripBounds.right) $modalGallery.scrollLeft += bounds.right - stripBounds.right + 3;
    }
  }

  function renderGallery(feature) {
    const title = getEffectiveTitle(feature);
    const primaryUrl = feature.isCustom ? "" : feature.pages?.[0]?.image || feature.thumb;
    const titleImage = getEffectiveImage(feature);
    galleryState.study = window.__FEATURE_STUDIES__?.[feature.id];
    const detailByUrl = new Map(galleryState.study?.photos.map((photo) => [
      `assets/features/${feature.id}/${photo.file}`, photo
    ]));
    // Some features use a dated photograph in the primary image slot.
    const primaryIsPhoto = detailByUrl.has(primaryUrl);
    const boardUrl = primaryIsPhoto ? "" : primaryUrl;
    const captions = new Map(getEffectiveGallery(feature).map(item => [item.url, item.caption]));
    const photos = unique([titleImage, ...captions.keys(), primaryIsPhoto && primaryUrl]
      .filter((url) => url && url !== boardUrl));
    const items = photos.map((url, idx) => {
      const detail = detailByUrl.get(url);
      return { src: resolveImg(url), detail, caption: detail?.caption || captions.get(url) || `${title} · photograph ${idx + 1}` };
    });
    el("featureStudyActions").hidden = !items.some((item) => item.detail);
    const board = boardUrl ? { src: resolveImg(boardUrl), caption: `${title} · original field board`, isBoard: true } : null;
    if (board) items.push(board);
    galleryState.items = items;
    galleryState.board = board;
    $stage.closest("figure").hidden = !items.length;
    $modalGallery.innerHTML = items.map((item, idx) =>
      `<button type="button" data-idx="${idx}" aria-label="${escapeHtml(item.caption)}">
        <img src="${escapeHtml(item.src)}" alt="" loading="lazy" />
      </button>`
    ).join("");
    $modalGallery.scrollLeft = 0;
    el("featureSource").hidden = !board && !feature.text;
    el("featureBoard").hidden = !board;
    if (board) el("featureBoardThumb").src = board.src;
    const transcript = el("featureTranscript");
    transcript.open = false;
    transcript.hidden = !feature.text?.trim();
    el("featureBoardText").innerHTML = feature.text ? toParagraphs(feature.text, state.q) : "";
    setGalleryIndex(0);
  }

  function setMagnified(on, origin) {
    const width = $viewport.clientWidth;
    const height = $viewport.clientHeight;
    const imageWidth = $zoomImage.naturalWidth;
    const imageHeight = $zoomImage.naturalHeight;
    if (!on) {
      $viewport.classList.remove("is-magnified");
      $zoomScale.setAttribute("aria-pressed", "false");
      $zoomScale.textContent = "Zoom in ＋";
      $viewport.scrollTo(0, 0);
      return;
    }
    if (!(imageWidth && imageHeight)) return;
    // Start at the selected point, including the letterbox margins in the fit view.
    const fit = Math.min(width / imageWidth, height / imageHeight);
    const fitWidth = imageWidth * fit;
    const fitHeight = imageHeight * fit;
    const point = origin || { x: width / 2, y: height / 2 };
    const x = Math.max(0, Math.min(1, (point.x - (width - fitWidth) / 2) / fitWidth));
    const y = Math.max(0, Math.min(1, (point.y - (height - fitHeight) / 2) / fitHeight));
    const zoomWidth = Math.max(imageWidth, fitWidth * 2);
    $viewport.style.setProperty("--zoom-width", `${zoomWidth}px`);
    $viewport.classList.add("is-magnified");
    $zoomScale.setAttribute("aria-pressed", "true");
    $zoomScale.textContent = "Fit image";
    $viewport.scrollLeft = x * zoomWidth - point.x;
    $viewport.scrollTop = y * zoomWidth * imageHeight / imageWidth - point.y;
  }

  function openZoom(item) {
    if (!item) return;
    el("featureZoomCaption").textContent = item.caption;
    $zoomImage.alt = item.caption;
    $zoomImage.src = item.src;
    $zoom.showModal();
    setMagnified(false);
  }
  $stage.addEventListener("click", () => openZoom(galleryState.items[galleryState.idx]));
  el("featureBoard").addEventListener("click", () => openZoom(galleryState.board));
  el("featureZoomClose").addEventListener("click", () => $zoom.close());
  $zoomScale.addEventListener("click", () => setMagnified(!$viewport.classList.contains("is-magnified")));
  $zoomImage.addEventListener("click", (event) => {
    const bounds = $viewport.getBoundingClientRect();
    setMagnified(!$viewport.classList.contains("is-magnified"), { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  });

  let studyItems = [];
  let studyIndex = 0;
  let pairs = [];

  function selectStudyPhoto(index) {
    studyIndex = (index + studyItems.length) % studyItems.length;
    const item = studyItems[studyIndex];
    const { title, date, note, dateSource } = item.detail;
    el("studyImage").src = item.src;
    el("studyImage").alt = item.caption;
    el("studyTitle").textContent = title;
    el("studyNote").textContent = note;
    el("studyDate").textContent = date;
    el("studyDateSource").textContent = dateSource || "";
    el("studyCount").textContent = `${studyIndex + 1} / ${studyItems.length}`;
    const strip = el("studyStrip");
    Array.from(strip.children).forEach((button, i) => button.setAttribute("aria-pressed", String(i === studyIndex)));
    const thumb = strip.children[studyIndex];
    strip.scrollLeft = thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2;
    setGalleryIndex(galleryState.items.indexOf(item));
  }

  function renderPair() {
    const pair = pairs[el("studyPairSelect").selectedIndex];
    if (!pair) return;
    el("studyPairImages").innerHTML = pair.items.map((item, i) =>
      `<figure>
        <figcaption><span class="study-date">${escapeHtml(item.detail.date)}</span>
          <h3>${escapeHtml(item.detail.title)}</h3></figcaption>
        <button class="study-image" type="button" data-pair-index="${i}" aria-label="Enlarge: ${escapeHtml(item.detail.title)}">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption)}" />
          <span class="study-expand" aria-hidden="true">Enlarge ↗</span>
        </button>
        ${item.detail.dateSource ? `<small>${escapeHtml(item.detail.dateSource)}</small>` : ""}
      </figure>`
    ).join("");
    el("studyPairNote").textContent = pair.note;
  }

  function setStudyMode(compare) {
    el("studyCompareMode").setAttribute("aria-pressed", String(compare));
    el("studyBrowseMode").setAttribute("aria-pressed", String(!compare));
    el("studyPairs").hidden = !compare;
    el("studyBrowse").hidden = compare;
    if (compare) renderPair();
    else selectStudyPhoto(studyIndex);
  }

  function openStudy(compare) {
    const study = galleryState.study;
    if (!study) return;
    const available = new Map(galleryState.items.filter((item) => item.detail).map((item) => [item.detail.file, item]));
    studyItems = study.photos.map((photo) => available.get(photo.file)).filter(Boolean);
    if (!studyItems.length) return;
    pairs = study.comparisons.map((pair) => ({ ...pair, items: pair.files.map((file) => available.get(file)) }))
      .filter((pair) => pair.items.every(Boolean));
    el("studyCompareMode").disabled = !pairs.length;
    el("studyPairSelect").replaceChildren(...pairs.map((pair) => new Option(pair.title)));
    el("studyName").textContent = $modalTitle.textContent;
    el("studyStrip").innerHTML = studyItems.map((item, i) =>
      `<button type="button" data-study-index="${i}" aria-label="${escapeHtml(item.detail.date + ' · ' + item.detail.title)}">
        <img src="${escapeHtml(item.src)}" alt="" loading="lazy" /></button>`
    ).join("");
    studyIndex = Math.max(0, studyItems.indexOf(galleryState.items[galleryState.idx]));
    $study.showModal();
    setStudyMode(compare && pairs.length > 0);
    $study.scrollTop = 0;
  }

  el("studyOpen").addEventListener("click", () => openStudy(false));
  el("studyCompare").addEventListener("click", () => openStudy(true));
  el("studyClose").addEventListener("click", () => $study.close());
  el("studyBrowseMode").addEventListener("click", () => setStudyMode(false));
  el("studyCompareMode").addEventListener("click", () => setStudyMode(true));
  el("studyPrev").addEventListener("click", () => selectStudyPhoto(studyIndex - 1));
  el("studyNext").addEventListener("click", () => selectStudyPhoto(studyIndex + 1));
  el("studyStrip").addEventListener("click", (event) => {
    const button = event.target.closest("[data-study-index]");
    if (button) selectStudyPhoto(Number(button.dataset.studyIndex));
  });
  el("studyMagnify").addEventListener("click", () => openZoom(studyItems[studyIndex]));
  el("studyPairSelect").addEventListener("change", renderPair);
  el("studyPairImages").addEventListener("click", (event) => {
    const button = event.target.closest("[data-pair-index]");
    if (button) openZoom(pairs[el("studyPairSelect").selectedIndex].items[Number(button.dataset.pairIndex)]);
  });
  $study.addEventListener("keydown", (event) => {
    if (el("studyBrowse").hidden || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    selectStudyPhoto(studyIndex + (event.key === "ArrowRight" ? 1 : -1));
    if (el("studyStrip").contains(document.activeElement)) el("studyStrip").children[studyIndex].focus({ preventScroll: true });
  });

  function updateTourUI() {
    $tourPanel.hidden = !tour.active;
    $btnTour.textContent = tour.active ? "Tour (on)" : "Tour";
    const len = tour.ids.length;
    $tourPanelPrev.disabled = !tour.active || len < 2;
    $tourPanelNext.disabled = !tour.active || len < 2;
  }

  function startTour() {
    const ids = features
      .filter((f) => !isDeleted(f))
      .filter((f) => !isHidden(f))
      .filter((f) => !!getEffectivePin(f))
      .sort((a, b) => getEffectiveTitle(a).localeCompare(getEffectiveTitle(b)))
      .map((f) => f.id);
    if (ids.length === 0) return;
    tour.active = true;
    tour.ids = ids;
    tour.idx = 0;
    updateTourUI();
    openTourStep(0, null);
  }

  function endTour() {
    tour.active = false;
    tour.ids = [];
    tour.idx = 0;
    updateTourUI();
  }

  function pinPointForFeatureId(featureId) {
    const f = features.find((x) => x.id === featureId);
    if (!f) return null;
    const pin = getEffectivePin(f);
    if (!pin) return null;
    return { xPct: pin.xPct, yPct: pin.yPct };
  }

  function animatePath(fromId, toId) {
    const a = pinPointForFeatureId(fromId);
    const b = pinPointForFeatureId(toId);
    if (!a || !b) {
      $tourPath.setAttribute("d", "");
      $tourLayer.classList.remove("is-animating");
      return;
    }
    // Use percentage-based SVG (viewBox 0..100) so it scales with the map.
    const d = `M ${a.xPct} ${a.yPct} L ${b.xPct} ${b.yPct}`;
    $tourPath.setAttribute("d", d);
    // Restart animation
    $tourLayer.classList.remove("is-animating");
    void $tourLayer.offsetWidth; // force reflow
    $tourLayer.classList.add("is-animating");
    window.setTimeout(() => $tourLayer.classList.remove("is-animating"), 1000);
  }

  function setTourCurrentPin(featureId) {
    Array.from($mapPins.querySelectorAll(".pin")).forEach((p) => {
      p.classList.toggle("is-tour-current", p.dataset.featureId === featureId);
    });
  }

  function openTourStep(nextIdx, fromId) {
    if (!tour.active) return;
    const len = tour.ids.length;
    if (len === 0) return;
    const idx = (nextIdx + len) % len;
    tour.idx = idx;
    const id = tour.ids[idx];
    const f = features.find((x) => x.id === id);
    if (!f) return;

    // Panel content
    $tourPanelTitle.textContent = getEffectiveTitle(f);
    $tourPanelMeta.textContent = `Stop ${idx + 1} of ${len}`;
    const snippet =
      (f.pages && f.pages[0] && f.pages[0].textPreview) ||
      (getEffectiveStoryText(f) || "").slice(0, 220) ||
      "";
    $tourPanelText.textContent = snippet ? snippet.replace(/\s+/g, " ").trim() : "Click “Open details” to read more.";
    setTourCurrentPin(id);

    // Animate path from previous to current
    if (fromId && fromId !== id) animatePath(fromId, id);
    else $tourPath.setAttribute("d", "");

    // Mark visited
    if (!visited.has(id)) {
      visited.add(id);
      saveVisited(visited);
      renderMapPins();
      setTourCurrentPin(id);
    }

    updateTourUI();
    $mapPins.dispatchEvent(new Event("hooke:tour-stop"));
  }

  function renderModalTags(feature) {
    const tags = getEffectiveTags(feature);
    $modalTags.innerHTML = tags
      .map(
        (t) =>
          `<span class="tag-pill" data-tag-pill="${escapeHtml(t)}">${escapeHtml(t)}<button class="tag-pill__x" type="button" data-tag-remove="${escapeHtml(
            t
          )}" aria-label="Remove tag ${escapeHtml(t)}">×</button></span>`
      )
      .join("");
  }

  const baseTitle = document.title;
  let readingOrigin = null;

  function featureFromUrl() {
    const url = new URL(location.href);
    return url.searchParams.get("feature") || new URLSearchParams(url.hash.slice(1)).get("feature");
  }

  function recordFeatureUrl(featureId, replace) {
    const url = new URL(location.href);
    if (featureFromUrl() === featureId) return;
    if (featureId) url.searchParams.set("feature", featureId);
    else url.searchParams.delete("feature");
    if (url.hash.startsWith("#feature=")) url.hash = "";
    const method = replace ? "replaceState" : "pushState";
    const entry = { ...history.state, hookeFeatureOpened: featureId && (!replace || history.state?.hookeFeatureOpened) };
    try {
      history[method](entry, "", url);
    } catch {
      // Some browsers restrict query-string history updates for a file opened directly from disk.
      const fileUrl = new URL(location.href);
      fileUrl.hash = featureId ? `feature=${encodeURIComponent(featureId)}` : "";
      history[method](entry, "", fileUrl);
    }
  }

  function openFeature(featureId, { fromUrl = false } = {}) {
    const f = features.find((x) => x.id === featureId);
    if (!f || isDeleted(f) || (isHidden(f) && !isAdmin)) return;
    if ($zoom.open) $zoom.close();
    if ($study.open) $study.close();
    if (!$modal.open) {
      const trigger = document.activeElement;
      const referrer = document.referrer && new URL(document.referrer);
      const fromFarmPage = fromUrl && !history.state?.hookeFeatureOpened && referrer &&
        referrer.origin === location.origin && referrer.pathname !== location.pathname && history.length > 1;
      readingOrigin = { x: window.scrollX, y: window.scrollY, trigger, pinId: trigger?.dataset.featureId, fromFarmPage };
      el("featureBackLabel").textContent = fromFarmPage ? "Go back" : $adminDialog.open ? "Back to editor" : "Back to explore";
    }
    if (!fromUrl) recordFeatureUrl(featureId, $modal.open);
    state.activeFeatureId = featureId;
    const effTitle = getEffectiveTitle(f);
    $modalTitle.textContent = effTitle;
    document.title = `${effTitle} · Hooke Farm Wilding`;

    const lead = f.id === "the-bat-egg"
      ? "Stone carver Tom Clark built this roost from waste stone in 2021. Bats visited the cave inside, but never settled. The farm is letting wildflowers grow over the fallen stonework."
      : f.description?.trim() || "";
    const preview = f.pages?.[0]?.textPreview || "";
    $modalDesc.innerHTML = lead ? toParagraphs(lead, state.q) : "";
    // Use the board's first complete sentence when the archive has no separate description.
    if (!lead && preview) {
      const sentence = preview.replace(/\s+/g, " ").trim().match(/^.*?[.!?](?:\s|$)/)?.[0];
      if (sentence) $modalDesc.innerHTML = toParagraphs(sentence, state.q);
    }
    $modalDesc.hidden = !$modalDesc.innerHTML;
    el("batEggAccess").hidden = f.id !== "the-bat-egg";
    const fWithTags = { ...f, title: effTitle, tags: getEffectiveTags(f) };
    const storyOverride = getEffectiveStoryText(f);
    $modalNarrative.innerHTML = storyOverride ? toParagraphs(storyOverride, state.q) : generateNarrative(fWithTags);
    const source = el("featureStorySource");
    source.hidden = !f.storySource;
    if (f.storySource) {
      source.href = f.storySource.url;
      source.textContent = f.storySource.title;
    } else {
      source.removeAttribute("href");
      source.textContent = "";
    }
    renderSeasonal(f);
    renderGallery(f);
    renderModalTags(f);
    $tagInput.value = "";
    // Visited state (pins)
    if (!visited.has(featureId)) {
      visited.add(featureId);
      saveVisited(visited);
      renderMapPins();
    }
    // Tour state: keep panel in sync if open
    if (tour.active) {
      const idx = tour.ids.indexOf(featureId);
      if (idx >= 0) openTourStep(idx, null);
    } else {
      updateTourUI();
    }
    if (!$modal.open) $modal.showModal();
    $modal.scrollTop = 0;
    setModalOpenState(true);
    updateModalPrevNextButtons();
  }

  // --- Map HUD hover + click-to-copy (kept, since the DOM is present) ---
  function updateHudFromEvent(e) {
    const rect = $mapPins.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const xPct = Math.max(0, Math.min(100, x));
    const yPct = Math.max(0, Math.min(100, y));
    $hudX.textContent = xPct.toFixed(1);
    $hudY.textContent = yPct.toFixed(1);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch {
        return false;
      }
    }
  }

  let hudTimer = null;
  function setHudStatus(msg) {
    $hudStatus.textContent = msg;
    if (hudTimer) window.clearTimeout(hudTimer);
    hudTimer = window.setTimeout(() => {
      $hudStatus.textContent = "Click the map to copy x/y%.";
      hudTimer = null;
    }, 1400);
  }

  // Map interactions:
  // - Pins always clickable (public)
  // - Coordinate HUD + click-to-copy only in admin mode
  $mapPins.addEventListener("mouseenter", () => {
    if (!isAdmin) return;
    $mapHud.hidden = false;
  });
  $mapPins.addEventListener("mouseleave", () => {
    if (!isAdmin) return;
    if (pickMode) return; // keep visible while picking
    $mapHud.hidden = true;
  });
  $mapPins.addEventListener("mousemove", (e) => {
    if (!isAdmin) return;
    updateHudFromEvent(e);
  });
  $mapPins.addEventListener("click", async (e) => {
    // Admin pin-pick mode: click map to fill x/y fields (no clipboard copy)
    if (pickMode === "edit" || pickMode === "new") {
      // pickMode is only ever enabled in admin mode, but guard just in case
      if (!isAdmin) return;
      const mode = pickMode;
      updateHudFromEvent(e);
      const x = $hudX.textContent;
      const y = $hudY.textContent;
      if (mode === "edit") {
        $adminPinX.value = x;
        $adminPinY.value = y;
        $adminPreviewPin.textContent = `xPct:${Number(x).toFixed(1)}, yPct:${Number(y).toFixed(1)}`;
        $adminPickStatus.textContent = "Normal";
        $adminPickStatus.classList.remove("is-picking");
      } else {
        $newPinX.value = x;
        $newPinY.value = y;
        updateNewPreview();
        $newPickStatus.textContent = "Normal";
        $newPickStatus.classList.remove("is-picking");
      }
      setPickMode(null);
      setHudStatus(`Pin set: xPct:${x}, yPct:${y}`);
      // Re-open admin dialog on the same tab after picking.
      setAdminTab(mode === "edit" ? "edit" : "new");
      openAdminDialog({ preserveForm: true });
      return;
    }

    // Pins: always open feature (admin + non-admin)
    const pin = e.target.closest(".pin[data-feature-id]");
    if (pin) {
      openFeature(pin.dataset.featureId);
      return;
    }

    // Non-admin: no coordinate tools
    if (!isAdmin) return;

    updateHudFromEvent(e);
    const text = `xPct:${$hudX.textContent}, yPct:${$hudY.textContent}`;
    const ok = await copyToClipboard(text);
    setHudStatus(ok ? `Copied: ${text}` : `Copy blocked — use: ${text}`);
  });

  // Hide/show pins (overlay remains active for HUD + click-to-copy).
  function setPinsHidden(hidden) {
    $mapPins.classList.toggle("hide-pins", hidden);
    $togglePins.textContent = hidden ? "Show pins" : "Hide pins";
    $togglePins.setAttribute("aria-pressed", hidden ? "true" : "false");
  }
  let pinsHidden = false;
  $togglePins.addEventListener("click", () => {
    pinsHidden = !pinsHidden;
    setPinsHidden(pinsHidden);
  });

  // Initial render
  renderMapPins();
  setPinsHidden(false);
  renderTagButtons();
  renderGrid();

  // Admin boot (session-based)
  setAdminMode(readAdminPersisted());
  setAdminTab(adminActiveTab);
  setEditing(false);
  if (!isAdmin) {
    // Ensure admin-only tools are not active/visible
    $mapHud.hidden = true;
  }

  function unlockAdmin() {
    const pw = $adminPassword.value || "";
    if (pw !== ADMIN_PASSWORD) {
      $adminStatus.textContent = "Incorrect password.";
      return;
    }
    persistAdmin(true);
    setAdminMode(true);
    $adminStatus.textContent = "";
    $adminLoginView.hidden = true;
    $adminPanelView.hidden = false;
    hydrateAdminSelect();
    loadAdminFormFromSelected();
    // Focus the select for quick editing
    $adminFeatureSelect.focus();
  }

  $btnAdmin.addEventListener("click", () => {
    openAdminDialog();
  });
  $adminClose.addEventListener("click", () => closeDialog($adminDialog));
  $adminDialog.addEventListener("click", (e) => {
    if (e.target === $adminDialog) closeDialog($adminDialog);
  });
  $adminUnlock.addEventListener("click", unlockAdmin);
  $adminPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlockAdmin();
  });
  $adminLock.addEventListener("click", () => {
    persistAdmin(false);
    setAdminMode(false);
    closeDialog($adminDialog);
  });
  $adminFeatureSearch.addEventListener("input", () => {
    if (!isAdmin) return;
    hydrateAdminSelect();
    loadAdminFormFromSelected();
  });
  $adminFeatureSelect.addEventListener("change", loadAdminFormFromSelected);

  $adminTabEdit.addEventListener("click", () => setAdminTab("edit"));
  $adminTabAdd.addEventListener("click", () => setAdminTab("new"));

  $adminOpenFeature.addEventListener("click", () => {
    if (!isAdmin) return;
    const id = $adminFeatureSelect.value;
    if (id) openFeature(id);
  });

  $adminEditToggle.addEventListener("click", () => {
    if (!isAdmin) return;
    // toggles visibility of edit sections; does not save automatically
    setEditing(!isEditingFeature);
  });

  $adminPickPin.addEventListener("click", () => {
    if (!isAdmin) return;
    if (!isEditingFeature) setEditing(true);
    setAdminTab("edit");
    setPickMode("edit");
    $adminPickStatus.textContent = "Click map…";
    $adminPickStatus.classList.add("is-picking");
    $mapHud.hidden = false;
    closeDialog($adminDialog);
  });

  $newPickPin.addEventListener("click", () => {
    if (!isAdmin) return;
    setAdminTab("new");
    setPickMode("new");
    $newPickStatus.textContent = "Click map…";
    $newPickStatus.classList.add("is-picking");
    $mapHud.hidden = false;
    closeDialog($adminDialog);
  });

  $adminImage.addEventListener("change", () => {
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;
    const file = ($adminImage.files && $adminImage.files[0]) || null;
    if (!file) {
      updateAdminPreviewForFeature(f);
      return;
    }
    fileToDataUrl(file)
      .then((url) => {
        $adminPreviewImg.src = url;
        $adminPreviewImg.alt = getEffectiveTitle(f);
      })
      .catch(() => {
        // ignore
      });
  });

  $adminGalleryAdd.addEventListener("change", () => {
    if (!isAdmin) return;
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    const files = Array.from(($adminGalleryAdd.files && $adminGalleryAdd.files) || []);
    if (!f || files.length === 0) return;

    Promise.all(files.map((file) => fileToDataUrl(file)))
      .then((urls) => {
        const additions = urls
          .filter(Boolean)
          .map((url) => ({ id: `g-${Date.now()}-${Math.random().toString(16).slice(2)}`, url }));

        if (f.isCustom) {
          const list = loadCustomFeatures();
          const idx = list.findIndex((x) => x.id === id);
          if (idx >= 0) {
            const cur = Array.isArray(list[idx].gallery) ? list[idx].gallery : [];
            list[idx] = { ...list[idx], gallery: [...cur, ...additions] };
            saveCustomFeatures(list);
          }
        } else {
          const o = loadOverrides(id) || {};
          const cur = Array.isArray(o.gallery) ? o.gallery : [];
          saveOverrides(id, { ...o, gallery: [...cur, ...additions] });
        }

        $adminGalleryAdd.value = "";
        refreshFromStorage();
        const nextF = features.find((x) => x.id === id);
        if (nextF) renderAdminGallery(nextF);
        if (state.activeFeatureId === id) openFeature(id);
      })
      .catch(() => {
        // ignore
      });
  });

  $adminGalleryList.addEventListener("click", (e) => {
    if (!isAdmin) return;
    const btn = e.target.closest("[data-gallery-remove]");
    if (!btn) return;
    const idx = Number(btn.dataset.galleryRemove);
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f || !Number.isFinite(idx)) return;

    if (f.isCustom) {
      const list = loadCustomFeatures();
      const fi = list.findIndex((x) => x.id === id);
      if (fi >= 0) {
        const cur = Array.isArray(list[fi].gallery) ? list[fi].gallery : [];
        list[fi] = { ...list[fi], gallery: cur.filter((_, i) => i !== idx) };
        saveCustomFeatures(list);
      }
    } else {
      const o = loadOverrides(id) || {};
      const cur = Array.isArray(o.gallery) ? o.gallery : [];
      saveOverrides(id, { ...o, gallery: cur.filter((_, i) => i !== idx) });
    }

    refreshFromStorage();
    const nextF = features.find((x) => x.id === id);
    if (nextF) renderAdminGallery(nextF);
    if (state.activeFeatureId === id) openFeature(id);
  });

  $newImage.addEventListener("change", updateNewPreview);
  $newTitle.addEventListener("input", updateNewPreview);
  $newPinX.addEventListener("input", updateNewPreview);
  $newPinY.addEventListener("input", updateNewPreview);

  // Live preview updates for edit tab
  function updateEditPinPreview() {
    const x = String($adminPinX.value || "").trim();
    const y = String($adminPinY.value || "").trim();
    $adminPreviewPin.textContent = x && y ? `xPct:${Number(x).toFixed(1)}, yPct:${Number(y).toFixed(1)}` : "—";
  }
  $adminPinX.addEventListener("input", updateEditPinPreview);
  $adminPinY.addEventListener("input", updateEditPinPreview);
  $adminPinLabel.addEventListener("input", () => {
    // no-op for preview (label is visible on map), but keep status pill calm
  });

  async function saveExistingFeature() {
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;

    const title = ($adminTitle.value || "").trim();
    const story = ($adminStory.value || "").trim();
    const pinLabel = ($adminPinLabel.value || "").trim();
    const xRaw = String($adminPinX.value || "").trim();
    const yRaw = String($adminPinY.value || "").trim();
    const xPct = xRaw === "" ? null : Number(xRaw);
    const yPct = yRaw === "" ? null : Number(yRaw);
    const tags = parseTagsCsv($adminTags.value || "");

    const imgFile = ($adminImage.files && $adminImage.files[0]) || null;
    const imageDataUrl = imgFile ? await fileToDataUrl(imgFile) : "";

    if (f.isCustom) {
      const list = loadCustomFeatures();
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          title: title || list[idx].title,
          story: story || "",
          tags,
          hidden: list[idx].hidden === true ? true : false,
          pin:
            typeof xPct === "number" && typeof yPct === "number"
              ? { label: pinLabel || title || list[idx].title, xPct, yPct }
              : list[idx].pin || null,
          imageDataUrl: imageDataUrl || list[idx].imageDataUrl || "",
          thumb: imageDataUrl || list[idx].thumb || list[idx].imageDataUrl || list[idx].thumb,
          pages: [
            {
              pageNumber: 1,
              image: imageDataUrl || list[idx].imageDataUrl || (list[idx].pages && list[idx].pages[0] && list[idx].pages[0].image) || list[idx].thumb,
              width: 0,
              height: 0,
              textPreview: "",
            },
          ],
          sourcePdf: list[idx].sourcePdf || "Custom",
        };
        saveCustomFeatures(list);
      }
      // keep overrides cleared for custom
      clearOverrides(id);
      window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
    } else {
      const o = loadOverrides(id) || {};
      const next = { ...o };
      next.title = title || "";
      next.story = story || "";
      if (typeof xPct === "number" && typeof yPct === "number") {
        next.pin = { label: pinLabel || title || getEffectiveTitle(f), xPct, yPct };
      } else {
        delete next.pin;
      }
      if (imageDataUrl) next.imageDataUrl = imageDataUrl;
      saveOverrides(id, next);

      if (tags.length) saveTagOverrides(id, tags);
      else window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
    }

    $adminSaveStatus.textContent = "Saved.";
    refreshFromStorage();
    loadAdminFormFromSelected();
    if (state.activeFeatureId === id) openFeature(id);
  }

  function resetExistingFeature() {
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;
    if (f.isCustom) {
      // Reset for custom means clear per-feature overrides and reload the stored custom data.
      clearOverrides(id);
      window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
      $adminSaveStatus.textContent = "Reset (custom features keep their saved base values).";
      refreshFromStorage();
      loadAdminFormFromSelected();
      return;
    }
    clearOverrides(id);
    window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
    $adminSaveStatus.textContent = "Reset.";
    refreshFromStorage();
    loadAdminFormFromSelected();
    if (state.activeFeatureId === id) openFeature(id);
  }

  async function createNewFeature() {
    const title = ($newTitle.value || "").trim();
    if (!title) {
      $adminCreateStatus.textContent = "Title is required.";
      return;
    }
    const imgFile = ($newImage.files && $newImage.files[0]) || null;
    if (!imgFile) {
      $adminCreateStatus.textContent = "Headline image is required.";
      return;
    }
    const xRaw = String($newPinX.value || "").trim();
    const yRaw = String($newPinY.value || "").trim();
    const xPct = Number(xRaw);
    const yPct = Number(yRaw);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) {
      $adminCreateStatus.textContent = "Pin coordinates (xPct/yPct) are required.";
      return;
    }

    const label = ($newPinLabel.value || "").trim() || title;
    const tags = parseTagsCsv($newTags.value || "");
    const story = ($newStory.value || "").trim();
    const imageDataUrl = await fileToDataUrl(imgFile);
    const galleryFiles = Array.from(($newGallery.files && $newGallery.files) || []);
    const galleryUrls = await Promise.all(galleryFiles.map((f) => fileToDataUrl(f)));
    const gallery = galleryUrls.filter(Boolean).map((url) => ({ id: `g-${Date.now()}-${Math.random().toString(16).slice(2)}`, url }));

    const usedIds = new Set(features.map((f) => f.id));
    let id = slugify(title);
    let n = 2;
    while (usedIds.has(id)) {
      id = `${slugify(title)}-${n}`;
      n += 1;
    }

    const newFeature = {
      id,
      title,
      story,
      tags,
      text: "",
      sourcePdf: "Custom",
      imageDataUrl,
      thumb: imageDataUrl,
      pages: [{ pageNumber: 1, image: imageDataUrl, width: 0, height: 0, textPreview: "" }],
      pin: { label, xPct, yPct },
      hidden: false,
      gallery,
    };

    const list = loadCustomFeatures();
    list.push(newFeature);
    saveCustomFeatures(list);

    // Clear form
    $newTitle.value = "";
    $newPinLabel.value = "";
    $newPinX.value = "";
    $newPinY.value = "";
    $newTags.value = "";
    $newStory.value = "";
    $newImage.value = "";
    $newGallery.value = "";

    $adminCreateStatus.textContent = `Created: ${title}`;
    refreshFromStorage();
    hydrateAdminSelect();
    $adminFeatureSelect.value = id;
    loadAdminFormFromSelected();
    renderMapPins();
  }

  $adminSaveFeature.addEventListener("click", () => {
    if (!isAdmin) return;
    saveExistingFeature().catch((err) => {
      $adminSaveStatus.textContent = `Save failed: ${String(err && err.message ? err.message : err)}`;
    });
  });
  $adminResetFeature.addEventListener("click", () => {
    if (!isAdmin) return;
    resetExistingFeature();
  });

  $adminToggleHidden.addEventListener("click", () => {
    if (!isAdmin) return;
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;

    const currentlyHidden = isHidden(f);
    const ok = window.confirm(
      currentlyHidden
        ? "Show this feature so it appears on the map and in the list again?"
        : "Hide this feature from the map and list? (You can show it again later in Admin.)"
    );
    if (!ok) return;

    if (f.isCustom) {
      const list = loadCustomFeatures();
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], hidden: !currentlyHidden };
        saveCustomFeatures(list);
      }
    } else {
      const o = loadOverrides(id) || {};
      saveOverrides(id, { ...o, hidden: !currentlyHidden });
    }

    $adminSaveStatus.textContent = currentlyHidden ? "Shown." : "Hidden.";
    refreshFromStorage();
    hydrateAdminSelect();
    $adminFeatureSelect.value = id;
    loadAdminFormFromSelected();
  });

  $adminDeleteFeature.addEventListener("click", () => {
    if (!isAdmin) return;
    const id = $adminFeatureSelect.value;
    const f = features.find((x) => x.id === id);
    if (!f) return;

    const ok = window.confirm(
      "Delete this feature permanently? This cannot be undone (unless you clear browser storage or rebuild the site)."
    );
    if (!ok) return;
    const typed = window.prompt('Type DELETE to confirm permanent deletion:', "");
    if (typed !== "DELETE") return;

    if (f.isCustom) {
      const list = loadCustomFeatures().filter((x) => x.id !== id);
      saveCustomFeatures(list);
      // cleanup any overrides/tags if present
      clearOverrides(id);
      window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
    } else {
      const o = loadOverrides(id) || {};
      saveOverrides(id, { ...o, deleted: true, hidden: true });
      window.localStorage.removeItem(`${LS_TAGS_PREFIX}${id}`);
    }

    // If the feature modal is open for this feature, close it.
    if (state.activeFeatureId === id) {
      state.activeFeatureId = null;
      closeDialog($modal);
    }

    $adminSaveStatus.textContent = "Deleted.";
    refreshFromStorage();
    hydrateAdminSelect();
    // Select first remaining feature if any
    if ($adminFeatureSelect.options.length) {
      $adminFeatureSelect.value = $adminFeatureSelect.options[0].value;
      loadAdminFormFromSelected();
    } else {
      // No features left: collapse edit UI
      setEditing(false);
    }
  });
  $adminCreateFeature.addEventListener("click", () => {
    if (!isAdmin) return;
    createNewFeature().catch((err) => {
      $adminCreateStatus.textContent = `Create failed: ${String(err && err.message ? err.message : err)}`;
    });
  });

  // Search
  $search.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    renderGrid();
  });

  // Toggle a tag without moving keyboard focus.
  function onTagClick(tag) {
    if (!tag) return;
    const active = !state.tags.has(tag);
    if (active) state.tags.add(tag);
    else state.tags.delete(tag);
    $tagList.querySelector(`[data-tag="${CSS.escape(tag)}"]`)?.setAttribute("aria-pressed", String(active));
    renderGrid();
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tag]");
    if (btn) {
      onTagClick(btn.dataset.tag);
      return;
    }

    const card = e.target.closest(".card[data-id]");
    if (card) {
      openFeature(card.dataset.id);
      return;
    }

    const remove = e.target.closest("[data-tag-remove]");
    if (remove && state.activeFeatureId && isAdmin) {
      const f = features.find((x) => x.id === state.activeFeatureId);
      if (!f) return;
      const tag = remove.dataset.tagRemove;
      const next = getEffectiveTags(f).filter((t) => t !== tag);
      saveTagOverrides(f.id, next);
      renderModalTags(f);
      renderTagButtons();
      renderGrid();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    const card = e.target.closest(".card[data-id]");
    if (!card) return;
    e.preventDefault();
    openFeature(card.dataset.id);
  });

  function restoreExplore() {
    if ($zoom.open) $zoom.close();
    if ($study.open) $study.close();
    if ($modal.open) $modal.close();
    state.activeFeatureId = null;
    document.title = baseTitle;
    setModalOpenState(false);
    if (!readingOrigin) return;
    const { x, y, trigger, pinId } = readingOrigin;
    readingOrigin = null;
    // Visiting a pin redraws it. Restore focus to its replacement when necessary.
    const target = trigger?.isConnected ? trigger : [...$mapPins.children].find((pin) => pin.dataset.featureId === pinId);
    target?.focus({ preventScroll: true });
    window.scrollTo({ left: x, top: y, behavior: "instant" });
  }

  function closeFeature() {
    if (readingOrigin?.fromFarmPage || history.state?.hookeFeatureOpened) {
      history.back();
      return;
    }
    if (featureFromUrl()) recordFeatureUrl(null, true);
    restoreExplore();
  }

  function followFeatureUrl() {
    const id = featureFromUrl();
    if (id) {
      if (!$modal.open || state.activeFeatureId !== id) openFeature(id, { fromUrl: true });
    } else if ($modal.open) restoreExplore();
  }
  window.addEventListener("popstate", followFeatureUrl);
  window.addEventListener("hashchange", followFeatureUrl);

  // Keep same-page links shareable and retain the current map, list, filters and scroll position.
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href);
    const id = url.searchParams.get("feature");
    const currentPath = location.pathname.replace(/index\.html$/, "");
    if (!id || url.origin !== location.origin || url.pathname.replace(/index\.html$/, "") !== currentPath) return;
    event.preventDefault();
    openFeature(id);
  });
  $modalClose.addEventListener("click", closeFeature);
  $modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeFeature();
  });
  $modal.addEventListener("close", () => {
    if (!$modal.open && readingOrigin) {
      if (featureFromUrl()) recordFeatureUrl(null, true);
      restoreExplore();
    }
  });

  // Prev/Next feature navigation (modal header)
  $modalPrevFeature.addEventListener("click", () => {
    if (!$modal.open) return;
    const ids = filteredFeatureIds();
    if (!state.activeFeatureId) return;
    const idx = ids.indexOf(state.activeFeatureId);
    if (idx < 0 || ids.length < 2) return;
    const prevId = ids[(idx - 1 + ids.length) % ids.length];
    openFeature(prevId);
  });
  $modalNextFeature.addEventListener("click", () => {
    if (!$modal.open) return;
    const ids = filteredFeatureIds();
    if (!state.activeFeatureId) return;
    const idx = ids.indexOf(state.activeFeatureId);
    if (idx < 0 || ids.length < 2) return;
    const nextId = ids[(idx + 1) % ids.length];
    openFeature(nextId);
  });

  // Tour controls (side panel)
  updateTourUI();
  $btnTour.addEventListener("click", () => {
    if (tour.active) endTour();
    else startTour();
  });
  $tourPanelEnd.addEventListener("click", () => {
    endTour();
    $tourPath.setAttribute("d", "");
    setTourCurrentPin("");
  });
  $tourPanelPrev.addEventListener("click", () => {
    if (!tour.active || tour.ids.length === 0) return;
    const fromId = tour.ids[tour.idx];
    openTourStep(tour.idx - 1, fromId);
  });
  $tourPanelNext.addEventListener("click", () => {
    if (!tour.active || tour.ids.length === 0) return;
    const fromId = tour.ids[tour.idx];
    openTourStep(tour.idx + 1, fromId);
  });
  $tourPanelOpen.addEventListener("click", () => {
    if (!tour.active || tour.ids.length === 0) return;
    const id = tour.ids[tour.idx];
    openFeature(id);
  });

  // Gallery click: swap main image (thumbnails)
  $modalGallery.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-idx]");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (!Number.isFinite(idx)) return;
    setGalleryIndex(idx);
  });

  $galleryPrev.addEventListener("click", () => {
    if (!$modal.open) return;
    setGalleryIndex(galleryState.idx - 1);
  });
  $galleryNext.addEventListener("click", () => {
    if (!$modal.open) return;
    setGalleryIndex(galleryState.idx + 1);
  });

  // Keyboard navigation (left/right) while modal is open.
  document.addEventListener("keydown", (e) => {
    if (!$modal.open) return;
    if ($study.open || $zoom.open || isTypingInField()) return;
    if (!galleryState.items || galleryState.items.length < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setGalleryIndex(galleryState.idx - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setGalleryIndex(galleryState.idx + 1);
    }
  });

  function addTagFromInput() {
    if (!isAdmin) return;
    if (!state.activeFeatureId) return;
    const f = features.find((x) => x.id === state.activeFeatureId);
    if (!f) return;
    const raw = $tagInput.value || "";
    const tag = raw.trim();
    if (!tag) return;
    const next = unique([...getEffectiveTags(f), tag]).sort((a, b) => a.localeCompare(b));
    saveTagOverrides(f.id, next);
    $tagInput.value = "";
    renderModalTags(f);
    renderTagButtons();
    renderGrid();
  }

  $tagAdd.addEventListener("click", addTagFromInput);
  $tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTagFromInput();
  });

  // About is a dedicated page now (about.html); no modal wiring.

  // Random feature
  $btnRandom.addEventListener("click", () => {
    const filtered = features.filter((f) => !isHidden(f) && !isDeleted(f) && matches(f));
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    if (pick) openFeature(pick.id);
  });

  // Clear filters
  if ($clearFilters) {
    $clearFilters.addEventListener("click", () => {
      state.q = "";
      state.tags.clear();
      $search.value = "";
      $search.focus({ preventScroll: true });
      renderTagButtons();
      renderGrid();
    });
  }
  followFeatureUrl();
}

main();


