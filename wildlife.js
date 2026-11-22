// Photographic visitors are independent of navigation, search and the map.
(() => {
  const names = {
    comma: "Comma butterfly",
    bee: "Bumblebee",
    ladybird: "Ladybird",
    snail: "Banded snail",
    spider: "Garden spider",
    toad: "Toad",
    allium: "Bumblebee on an allium"
  };

  function fitLabel(details) {
    const caption = details.querySelector(".wild-label");
    caption.style.removeProperty("--label-shift");
    const bounds = caption.getBoundingClientRect();
    const shift = Math.max(0, 8 - bounds.left) + Math.min(0, document.documentElement.clientWidth - 8 - bounds.right);
    caption.style.setProperty("--label-shift", shift + "px");
  }

  function placeVisitor(perch, kind) {
    const details = document.createElement("details");
    details.className = "wild-visitor wild-" + kind;
    details.name = "hooke-wildlife";
    const control = document.createElement("summary");
    control.setAttribute("aria-label", "Identify this visitor");
    const body = document.createElement("span");
    body.className = "wild-body";
    body.setAttribute("aria-hidden", "true");
    const caption = document.createElement("span");
    caption.className = "wild-label";
    caption.textContent = names[kind];
    control.append(body);
    details.append(control, caption);
    details.addEventListener("toggle", () => {
      if (details.open) fitLabel(details);
      control.setAttribute("aria-label", details.open ? names[kind] + ", hide name" : "Identify this visitor");
    });
    perch.append(details);
  }

  const footer = document.querySelector(".farm-footer");
  if (footer) {
    const verge = document.createElement("div");
    verge.className = "wild-verge";
    for (const kind of ["comma", "bee", "allium"]) {
      const perch = document.createElement("div");
      perch.className = "wild-perch verge-" + kind;
      placeVisitor(perch, kind);
      verge.append(perch);
    }
    footer.prepend(verge);
  }

  document.querySelectorAll("[data-wildlife]").forEach(perch => placeVisitor(perch, perch.dataset.wildlife));
  // Play a short movement only as each visitor comes into view.
  if (window.IntersectionObserver) {
    const verge = footer?.querySelector(".wild-verge");
    verge?.classList.add("will-rise");
    const observer = new IntersectionObserver(entries => {
      for (const {target, intersectionRatio} of entries) {
        if (intersectionRatio < 0.25) continue;
        target.classList.add("in-view");
        observer.unobserve(target);
      }
    }, { threshold: 0.25 });
    document.querySelectorAll(".wild-visitor, .wild-verge").forEach(node => observer.observe(node));
  }

  window.addEventListener("resize", () => {
    const shown = document.querySelector(".wild-visitor[open]");
    if (shown) fitLabel(shown);
  });
  document.addEventListener("click", event => {
    const shown = document.querySelector(".wild-visitor[open]");
    if (shown && !shown.contains(event.target)) shown.open = false;
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const shown = document.querySelector(".wild-visitor[open]");
    if (shown) shown.open = false;
  });
})();
