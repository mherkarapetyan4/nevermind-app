(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('#motion-toggle');
  let paused = reduced.matches;
  const updateMotion = () => {
    document.documentElement.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('span').textContent = paused ? 'Play floating' : 'Pause floating';
    window.dispatchEvent(new CustomEvent('nevermind-motion', { detail: { paused } }));
  };
  toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
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
  const buttons = [...document.querySelectorAll('[data-step]')];
  const track = document.querySelector('.story-track > span');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const centers = [0, .32, .61, .90];
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
  function measure() {
    const h = viewport.clientHeight;
    metrics = {
      h, w: viewport.clientWidth, innerWidth: inner.clientWidth,
      top: story.getBoundingClientRect().top + scrollY - header.offsetHeight,
      range: Math.max(1, story.offsetHeight-h),
      screenWidths: screens.map(screen => screen.offsetWidth),
      stageWidth: stage.offsetWidth, stageHeight: stage.offsetHeight,
      taskTop: task.offsetTop
    };
    schedule();
  }
  function render(now) {
    frame = 0;
    if (reduced.matches) return;
    const {h, w, innerWidth, top, range, screenWidths, stageWidth, stageHeight, taskTop} = metrics;
    const mobile = w <= 760;
    const compact = w <= 1024;
    const shortTablet = !mobile && compact && h < 770;
    const target = clamp((scrollY-top)/range);
    // Time-based easing absorbs wheel steps equally at 60 Hz and 120 Hz.
    // The page itself still scrolls natively; only the pinned artwork follows softly.
    const dt = lastTime ? Math.min(now-lastTime, 64) : 16.67;
    lastTime = now;
    progress += (target-progress)*(1-Math.exp(-dt/160));
    if (Math.abs(target-progress)<.00001) progress=target;
    track.style.transform = `${compact?'scaleX':'scaleY'}(${progress})`;
    story.dataset.progress = progress.toFixed(4);
    const leave = ease(progress/.20);
    title.style.transform = `translate3d(0,${-leave*h*.85}px,0)`;
    title.style.opacity = 1-leave;
    intro.style.transform = `translate3d(0,${-leave*h*.6}px,0)`;
    intro.style.opacity = 1-leave;
    expose(intro, progress < .14);
    task.style.transform = `translate3d(${compact?'-50%':`${leave*w*.14}px`},${leave*h*.9}px,0) rotate(${compact?0:-5+leave*22}deg)`;
    task.style.opacity = 1-leave;
    expose(task, progress < .14);
    sideNote.style.opacity = 1-leave;
    const travel = ease((progress-.02)/.30);
    const shrink = ease((progress-.32)/.29);
    const cross = ease((progress-.61)/.29);
    const dock = ease(progress/.24);
    const scale = compact ? (1+(shortTablet?.10:.60)*(1-dock))*(1-shrink*.12) : 1 - travel*.42 - shrink*.20;
    const leftPosition = -travel*w*(mobile?.29:.29);
    const rightPosition = w*(mobile?.19:.045);
    const stageX = leftPosition*(1-cross)+rightPosition*cross;
    const stageY = travel*h*(mobile?.19:.23) - Math.sin(cross*Math.PI)*h*.13;
    // Center the opening pair, dock beside the cards, then change sides while
    // the outgoing card has left and the incoming card is still below the stage.
    const compactCross = ease((progress-.67)/.20);
    const inset = mobile ? -6 : innerWidth*.04;
    const rightDock = innerWidth-inset-stageWidth/2;
    const leftDock = inset+stageWidth/2;
    const openingX = innerWidth*(shortTablet?.75:.5);
    const compactX = openingX+(rightDock-openingX)*dock+(leftDock-rightDock)*compactCross;
    const openingY = shortTablet ? h*.64-stageHeight/2 : taskTop-stageHeight+12;
    const compactY = openingY+(h*.63-stageHeight/2-openingY)*dock;
    stage.style.transform = compact
      ? `translate3d(${compactX-stageWidth/2}px,${compactY}px,0) scale(${scale})`
      : `translate3d(${stageX}px,${stageY}px,0) scale(${scale})`;
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
      if (compact && chapter===1 && progress<.32) alpha *= ease((progress-.24)/.08);
      if (compact && chapter===2 && progress>.61) {
        const exit = ease((progress-.61)/.08);
        alpha=1-exit;
        y=exit*h;
      }
      if (compact && chapter===3) {
        const enter = ease((progress-.78)/.12);
        alpha=enter;
        y=(1-enter)*h;
      }
      const screen = screens[i];
      // The final screen crosses left as its copy crosses right, in step with the mascot.
      const screenShift = chapter===3 ? (compact ? innerWidth-screenWidths[i] : (25-(innerWidth*.90-screenWidths[i]))*cross) : 0;
      const copyShift = chapter===3 && !compact ? (innerWidth*.54-25)*cross : 0;
      const rotation = compact ? 0 : (chapter===2?3:-3)+Math.sign(delta)*Math.min(distance,2)*7;
      screen.style.transform = `translate3d(${screenShift}px,${y}px,0) rotate(${rotation}deg)`;
      screen.style.opacity = alpha;
      screen.style.visibility = alpha>.001?'visible':'hidden';
      copy.style.transform = `translate3d(${copyShift}px,${-Math.sign(delta)*distance*h*.16}px,0)`;
      copy.style.opacity = alpha;
      copy.style.visibility = alpha>.001?'visible':'hidden';
      expose(screen, alpha>.5);
      expose(copy, alpha>.5);
    });
    const chapter = progress<.16?0:progress<.465?1:progress<.755?2:3;
    if (chapter!==currentChapter) {
      currentChapter=chapter;
      story.dataset.chapter=chapter;
      buttons.forEach((button,i) => i===chapter ? button.setAttribute('aria-current','step') : button.removeAttribute('aria-current'));
    }
    window.dispatchEvent(new CustomEvent('nevermind-scroll',{detail:{progress,flip:shrink,cross}}));
    if (progress!==target) schedule();
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(render); }
  function go(chapter) {
    if (reduced.matches) { copies[Math.max(0,chapter-1)].scrollIntoView({behavior:'instant',block:'start'}); return; }
    scrollTo({top:metrics.top+centers[chapter]*metrics.range,behavior:'smooth'});
  }
  buttons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));
  document.querySelector('.story-start').addEventListener('click', () => go(1));
  function mode() {
    document.documentElement.classList.toggle('story-ready',!reduced.matches);
    cancelAnimationFrame(frame);
    frame=0;
    lastTime=0;
    if (reduced.matches) {
      [...copies,...screens,intro,task].forEach(el=>expose(el,true));
      [title,intro,task,...copies,...screens].forEach(el=>{el.style.transform='';el.style.opacity='';el.style.visibility='';});
      stage.style.transform='';
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
  mode();
})();
