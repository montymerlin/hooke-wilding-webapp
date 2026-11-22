const titles = ['Welcome', 'A wilder Hooke', 'A listening garden', 'The painting', 'Along the branch', 'The painted tree', 'Garden dashboard', 'Behind the garden', 'With love'];
const lastChapter = titles.length - 1;
/* The gift is visitor-paced. No clock, media event or layout change advances it. */
function chapterAfter(chapter, direction) { return Math.max(0, Math.min(lastChapter, chapter + direction)); }
function reviewChapter(value) {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 0 && n <= lastChapter ? n : null;
}
if (typeof module !== 'undefined') module.exports = {chapterAfter, reviewChapter};
if (typeof document !== 'undefined') (() => {
  const $ = selector => document.querySelector(selector);
  const panels = [...document.querySelectorAll('[data-chapter]')];
  const intro = $('#intro'), video = $('#gift-painting');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let chapter = 0;
  function updatePlayback() {
    $('#painting-toggle').textContent = video.paused ? (video.ended ? 'Play again' : 'Play painting') : 'Pause painting';
    $('#painting-toggle').setAttribute('aria-label', $('#painting-toggle').textContent);
  }
  async function playPainting() {
    if (video.ended) video.currentTime = 0;
    try { await video.play(); } catch (_) { /* The explicit Play control remains available. */ }
    updatePlayback();
  }
  function show(n, focus = true) {
    chapter = chapterAfter(n, 0);
    video.pause();
    for (const panel of panels) panel.hidden = Number(panel.dataset.chapter) !== chapter;
    $('#story-navigation').hidden = chapter === 0;
    $('#chapter-name').textContent = titles[chapter];
    $('#position').textContent = chapter + ' / ' + lastChapter;
    $('#progress-track i').style.width = (chapter / lastChapter * 100) + '%';
    $('#continue').hidden = chapter === lastChapter;
    $('#continue').textContent = chapter === 4 ? 'See the tree' : chapter === 6 ? 'The tech' : chapter === 7 ? 'Your gift' : 'Continue';
    $('#story-announcement').textContent = chapter ? 'Chapter ' + chapter + ' of ' + lastChapter + ': ' + titles[chapter] : '';
    const active = panels.find(panel => Number(panel.dataset.chapter) === chapter);
    if (focus) active.querySelector('h1,h2').focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
    if (chapter === 3 && !motion.matches) playPainting();
    updatePlayback();
  }
  $('#entrance').onclick = () => show(1);
  $('#continue').onclick = () => show(chapterAfter(chapter,1));
  $('#previous').onclick = () => show(chapterAfter(chapter,-1));
  document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => show(Number(button.dataset.go)));
  $('#painting-toggle').onclick = () => video.paused ? playPainting() : video.pause();
  $('#painting-restart').onclick = () => { video.currentTime = 0; playPainting(); };
  for (const event of ['play','pause','ended']) video.addEventListener(event, updatePlayback);
  const failedVideo = () => { $('#video-error').hidden = false; $('#painting-toggle').disabled = true; $('#painting-restart').disabled = true; };
  video.addEventListener('error', failedVideo);
  video.querySelector('source').addEventListener('error', failedVideo);
  if (video.error) failedVideo();
  motion.addEventListener('change', () => { if (motion.matches) video.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  document.addEventListener('keydown', event => {
    if (intro.inert || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('a,input,select,textarea,video,[data-go],#painting-toggle,#painting-restart')) return;
    if (chapter > 0 && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault(); show(chapterAfter(chapter,event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  $('#gift-replay').onclick = () => {
    show(0,false);
    const wrapper = $('.gift-wrap'), button = wrapper.querySelector('.parcel-button');
    wrapper.classList.remove('unwrapping'); wrapper.hidden = false; button.disabled = false;
    intro.inert = true; button.focus();
  };
  const params = new URLSearchParams(location.search);
  if (params.get('tech') === 'field-guide') {
    $('.farmhouse-scene').hidden = true;
  }
  const review = reviewChapter(params.get('scene'));
  if (review !== null) { intro.inert = false; show(review,false); }
})();
