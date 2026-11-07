// Recording mode for Instagram stories: open index.html?record (or ?record=3 for a
// 3-second lead-in) and the page plays a ~16 s scripted take. Press R to replay.
// Record at a 9:16 viewport taller than 720px (e.g. 414×736) so the pinned story runs.
(() => {
  const lead = Number(new URLSearchParams(location.search).get('record')) || 1;
  const story = document.querySelector('.scroll-story');
  const viewport = document.querySelector('.story-sticky');
  const header = document.querySelector('.header');
  const complete = document.querySelector('#complete-task');
  const closing = document.querySelector('#get-app');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;

  history.scrollRestoration = 'manual';
  document.documentElement.classList.add('recording');
  const style = document.createElement('style');
  style.textContent = `
    html.recording{scroll-behavior:auto;scrollbar-width:none}
    html.recording::-webkit-scrollbar{display:none}
    html.recording,html.recording *{cursor:none!important}
    .record-tap{position:fixed;z-index:50;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
      background:#14141433;pointer-events:none;animation:record-tap .55s cubic-bezier(.22,1,.36,1) forwards}
    @keyframes record-tap{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}`;
  document.head.append(style);

  // Same timeline mapping as site.js: story progress p ↦ scroll position.
  const storyY = p => {
    const top = story.getBoundingClientRect().top + scrollY - header.offsetHeight;
    return top + p*(story.offsetHeight - viewport.clientHeight);
  };
  const closingY = () => {
    const rect = closing.getBoundingClientRect();
    const visible = innerHeight - header.offsetHeight;
    return rect.top + scrollY - header.offsetHeight - Math.max(0, (visible - rect.height)/2);
  };
  const scrollToY = (to, duration) => new Promise(resolve => {
    const from = scrollY, start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start)/duration);
      scrollTo({top: from + (to - from)*easeInOut(t), behavior: 'instant'});
      t < 1 ? requestAnimationFrame(step) : resolve();
    };
    requestAnimationFrame(step);
  });
  const tap = element => {
    const rect = element.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'record-tap';
    dot.style.left = `${rect.left + rect.width/2}px`;
    dot.style.top = `${rect.top + rect.height/2}px`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 600);
    element.click();
  };

  let take = 0;
  async function run() {
    const id = ++take;
    const live = () => id === take;
    scrollTo({top: 0, behavior: 'instant'});
    await sleep(lead*1000);
    // 0–2 s: the hero headline and mascot.
    if (!live()) return; await sleep(2000);
    // 2–3.4 s: a tap on Complete for the celebration jump.
    if (!live()) return; tap(complete); await sleep(1400);
    // 3.4–6.6 s: "All the things. One place."
    if (!live()) return; await scrollToY(storyY(.31), 1500); await sleep(1700);
    // 6.6–9.9 s: the somersault into "Just this. Right now."
    if (!live()) return; await scrollToY(storyY(.59), 1600); await sleep(1700);
    // 9.9–13.1 s: the mascot crosses over to "One down. Look at you."
    if (!live()) return; await scrollToY(storyY(.92), 1700); await sleep(1500);
    // 13.1 s on: "You've got this." with the App Store badge; trim the end to taste.
    if (!live()) return; await scrollToY(closingY(), 1200);
  }

  addEventListener('keydown', event => { if (event.key === 'r' || event.key === 'R') run(); });
  const mascotReady = new Promise(resolve => {
    const stage = document.querySelector('#mascot-stage');
    if (stage.classList.contains('loaded')) return resolve();
    new MutationObserver((_, observer) => {
      if (stage.classList.contains('loaded')) { observer.disconnect(); resolve(); }
    }).observe(stage, {attributes: true, attributeFilter: ['class']});
    setTimeout(resolve, 4000);
  });
  Promise.all([document.fonts.ready, mascotReady]).then(run);
})();
