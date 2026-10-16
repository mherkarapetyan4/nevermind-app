(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  const updateMotion = () => {
    document.documentElement.classList.toggle('motion-paused', paused);
    window.dispatchEvent(new CustomEvent('nevermind-motion', { detail: { paused } }));
  };
  reduced.addEventListener('change', e => { paused = e.matches; updateMotion(); });
  updateMotion();
  if ('IntersectionObserver' in window && !reduced.matches) {
    document.documentElement.classList.add('js-reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  const tasks = [
    'Pay the bill before they\ncut the internet.',
    'Reply to that email.\nYou know the one.',
    'Take the package\nout of the hallway.',
    'Book the appointment.\nThen stop thinking about it.'
  ];
  const text = document.querySelector('#demo-task');
  const card = document.querySelector('#demo-card');
  const complete = document.querySelector('#complete-task');
  let index = 0;
  let resetTimer;
  complete.addEventListener('click', () => {
    clearTimeout(resetTimer);
    index = (index + 1) % tasks.length;
    text.textContent = tasks[index];
    text.style.whiteSpace = 'pre-line';
    complete.querySelector('span').textContent = 'One down. Nice.';
    card.classList.add('celebrate');
    window.dispatchEvent(new Event('nevermind-complete'));
    resetTimer = setTimeout(() => {
      card.classList.remove('celebrate');
      complete.querySelector('span').textContent = 'Complete';
    }, 1100);
  });
})();

// Scroll position is the animation timeline; no wheel interception or scroll locking.
(() => {
  const story = document.querySelector('.scroll-story');
  const viewport = document.querySelector('.story-sticky');
  const header = document.querySelector('.header');
  const inner = document.querySelector('.hero-inner');
  const stage = document.querySelector('#mascot-stage');
  const title = document.querySelector('#hero-title');
  const intro = document.querySelector('.hero-story');
  const task = document.querySelector('#demo-card');
  const sideNote = document.querySelector('.side-note');
  const copies = [...document.querySelectorAll('[data-chapter]')];
  const screens = [...document.querySelectorAll('[data-screen]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Keep the readable text scale on short phones by using the stacked layout.
  // Landscape phones are too short for a pinned scene at any width.
  const shortScreen = matchMedia('(max-width: 760px) and (max-height: 720px), (max-height: 520px)');
  const usesStackedLayout = () => reduced.matches || shortScreen.matches;
  // Landscape tablets have the room for the desktop scene; must match style.css.
  const compactScreen = matchMedia('(max-width: 760px), (max-width: 1180px) and (orientation: portrait)');
  const centers = [0, .32, .61, .90];
  // Compact [enter, exit] progress per chapter; the mascot swaps sides in the gap before chapter 3.
  const compactWindows = [[.17, .40], [.46, .66], [.75, 2]];
  // Tallest crop per screen (height / width), before app chrome below the content shows.
  const cropLimits = [1.4, .95, 1.4];
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x*x*(3-2*x); };
  let frame = 0, lastTime = 0, progress = 0;
  let metrics;
  let currentChapter = -1;
  const exposure = new WeakMap();
  function expose(element, visible) {
    if (exposure.get(element) === visible) return;
    exposure.set(element, visible);
    element.setAttribute('aria-hidden', String(!visible));
    element.inert = !visible;
  }
  // Read layout only when it changes, before any animation writes.
  // On compact screens each card sits right under its copy and takes the height
  // that remains, leaving room for the mascot perched on its bottom corner.
  function layoutCards(compact, h) {
    screens.forEach((screen, i) => {
      const crop = screen.querySelector('.story-crop');
      screen.style.top = '';
      crop.style.height = '';
      if (!compact) return;
      const copy = copies[i];
      const top = copy.offsetTop + copy.offsetHeight + (h > 900 ? 36 : 18);
      const chrome = screen.offsetHeight - crop.offsetHeight;
      screen.style.top = `${top}px`;
      // Fill the remaining height, up to a crop that still reads as the app's top section.
      crop.style.height = `${Math.max(110, Math.min(crop.offsetWidth*cropLimits[i], h - top - chrome - stage.offsetHeight*.42))}px`;
    });
  }
  function measure() {
    const h = viewport.clientHeight;
    layoutCards(!usesStackedLayout() && compactScreen.matches, h);
    metrics = {
      h, w: viewport.clientWidth, innerWidth: inner.clientWidth,
      top: story.getBoundingClientRect().top + scrollY - header.offsetHeight,
      range: Math.max(1, story.offsetHeight-h),
      screenWidths: screens.map(screen => screen.offsetWidth),
      cardBottoms: screens.map(screen => screen.offsetTop + screen.offsetHeight),
      stageWidth: stage.offsetWidth, stageHeight: stage.offsetHeight,
      taskTop: task.offsetTop,
      introBottom: intro.offsetTop + intro.offsetHeight
    };
    schedule();
  }
  function render(now) {
    frame = 0;
    if (usesStackedLayout()) return;
    const {h, w, innerWidth, top, range, screenWidths, cardBottoms, stageWidth, stageHeight, taskTop, introBottom} = metrics;
    const mobile = w <= 760;
    const compact = compactScreen.matches;
    const target = clamp((scrollY-top)/range);
    // Time-based easing absorbs wheel steps equally at 60 Hz and 120 Hz.
    // The page itself still scrolls natively; only the pinned artwork follows softly.
    const dt = lastTime ? Math.min(now-lastTime, 64) : 16.67;
    lastTime = now;
    progress += (target-progress)*(1-Math.exp(-dt/160));
    if (Math.abs(target-progress)<.00001) progress=target;
    story.dataset.progress = progress.toFixed(4);
    const leave = ease(progress/.20);
    title.style.transform = `translate3d(0,${-leave*h*.85}px,0)`;
    title.style.opacity = 1-leave;
    intro.style.transform = `translate3d(0,${-leave*h*.6}px,0)`;
    intro.style.opacity = 1-leave;
    expose(intro, progress < .14);
    // On compact screens the opening mascot grows into the space between the intro and the task card.
    // Any room left at full size lifts the mascot and card together, splitting the gap.
    const heroRoom = taskTop-introBottom-28-stageHeight*.24;
    const openingScale = compact ? Math.max(1.16, Math.min(2, innerWidth*.8/stageWidth, heroRoom/(stageHeight*.33))) : 1;
    const heroLift = compact ? Math.max(0, heroRoom-openingScale*stageHeight*.33)/2 : 0;
    task.style.transform = `translate3d(${compact?'-50%':`${leave*w*.14}px`},${leave*h*.9-heroLift}px,0) rotate(${compact?0:-5+leave*22}deg)`;
    task.style.opacity = 1-leave;
    expose(task, progress < .14);
    sideNote.style.opacity = 1-leave;
    const travel = ease((progress-.02)/.30);
    const shrink = ease((progress-.32)/.29);
    const cross = ease((progress-.61)/.29);
    const dock = ease(progress/.24);
    const scale = compact ? 1+(openingScale-1)*(1-dock) : 1 - travel*.36 - shrink*.06;
    const leftPosition = -travel*w*(mobile?.29:.29);
    const rightPosition = w*(mobile?.19:.045);
    const stageX = leftPosition*(1-cross)+rightPosition*cross;
    const stageY = travel*h*(mobile?.19:.23) - Math.sin(cross*Math.PI)*h*.13 + cross*h*.06;
    // Center the opening pair, then perch on the bottom corner of each card,
    // changing sides while the outgoing card has left and the next is still below.
    const compactCross = ease((progress-.69)/.09);
    // Dock on the cards' outer corners: chapters 1–2 sit left, chapter 3 is pushed right.
    const rightDock = Math.min(innerWidth-stageWidth*.3, screenWidths[0]+stageWidth*.2);
    const leftDock = Math.max(stageWidth*.3, innerWidth-screenWidths[2]-stageWidth*.2);
    const openingX = innerWidth*.5;
    const compactX = openingX+(rightDock-openingX)*dock+(leftDock-rightDock)*compactCross;
    const openingY = taskTop-stageHeight*.74-heroLift;
    const [bottom1, bottom2, bottom3] = cardBottoms;
    const cardBottom = bottom1+(bottom2-bottom1)*ease((progress-.40)/.10)+(bottom3-bottom2)*ease((progress-.66)/.12);
    const compactY = openingY+(cardBottom-stageHeight*.55-openingY)*dock;
    stage.style.transform = compact
      ? `translate3d(${compactX-stageWidth/2}px,${compactY}px,0) scale(${scale})`
      : `translate3d(${stageX}px,${stageY}px,0) scale(${scale})`;
    // Behind the opening task card, in front of the story cards it sits on.
    stage.style.zIndex = compact && dock>.5 ? 7 : '';
    stage.dataset.flip = shrink.toFixed(3);
    stage.dataset.cross = cross.toFixed(3);
    stage.dataset.scale = scale.toFixed(3);
    const palette = [[248,247,244],[243,246,242],[248,244,242],[242,245,248]];
    const colorPhase = Math.min(2.999, progress/.9*3);
    const colorIndex = Math.floor(colorPhase);
    const blend = ease(colorPhase-colorIndex);
    viewport.style.backgroundColor = `rgb(${palette[colorIndex].map((v,i)=>Math.round(v+(palette[colorIndex+1][i]-v)*blend)).join(',')})`;
    // The focus view descends; the dump and momentum views rise.
    copies.forEach((copy, i) => {
      const chapter = i+1;
      let delta = progress-centers[chapter];
      if (chapter===3 && delta>0) delta=0;
      const distance = ease((Math.abs(delta)-.045)/.25)*2;
      let alpha = 1-ease((Math.abs(delta)-.10)/.085);
      const direction = chapter===2 ? 1 : -1;
      let y = Math.sign(delta)*distance*h*1.05*direction;
      let copyY = -Math.sign(delta)*distance*h*.16;
      // Small screens play chapters back to back: one fully leaves before the
      // next arrives, so headlines never overlap and no frame is left empty.
      if (compact) {
        const [start, end] = compactWindows[i];
        const enter = ease((progress-start)/.06);
        const exit = ease((progress-end)/.05);
        alpha = enter*(1-exit);
        y = (1-enter)*h*.22 - exit*h*.12;
        copyY = (1-enter)*24 - exit*24;
      }
      const screen = screens[i];
      // The final screen crosses left as its copy crosses right, in step with the mascot.
      const screenShift = chapter===3 ? (compact ? innerWidth-screenWidths[i] : (25-(innerWidth*.90-screenWidths[i]))*cross) : 0;
      const copyShift = chapter===3 && !compact ? (innerWidth*.54-25)*cross : 0;
      const rotation = compact ? (chapter===2?1.5:-1.5)*(2-alpha) : (chapter===2?3:-3)+Math.sign(delta)*Math.min(distance,2)*7;
      screen.style.transform = `translate3d(${screenShift}px,${y}px,0) rotate(${rotation}deg)`;
      screen.style.opacity = alpha;
      screen.style.visibility = alpha>.001?'visible':'hidden';
      copy.style.transform = `translate3d(${copyShift}px,${copyY}px,0)`;
      copy.style.opacity = alpha;
      copy.style.visibility = alpha>.001?'visible':'hidden';
      expose(screen, alpha>.5);
      expose(copy, alpha>.5);
    });
    const chapter = progress<.16?0:progress<.465?1:progress<.755?2:3;
    if (chapter!==currentChapter) {
      currentChapter=chapter;
      story.dataset.chapter=chapter;
    }
    window.dispatchEvent(new CustomEvent('nevermind-scroll',{detail:{progress,flip:shrink,cross}}));
    if (progress!==target) schedule();
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(render); }
  function go(chapter) {
    if (usesStackedLayout()) { copies[Math.max(0,chapter-1)].scrollIntoView({behavior:'instant',block:'start'}); return; }
    scrollTo({top:metrics.top+centers[chapter]*metrics.range,behavior:'smooth'});
  }
  document.querySelector('.story-start').addEventListener('click', () => go(1));
  function mode() {
    document.documentElement.classList.toggle('story-ready',!usesStackedLayout());
    cancelAnimationFrame(frame);
    frame=0;
    lastTime=0;
    if (usesStackedLayout()) {
      [...copies,...screens,intro,task].forEach(el=>expose(el,true));
      [title,intro,task,...copies,...screens].forEach(el=>{el.style.transform='';el.style.opacity='';el.style.visibility='';});
      stage.style.transform='';
      stage.style.zIndex='';
      layoutCards(false);
    } else {
      measure();
      progress=clamp((scrollY-metrics.top)/metrics.range);
    }
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',measure,{passive:true});
  new ResizeObserver(measure).observe(viewport);
  document.fonts.ready.then(measure);
  reduced.addEventListener('change',mode);
  shortScreen.addEventListener('change',mode);
  mode();
})();
