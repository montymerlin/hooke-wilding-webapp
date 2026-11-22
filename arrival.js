// Play on a fresh arrival or a reload. Navigation within the guide stays immediate.
(() => {
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const query = new URLSearchParams(location.search);
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  const fromPortal = document.referrer.startsWith(new URL('./', location.href).href);
  const replayLink = query.get('entrance') === 'replay';
  const directArrival = navigationType !== 'back_forward' && (!fromPortal || navigationType === 'reload');
  const atEntrance = !location.hash && !query.has('feature');
  const startOnLoad = atEntrance && (replayLink || (directArrival && !motion.matches));
  if (startOnLoad) root.classList.add('meadow-pending');

  document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('atlasViewport');
    const zoom = document.getElementById('atlasZoom');
    const scene = document.getElementById('meadowEntrance');
    const skip = document.getElementById('arrivalSkip');
    const replay = document.getElementById('arrivalReplay');
    const frames = ['hooke-meadow', 'meadow-stems', 'comma-butterfly', 'meadow-study'];
    let readyImages;
    let active = false;
    let sequence = 0;
    let timeout;
    replay.hidden = false;

    function finish() {
      if (!active) return;
      const returnFocus = document.activeElement === skip;
      active = false;
      sequence++;
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', showWhenVisible);
      root.classList.remove('meadow-pending', 'meadow-arriving', 'meadow-still');
      if (returnFocus) replay.focus({ preventScroll: true });
    }

    function showWhenVisible() {
      if (!active || document.visibilityState === 'hidden') return;
      document.removeEventListener('visibilitychange', showWhenVisible);
      root.classList.remove('meadow-pending');
      root.classList.add(motion.matches ? 'meadow-still' : 'meadow-arriving');
    }

    async function play(manual) {
      finish();
      active = true;
      const current = ++sequence;
      root.classList.add('meadow-pending');
      if (manual) skip.focus({ preventScroll: true });
      if (!readyImages) {
        readyImages = Promise.all(frames.map(name => {
          const image = new Image();
          image.src = './assets/arrival/' + name + '.webp';
          return image.decode();
        }));
      }
      // Never leave a visitor behind an incomplete scene on a slow connection.
      timeout = setTimeout(finish, 6000);
      try { await readyImages; }
      catch { readyImages = undefined; if (current === sequence) finish(); return; }
      if (current !== sequence) return;
      clearTimeout(timeout);
      if (document.visibilityState === 'hidden') {
        document.addEventListener('visibilitychange', showWhenVisible);
      } else {
        showWhenVisible();
      }
    }

    scene.addEventListener('animationend', (event) => {
      if (event.target === scene && event.animationName === 'meadow-passage') finish();
    });
    skip.addEventListener('click', finish);
    replay.addEventListener('click', () => play(true));
    document.addEventListener('keydown', (event) => {
      if (active && event.key === 'Escape') finish();
    });
    document.addEventListener('focusin', (event) => {
      if (active && event.target !== skip) finish();
    });
    document.addEventListener('pointerdown', (event) => {
      if (active && !scene.contains(event.target)) finish();
    }, true);
    window.addEventListener('wheel', finish, { passive: true });
    window.addEventListener('touchmove', finish, { passive: true });
    window.addEventListener('pagehide', finish);
    window.addEventListener('popstate', finish);
    motion.addEventListener('change', finish);
    if (startOnLoad) play(false);

    const pins = document.getElementById('mapPins');
    const centerZoom = () => {
      if (!viewport.classList.contains('is-enlarged')) return;
      const stop = pins.querySelector('.is-tour-current');
      const x = stop ? parseFloat(stop.style.left) / 100 : .5;
      const y = stop ? parseFloat(stop.style.top) / 100 : .5;
      viewport.scrollLeft = x * pins.clientWidth - viewport.clientWidth / 2;
      viewport.scrollTop = y * pins.clientHeight - viewport.clientHeight / 2;
    };
    pins.addEventListener('hooke:tour-stop', centerZoom);

    const plate = document.getElementById('farm-map');
    const dialog = document.getElementById('atlasDialog');
    const fullscreen = document.getElementById('atlasFullscreen');
    let inlineView;
    function setZoom(enlarged) {
      viewport.classList.toggle('is-enlarged', enlarged);
      zoom.setAttribute('aria-pressed', String(enlarged));
      zoom.textContent = enlarged ? 'Fit map' : 'Zoom in';
    }

    function updateMapSize() {
      const expanded = dialog.open || document.fullscreenElement === plate;
      if (expanded === plate.classList.contains('is-expanded')) return;
      if (expanded) {
        inlineView = { zoom: viewport.classList.contains('is-enlarged'), x: viewport.scrollLeft, y: viewport.scrollTop };
        if (window.matchMedia('(orientation: portrait)').matches) setZoom(true);
      }
      plate.classList.toggle('is-expanded', expanded);
      fullscreen.setAttribute('aria-pressed', String(expanded));
      fullscreen.textContent = expanded ? 'Exit full screen' : 'Full screen';
      if (expanded) requestAnimationFrame(centerZoom);
      else if (inlineView) {
        setZoom(inlineView.zoom);
        viewport.scrollTo(inlineView.x, inlineView.y);
      }
    }
    document.addEventListener('fullscreenchange', updateMapSize);
    dialog.addEventListener('close', () => {
      dialog.after(plate);
      updateMapSize();
      fullscreen.focus({ preventScroll: true });
    });
    fullscreen.addEventListener('click', async () => {
      if (dialog.open) { dialog.close(); return; }
      if (document.fullscreenElement === plate) { await document.exitFullscreen(); return; }
      if (document.fullscreenEnabled) {
        try { await plate.requestFullscreen(); return; }
        catch { /* Embedded previews may only allow an in-page full-screen view. */ }
      }
      dialog.append(plate);
      dialog.showModal();
      updateMapSize();
      fullscreen.focus({ preventScroll: true });
    });

    zoom.addEventListener('click', () => {
      const enlarge = zoom.getAttribute('aria-pressed') !== 'true';
      setZoom(enlarge);
      if (enlarge) centerZoom();
    });
  });
})();
