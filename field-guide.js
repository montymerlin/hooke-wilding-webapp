(() => {
  const get = (id) => document.getElementById(id);
  const text = (tag, value) => {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  };
  const placeholder = "./assets/field-guide/placeholder.svg";
  const data = window.__DORSET_GUIDE__;
  const empty = get("fgEmpty");
  if (!data?.species?.length) {
    get("fgTools").hidden = true;
    get("fgBrowser").hidden = true;
    get("fgEmptyTitle").textContent = "Species catalogue unavailable";
    get("fgEmptyText").textContent = "Check that the guide’s data folder is alongside this page.";
    get("fgReset").hidden = true;
    empty.hidden = false;
    return;
  }

  const habitats = new Map((data.habitats || []).map((item) => [item.id, item.name]));
  const seasons = data.seasons || ["Spring", "Summer", "Autumn", "Winter"];
  const search = get("fgSearch");
  const choices = get("fgChoices");
  const clear = get("fgClear");
  const filterToggle = get("fgFilterToggle");
  const filters = { groups: new Set(), habitats: new Set(), seasons: new Set() };
  const species = [...data.species].sort((a, b) => a.commonName.localeCompare(b.commonName, "en"));
  const opening = species.find((item) => item.id === "emperor-dragonfly") || species[0];
  // Start the strip with the featured plate, keeping the rest of the index alphabetical.
  const index = [opening, ...species.filter((item) => item !== opening)];
  const requestedSpecies = new URLSearchParams(location.search).get("species");
  let selected = species.find(item => item.id === requestedSpecies) || opening;
  let results = [];
  let speciesButtons = [];
  const habitatNames = (item) => (item.habitats || []).map((id) => habitats.get(id) || id);

  function addFilters(key, legend, entries) {
    const fieldset = document.createElement("fieldset");
    fieldset.append(text("legend", legend));
    for (const [value, label] of entries) {
      const wrapper = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      input.addEventListener("change", () => {
        if (input.checked) filters[key].add(value);
        else filters[key].delete(value);
        renderIndex();
      });
      wrapper.append(input, text("span", label));
      fieldset.append(wrapper);
    }
    get("fgFilterGroups").append(fieldset);
  }

  function matches(item, query) {
    if (filters.groups.size && !filters.groups.has(item.group)) return false;
    if (filters.habitats.size && !item.habitats?.some((id) => filters.habitats.has(id))) return false;
    if (filters.seasons.size && ![...filters.seasons].some((season) => item.seasonality?.[season]?.trim())) return false;
    if (!query) return true;
    return [item.commonName, item.scientificName, item.group, ...habitatNames(item), item.notes, item.identification?.text,
      ...(item.watchFor || []), ...Object.values(item.seasonality || {})].join(" ").toLowerCase().includes(query);
  }

  function sourceLink(title, url) {
    if (!url) return document.createTextNode(title);
    const link = text("a", title);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function renderReferences(item) {
    const references = get("fgReferences");
    references.replaceChildren();
    const conservation = item.conservation || {};
    const verified = (value) => Boolean(value && !/^TBD\b/i.test(value));
    const entries = [
      ["UK/GB status", conservation.ukGbStatus],
      ["Priority", conservation.priority],
      ["Protection", (conservation.protected || []).filter(verified).join(", ")]
    ].filter(([, value]) => verified(value));
    if (entries.length) {
      const facts = document.createElement("dl");
      for (const [label, value] of entries) facts.append(text("dt", label), text("dd", value));
      references.append(facts);
      if (conservation.notes) references.append(text("p", conservation.notes));
    } else {
      references.append(text("p", "UK conservation status awaits verification."));
    }
    const links = document.createElement("ul");
    for (const source of item.sources || []) {
      const li = document.createElement("li");
      li.append(sourceLink(source.title || "Species reference", source.url));
      if (source.note) li.append(text("small", source.note));
      links.append(li);
    }
    references.append(links);
  }

  const lens = get("fgLens");
  const inspect = get("fgInspect");
  const plate = get("fgPhoto");
  const wholePhoto = [0, 0, 100, 100];

  function showDetail(view, button) {
    const [left, top, width, height] = view.crop;
    const x = plate.naturalWidth * left / 100;
    const y = plate.naturalHeight * top / 100;
    const w = plate.naturalWidth * width / 100;
    const h = plate.naturalHeight * height / 100;
    const rect = get("fgLensRect");
    for (const [key, value] of Object.entries({ x, y, width: w, height: h })) {
      rect.setAttribute(key, value);
    }
    get("fgLensStage").setAttribute("viewBox", [x, y, w, h].join(" "));
    get("fgLensAlt").textContent = selected.commonName + " — " + view.label;
    get("fgLensTitle").textContent = view.label;
    get("fgLensNote").textContent = view.note;
    Object.assign(get("fgLensBounds").style, {
      left: left + "%", top: top + "%", width: width + "%", height: height + "%"
    });
    for (const option of get("fgLensChoices").children) {
      option.setAttribute("aria-pressed", String(option === button));
    }
  }

  inspect.addEventListener("click", () => {
    if (!plate.naturalWidth || !selected.details?.length) return;
    const image = get("fgLensImage");
    image.setAttribute("href", plate.currentSrc);
    image.setAttribute("width", plate.naturalWidth);
    image.setAttribute("height", plate.naturalHeight);
    get("fgLensMap").src = plate.currentSrc;
    get("fgLensName").textContent = selected.commonName;
    get("fgLensCredit").replaceChildren(...get("fgCredit").cloneNode(true).childNodes);
    const views = [...selected.details, {
      label: "Whole photograph", crop: wholePhoto, note: selected.cover.caption || selected.commonName
    }];
    const options = get("fgLensChoices");
    options.replaceChildren();
    for (const view of views) {
      const button = text("button", view.label);
      button.type = "button";
      button.addEventListener("click", () => showDetail(view, button));
      options.append(button);
    }
    showDetail(views[0], options.firstElementChild);
    lens.showModal();
    lens.scrollTop = 0;
  });
  get("fgCloseLens").addEventListener("click", () => lens.close());
  lens.addEventListener("click", (event) => {
    if (event.target !== lens) return;
    const bounds = lens.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) lens.close();
  });

  function renderPhoto(item) {
    const photo = get("fgPhoto");
    const label = get("fgPhotoLabel");
    const credit = get("fgCredit");
    const cover = item.cover || {};
    label.textContent = cover.caption || item.commonName;
    credit.replaceChildren();
    const details = [];
    if (cover.artist) details.push(document.createTextNode(cover.artist));
    if (cover.license) details.push(sourceLink(cover.license, cover.licenseUrl));
    if (cover.sourceUrl) details.push(sourceLink("Original photograph", cover.sourceUrl));
    details.forEach((detail, i) => {
      if (i) credit.append(" · ");
      credit.append(detail);
    });
    photo.alt = cover.alt || item.commonName;
    inspect.hidden = true;
    photo.onload = () => {
      inspect.hidden = !item.details?.length || !photo.naturalWidth;
    };
    function showPlaceholder() {
      photo.onload = null;
      inspect.hidden = true;
      photo.onerror = null;
      photo.alt = "";
      label.textContent = "Photograph unavailable";
      credit.replaceChildren();
      photo.src = placeholder;
    }
    if (cover.src) {
      photo.onerror = showPlaceholder;
      photo.src = cover.src;
      if (photo.complete && photo.naturalWidth) photo.onload();
    } else showPlaceholder();
  }

  function revealChoice(button) {
    const strip = choices.getBoundingClientRect();
    const bounds = button.getBoundingClientRect();
    if (bounds.left < strip.left) choices.scrollLeft += bounds.left - strip.left;
    else if (bounds.right > strip.right) choices.scrollLeft += bounds.right - strip.right;
  }

  function renderPlate() {
    get("fgName").textContent = selected.commonName;
    get("fgLatin").textContent = selected.scientificName || "";
    get("fgGroup").textContent = selected.group || "";
    get("fgNotes").textContent = selected.notes || "";
    const identification = get("fgIdentification");
    identification.hidden = !selected.identification?.text;
    if (!identification.hidden) {
      identification.querySelector("dt").textContent = selected.identification.label || "Identification";
      identification.querySelector("dd").textContent = selected.identification.text;
    }
    get("fgHabitat").textContent = habitatNames(selected).join(" · ") || "Not recorded";
    get("fgTraits").textContent = (selected.watchFor || []).join(" · ") || "Not recorded";
    renderPhoto(selected);
    renderReferences(selected);
    const list = get("fgSeasonNotes");
    list.replaceChildren();
    for (const season of seasons) {
      const note = selected.seasonality?.[season];
      if (!note || (filters.seasons.size && !filters.seasons.has(season))) continue;
      const line = document.createElement("div");
      line.append(text("dt", season), text("dd", note));
      list.append(line);
    }
    get("fgSeasonTitle").parentElement.hidden = !list.children.length;
    for (const button of speciesButtons) {
      const active = button.dataset.species === selected.id;
      button.setAttribute("aria-pressed", String(active));
      if (active) revealChoice(button);
    }
    get("fgAnnounce").textContent = selected.commonName + " selected.";
  }

  function choose(item) {
    if (selected === item) return;
    selected = item;
    renderPlate();
  }

  function makeChoice(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guide-choice";
    button.dataset.species = item.id;
    const image = document.createElement("img");
    image.alt = "";
    image.onerror = () => {
      image.onerror = null;
      image.src = placeholder;
    };
    image.src = item.cover?.src || placeholder;
    button.append(image, text("span", item.commonName));
    button.addEventListener("click", () => choose(item));
    return button;
  }

  function renderIndex() {
    const query = search.value.trim().toLowerCase();
    const filterCount = filters.groups.size + filters.habitats.size + filters.seasons.size;
    clear.hidden = !query && !filterCount;
    filterToggle.textContent = filterCount ? "Filters (" + filterCount + ")" : "Filters";
    results = index.filter((item) => matches(item, query));
    const count = results.length;
    get("fgCount").textContent = count === index.length ? count + " species" : count + " of " + index.length + " species";
    get("fgBrowser").hidden = !count;
    get("fgRecord").hidden = !count;
    empty.hidden = Boolean(count);
    get("fgPrevious").disabled = count < 2;
    get("fgNext").disabled = count < 2;
    speciesButtons = results.map(makeChoice);
    choices.replaceChildren(...speciesButtons);
    if (!count) {
      get("fgAnnounce").textContent = "";
      return;
    }
    if (!results.includes(selected)) selected = results[0];
    renderPlate();
  }

  function step(delta) {
    const position = (results.indexOf(selected) + delta + results.length) % results.length;
    choose(results[position]);
  }

  function reset() {
    search.value = "";
    for (const values of Object.values(filters)) values.clear();
    for (const box of get("fgFilters").querySelectorAll("input")) box.checked = false;
    renderIndex();
    search.focus({ preventScroll: true });
  }

  const groups = data.groups || [...new Set(species.map((item) => item.group))];
  addFilters("groups", "Group", groups.map((name) => [name, name]));
  addFilters("habitats", "Habitat", [...habitats]);
  addFilters("seasons", "Seasonal notes", seasons.map((name) => [name, name]));
  search.addEventListener("input", renderIndex);
  filterToggle.addEventListener("click", () => {
    const panel = get("fgFilters");
    panel.hidden = !panel.hidden;
    filterToggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  clear.addEventListener("click", reset);
  get("fgReset").addEventListener("click", reset);
  get("fgPrevious").addEventListener("click", () => step(-1));
  get("fgNext").addEventListener("click", () => step(1));
  choices.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = speciesButtons.indexOf(event.target);
    if (current < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const position = (current + delta + results.length) % results.length;
    choose(results[position]);
    speciesButtons[position].focus({ preventScroll: true });
  });
  renderIndex();
})();
