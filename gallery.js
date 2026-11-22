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

function main() {
  const data = window.__HOOKE_GALLERY__;
  if (!data || !Array.isArray(data.images)) {
    document.body.innerHTML =
      "<div style='padding:24px;font-family:system-ui'>Missing gallery manifest. Expected window.__HOOKE_GALLERY__.</div>";
    return;
  }

  const dimensions = window.__HOOKE_GALLERY_DIMENSIONS__ || {};
  const allImages = data.images.map((im) => ({
    width: dimensions[im.src]?.[0] || 1200,
    height: dimensions[im.src]?.[1] || 900,
    ...im,
    src: String(im.src || ""),
    category: String(im.category || "Other"),
    label: String(im.label || ""),
    tags: Array.isArray(im.tags) ? im.tags.map((t) => String(t)).filter((t) => t.trim() !== "") : [],
    createdMs: Number.isFinite(Number(im.createdMs)) ? Number(im.createdMs) : 0,
    createdAt: String(im.createdAt || ""),
  }));

  const $search = el("galSearch");
  const $view = el("galView");
  const $sort = el("galSort");
  const $cats = el("galCats");
  const $tags = el("galTags");
  const $grid = el("galGrid");
  const $meta = el("galMeta");
  const $clear = el("galClear");

  const $modal = el("galModal");
  const $modalTitle = el("galModalTitle");
  const $modalCap = el("galModalCap");
  const $modalClose = el("galModalClose");
  const $stageImg = el("galStageImg");
  const $thumbs = el("galThumbs");
  const $prev = el("galPrev");
  const $next = el("galNext");
  const $counter = el("galCounter");

  const $stage = el("galStage");
  const $zoom = el("galZoom");
  const $imageStatus = el("galImageStatus");
  const state = { q: "", cats: new Set(), tags: new Set(), view: "all", sort: "suggested" };
  // A photographic entrance; every collection entry remains in the same browse sequence.
  const opening = ["DSC_0174.JPG", "IMG_0494.jpeg", "BA34E6F3-CFE9-47E6-8251-1F32D46DD714.jpg", "IMG_0359.jpeg", "DSC_0129.JPG", "14A2596A-3245-43CF-A58F-968694E11BB1.jpg", "20231015-_DSF0682.jpg", "IMG_0399.jpeg"];
  const categoryOrder = { Misc: 0, About: 1, "Feature photos": 2, Artwork: 3, Before: 4, "Info boards": 5 };
  function wanderRank(im) {
    const idx = opening.indexOf(im.src.split("/").pop());
    return idx >= 0 ? idx : 100 + (categoryOrder[im.category] ?? 6);
  }

  function baseImages() {
    if (state.view === "before") return allImages.filter((im) => im.category === "Before");
    if (state.view === "after") return allImages.filter((im) => im.category !== "Before");
    return allImages;
  }

  function categoriesForCurrentView() {
    return Array.from(new Set(baseImages().map((im) => im.category))).sort((a, b) => a.localeCompare(b));
  }

  function matches(im) {
    const q = normalize(state.q);
    const catOk = state.cats.size === 0 || state.cats.has(im.category);
    const tagOk = state.tags.size === 0 || (im.tags || []).some((t) => state.tags.has(t));
    const qOk = !q || normalize(im.src).includes(q) || normalize([imageTitle(im), im.label, im.category === "Misc" ? "Around the farm" : im.category, ...im.tags].join(" ")).includes(q);
    return catOk && tagOk && qOk;
  }

  function compare(a, b) {
    if (state.sort === "suggested" && wanderRank(a) !== wanderRank(b)) return wanderRank(a) - wanderRank(b);
    if (state.sort === "name_asc") return String(a.src).localeCompare(String(b.src));
    const da = Number(a.createdMs || 0);
    const db = Number(b.createdMs || 0);
    if (da !== db) return state.sort === "created_asc" ? da - db : db - da;
    return String(a.src).localeCompare(String(b.src));
  }

  function filteredSorted() {
    return baseImages().filter(matches).sort(compare);
  }

  function updateClearVisibility() {
    const hasActive =
      !!String(state.q || "").trim() ||
      state.cats.size > 0 ||
      state.tags.size > 0 ||
      state.view !== "all" ||
      state.sort !== "suggested";
    $clear.hidden = !hasActive;
  }

  function renderViewToggle() {
    const defs = [
      { id: "all", label: "All images" },
      { id: "after", label: "After wilding" },
      { id: "before", label: "Before wilding" },
    ];
    const focusedValue = $view.contains(document.activeElement) ? document.activeElement.getAttribute("data-gal-view") : null;
    $view.innerHTML = defs
      .map((d) => {
        const active = state.view === d.id;
        return `<button class="chip ${active ? "is-active" : ""}" type="button" aria-pressed="${active}" data-gal-view="${escapeHtml(d.id)}">${escapeHtml(
          d.label
        )}</button>`;
      })
      .join("");
    if (focusedValue !== null) $view.querySelector('[data-gal-view="' + CSS.escape(focusedValue) + '"]')?.focus({ preventScroll: true });
  }

  function renderCats() {
    const categories = categoriesForCurrentView();
    const focusedValue = $cats.contains(document.activeElement) ? document.activeElement.getAttribute("data-gal-cat") : null;
    $cats.innerHTML = categories
      .map((c) => {
        const active = state.cats.has(c);
        return `<button class="chip ${active ? "is-active" : ""}" type="button" aria-pressed="${active}" data-gal-cat="${escapeHtml(c)}">${escapeHtml(
          c
        )}</button>`;
      })
      .join("");
    updateClearVisibility();
    if (focusedValue !== null) $cats.querySelector('[data-gal-cat="' + CSS.escape(focusedValue) + '"]')?.focus({ preventScroll: true });
  }

  function tagsForCurrentView() {
    // Narrow the tag list by category selection (so it doesn't show irrelevant tags).
    const scoped = baseImages().filter((im) => state.cats.size === 0 || state.cats.has(im.category));
    const all = Array.from(new Set(scoped.flatMap((im) => im.tags || [])));
    // Put the structural tags first, then everything else.
    const order = { Before: 1, About: 2, Misc: 3, "Feature photo": 4, "Info board": 5, Artwork: 6, Other: 7 };
    return all.sort((a, b) => (order[a] || 99) - (order[b] || 99) || a.localeCompare(b));
  }

  function renderTags() {
    const tags = tagsForCurrentView();
    const focusedValue = $tags.contains(document.activeElement) ? document.activeElement.getAttribute("data-gal-tag") : null;
    $tags.innerHTML = tags
      .map((t) => {
        const active = state.tags.has(t);
        return `<button class="chip ${active ? "is-active" : ""}" type="button" aria-pressed="${active}" data-gal-tag="${escapeHtml(t)}">${escapeHtml(
          t
        )}</button>`;
      })
      .join("");
    updateClearVisibility();
    if (focusedValue !== null) $tags.querySelector('[data-gal-tag="' + CSS.escape(focusedValue) + '"]')?.focus({ preventScroll: true });
  }

  function imageTitle(im) {
    const subject = im.tags.find((tag) => tag !== "Feature photo" && tag !== "Info board");
    if (im.category === "Feature photos" && subject) return subject;
    if (im.category === "Info boards" && subject) return subject + " · board";
    if (im.category === "About") return "Hooke Farm";
    if (im.category === "Before" && /^(P\d|IMG|\d{4}-)/i.test(im.label)) return "Before wilding";
    return im.label || im.category;
  }

  let gridItems = [];
  let layoutFrame = 0;
  function layoutGrid() {
    const width = $grid.clientWidth;
    if (!width || !gridItems.length) return;
    const gap = width < 600 ? 8 : 12;
    const target = width < 600 ? 150 : width < 1000 ? 235 : 290;
    const cards = Array.from($grid.children);
    let start = 0, top = 0;
    while (start < gridItems.length) {
      let end = start, sum = 0;
      while (end < gridItems.length) {
        const ratio = gridItems[end].width / gridItems[end].height;
        const before = sum ? (width - gap * (end - start - 1)) / sum : Infinity;
        const after = (width - gap * (end - start)) / (sum + ratio);
        if (sum && after < target && Math.abs(before - target) < Math.abs(after - target)) break;
        sum += ratio;
        end++;
        if (after <= target) break;
      }
      const rowHeight = (width - gap * (end - start - 1)) / sum;
      // A short final row should not inflate a single image across a desktop.
      const height = end === gridItems.length ? Math.min(rowHeight, target * 1.2) : rowHeight;
      let left = 0;
      for (let i = start; i < end; i++) {
        const cardWidth = height * gridItems[i].width / gridItems[i].height;
        Object.assign(cards[i].style, { left: `${left}px`, top: `${top}px`, width: `${cardWidth}px`, height: `${height}px` });
        left += cardWidth + gap;
      }
      top += height + gap;
      start = end;
    }
    $grid.style.height = `${top - gap}px`;
  }
  function queueLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layoutGrid);
  }
  new ResizeObserver(queueLayout).observe($grid);

  function renderGrid() {
    gridItems = filteredSorted();
    $meta.textContent = `${gridItems.length} image${gridItems.length === 1 ? "" : "s"}`;
    $grid.style.height = "auto";
    if (!gridItems.length) {
      $grid.innerHTML = `<div class="gallery-empty"><h2>No photographs found</h2><p>Try another word, or wander through the whole collection.</p><button class="btn" id="galEmptyReset" type="button">Show all images</button></div>`;
      el("galEmptyReset").addEventListener("click", resetFilters);
      return;
    }
    $grid.innerHTML = gridItems.map((im, idx) => {
      const label = imageTitle(im);
      return `<button type="button" class="gal-card" data-gal-idx="${idx}" aria-label="Open image ${idx + 1}, ${escapeHtml(label)}" data-gal-category="${escapeHtml(im.category)}">
        <img class="gal-card__img" src="${escapeHtml(im.src)}" width="${im.width}" height="${im.height}" alt="" loading="${idx < 8 ? "eager" : "lazy"}" decoding="async" />
        <span class="gal-card__caption">${escapeHtml(label)}</span></button>`;
    }).join("");
    // If an image is replaced, recover its proportions from the actual file.
    $grid.querySelectorAll("img").forEach((img, index) => img.addEventListener("load", () => {
      if (!img.isConnected) return;
      if (img.naturalWidth && Math.abs(img.naturalWidth / img.naturalHeight - gridItems[index].width / gridItems[index].height) > .001) {
        gridItems[index].width = img.naturalWidth;
        gridItems[index].height = img.naturalHeight;
        queueLayout();
      }
    }));
    layoutGrid();
  }

  const modalState = { items: [], idx: 0, opener: null, zoomed: false };

  function setZoom(zoomed) {
    modalState.zoomed = zoomed;
    $stage.classList.toggle("is-zoomed", zoomed);
    $zoom.setAttribute("aria-pressed", String(zoomed));
    $zoom.setAttribute("aria-label", zoomed ? "Fit photograph" : "Zoom in");
    $zoom.innerHTML = zoomed ? 'Fit photo <span aria-hidden="true">−</span>' : 'Zoom in <span aria-hidden="true">＋</span>';
    if (zoomed) {
      const im = modalState.items[modalState.idx];
      const fit = Math.min($stage.clientWidth / im.width, $stage.clientHeight / im.height);
      const scale = Math.max(fit * 2, Math.min(1, fit * 4));
      $stage.style.setProperty("--zoom-width", `${im.width * scale}px`);
      $stage.style.setProperty("--zoom-height", `${im.height * scale}px`);
    }
    $stage.scrollTo(0, 0);
  }

  function setModalIndex(nextIdx) {
    const items = modalState.items;
    if (!items || items.length === 0) return;
    const len = items.length;
    const focusInThumbs = $thumbs.contains(document.activeElement);
    const idx = ((nextIdx % len) + len) % len;
    modalState.idx = idx;
    const im = items[idx];

    const label = imageTitle(im);
    $modalTitle.textContent = label;
    setZoom(false);
    $imageStatus.textContent = "Loading photograph…";
    $stageImg.src = im.src;
    el("galOriginal").href = im.src;
    $stageImg.alt = label;
    const category = im.category === "Misc" ? "Around the farm" : im.category;
    $modalCap.textContent = im.label && im.label !== label ? category + " · " + im.label : category;
    $counter.textContent = `${idx + 1} / ${len}`;
    const multi = len > 1;
    $prev.hidden = !multi;
    $next.hidden = !multi;
    $prev.disabled = !multi;
    $next.disabled = !multi;

    Array.from($thumbs.querySelectorAll(".thumb[data-idx]")).forEach((t) => {
      const active = Number(t.dataset.idx) === idx;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-current", String(active));
      t.tabIndex = active ? 0 : -1;
    });
    const active = $thumbs.querySelector(`.thumb[data-idx="${idx}"]`);
    if (active && focusInThumbs) active.focus({ preventScroll: true });
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
    }
  }

  function openModalForIndex(idx, list, opener) {
    modalState.opener = opener || document.activeElement;
    modalState.items = Array.isArray(list) ? list : [];
    modalState.idx = Number.isFinite(idx) ? idx : 0;
    $thumbs.innerHTML = modalState.items
      .map((im, i) => {
        const label = imageTitle(im);
        const active = i === modalState.idx;
        return `<button class="thumb ${active ? "is-active" : ""}" type="button" data-idx="${escapeHtml(String(i))}" aria-label="Open ${escapeHtml(
          label
        )}">
          <img src="${escapeHtml(im.src)}" alt="" loading="lazy" />
        </button>`;
      })
      .join("");

    document.body.classList.add("is-modal-open");
    if (!$modal.open) $modal.showModal();
    setModalIndex(modalState.idx);
    $modalClose.focus();
  }

  // Initial render
  renderViewToggle();
  renderCats();
  renderTags();
  renderGrid();
  updateClearVisibility();

  // Events
  $search.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    updateClearVisibility();
    renderGrid();
  });

  $sort.addEventListener("change", (e) => {
    state.sort = e.target.value || "suggested";
    updateClearVisibility();
    renderGrid();
  });

  function resetFilters() {
    state.q = "";
    state.cats.clear();
    state.tags.clear();
    state.view = "all";
    state.sort = "suggested";
    $search.value = "";
    $sort.value = "suggested";
    renderViewToggle();
    renderCats();
    renderTags();
    renderGrid();
    $search.focus({ preventScroll: true });
  }
  $clear.addEventListener("click", resetFilters);

  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-gal-view]");
    if (viewBtn) {
      state.view = viewBtn.dataset.galView;
      state.cats.clear();
      state.tags.clear();
      renderViewToggle();
      renderCats();
      renderTags();
      renderGrid();
      return;
    }

    const catBtn = e.target.closest("[data-gal-cat]");
    if (catBtn) {
      const c = catBtn.dataset.galCat;
      if (state.cats.has(c)) state.cats.delete(c);
      else state.cats.add(c);
      renderCats();
      renderTags();
      renderGrid();
      return;
    }

    const tagBtn = e.target.closest("[data-gal-tag]");
    if (tagBtn) {
      const t = tagBtn.dataset.galTag;
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);
      renderTags();
      renderGrid();
      return;
    }

    const card = e.target.closest("[data-gal-idx]");
    if (card) {
      const idx = Number(card.dataset.galIdx);
      const filtered = filteredSorted();
      if (Number.isFinite(idx) && filtered[idx]) openModalForIndex(idx, filtered, card);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!$modal.open) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      setModalIndex(modalState.idx + moves[e.key]);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setModalIndex(e.key === "Home" ? 0 : modalState.items.length - 1);
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      setZoom(e.key !== "-");
    } else if (e.key === "Tab") {
      const focusable = Array.from($modal.querySelectorAll('button:not([disabled]):not([hidden]), a[href]')).filter(node => node.tabIndex >= 0);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  $modalClose.addEventListener("click", () => $modal.close());
  $modal.addEventListener("close", () => {
    document.body.classList.remove("is-modal-open");
    setZoom(false);
    modalState.opener?.focus({ preventScroll: true });
  });
  $zoom.addEventListener("click", () => setZoom(!modalState.zoomed));
  $stageImg.addEventListener("click", () => setZoom(!modalState.zoomed));
  $stageImg.addEventListener("load", () => { $imageStatus.textContent = ""; });
  $stageImg.addEventListener("error", () => { $imageStatus.textContent = "This photograph couldn’t load. Try opening the original, or continue to the next image."; });
  let touch = null;
  $stage.addEventListener("touchstart", (e) => {
    touch = e.touches.length === 1 && !modalState.zoomed ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  $stage.addEventListener("touchend", (e) => {
    if (!touch || !e.changedTouches.length || modalState.zoomed) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setModalIndex(modalState.idx + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
  $stage.addEventListener("touchcancel", () => { touch = null; });

  $thumbs.addEventListener("click", (e) => {
    const btn = e.target.closest(".thumb[data-idx]");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (Number.isFinite(idx)) setModalIndex(idx);
  });
  $prev.addEventListener("click", () => setModalIndex(modalState.idx - 1));
  $next.addEventListener("click", () => setModalIndex(modalState.idx + 1));
}

main();


