// Page motion, kept deliberately cheap: everything animates transform or
// opacity only, there is one observer per concern, scroll work happens in a
// single requestAnimationFrame, and slow devices get the static page.

const html = () => document.documentElement;

export const isLite = () => html().classList.contains('lite');
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const LITE_EVENT = 'perf:lite';

/** Switch the page to the lite tier at runtime (fires once). */
export function goLite() {
  if (isLite()) return;
  html().classList.add('lite');
  window.dispatchEvent(new Event(LITE_EVENT));
}

export function onLite(fn: () => void) {
  window.addEventListener(LITE_EVENT, fn, { once: true });
  return () => window.removeEventListener(LITE_EVENT, fn);
}

/**
 * Fade-up reveals for `.reveal` elements, and play/pause for `.loop`
 * elements (looping animations only run while visible).
 *
 * The first observer pass marks everything already on screen as shown before
 * the hidden state is switched on, so prerendered content never flashes and no
 * layout is forced during hydration.
 */
export function initReveal(): () => void {
  const revealer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        revealer.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -7% 0px', threshold: 0.01 },
  );

  const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  const firstPass = new IntersectionObserver((entries) => {
    firstPass.disconnect();
    for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-in');
    html().classList.add('reveal-on');
    for (const el of reveals) if (!el.classList.contains('is-in')) revealer.observe(el);
  });
  for (const el of reveals) firstPass.observe(el);

  const looper = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('playing', e.isIntersecting);
  });
  for (const el of document.querySelectorAll('.loop')) looper.observe(el);

  // Elements React mounts later (booking steps, hot reload) get picked up too.
  const watcher = new MutationObserver((records) => {
    for (const r of records) {
      for (const node of r.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('.reveal, .loop')]) {
          if (el.classList.contains('reveal') && !el.classList.contains('is-in')) {
            if (html().classList.contains('reveal-on')) revealer.observe(el);
            else el.classList.add('is-in');
          }
          if (el.classList.contains('loop')) looper.observe(el);
        }
      }
    }
  });
  watcher.observe(document.body, { childList: true, subtree: true });

  return () => {
    firstPass.disconnect();
    revealer.disconnect();
    looper.disconnect();
    watcher.disconnect();
  };
}

/**
 * Scroll parallax for `[data-speed]` elements, desktop only (phones get the
 * static composition). Positions are measured once and on resize, and only
 * visible elements move, so each frame is a few transform writes.
 */
export function initParallax(): () => void {
  if (isLite() || prefersReducedMotion() || !hasFinePointer()) return () => {};
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-speed]'));
  if (!els.length) return () => {};

  type Item = { el: HTMLElement; speed: number; mid: number; on: boolean };
  const items: Item[] = els.map((el) => ({ el, speed: Number(el.dataset.speed) || 0, mid: 0, on: false }));
  let stopped = false;
  let raf = 0;
  let resizeTimer = 0;

  const pageTop = (el: HTMLElement) => {
    // offsetTop ignores transforms, so our own translate never skews it.
    let y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
  };
  const measure = () => {
    if (stopped) return;
    for (const it of items) it.mid = pageTop(it.el) + it.el.offsetHeight / 2;
    schedule();
  };
  const frame = () => {
    raf = 0;
    if (stopped) return;
    const sy = window.scrollY;
    const half = window.innerHeight / 2;
    for (const it of items) {
      if (!it.on) continue;
      const y = (it.mid - sy - half) * -it.speed;
      it.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
    }
  };
  const schedule = () => {
    if (!raf && !stopped) raf = requestAnimationFrame(frame);
  };
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 150);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const it = items.find((i) => i.el === e.target);
        if (!it) continue;
        it.on = e.isIntersecting;
        // Hold a GPU layer only while the element is near the screen.
        it.el.style.willChange = it.on ? 'transform' : '';
      }
      schedule();
    },
    { rootMargin: '25% 0px' },
  );
  for (const it of items) io.observe(it.el);

  measure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', measure, { once: true });
  document.fonts?.ready.then(measure);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(resizeTimer);
    io.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('load', measure);
    for (const it of items) {
      it.el.style.transform = '';
      it.el.style.willChange = '';
    }
  };
  const offLite = onLite(stop);
  return () => {
    offLite();
    stop();
  };
}

/**
 * Pointer depth for the hero (desktop with a mouse only, while visible).
 * Writes `translate` straight onto each `[data-depth]` layer and the tilt onto
 * `.hero-tilt`, so a frame touches 5 elements instead of restyling the subtree.
 */
export function initPointerDepth(stage: HTMLElement): () => void {
  if (isLite() || prefersReducedMotion() || !hasFinePointer()) return () => {};

  const layers = Array.from(stage.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
    el,
    depth: Number(el.dataset.depth) || 1,
  }));
  const tilt = stage.querySelector<HTMLElement>('.hero-tilt');
  const wide = window.matchMedia('(min-width: 1024px)');

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let visible = true;

  const write = () => {
    for (const l of layers) l.el.style.translate = `${(-x * l.depth * 9).toFixed(2)}px ${(-y * l.depth * 7).toFixed(2)}px`;
    if (!tilt) return;
    // Below 1024px the layout stacks and the CSS has no tilt; don't leave one inline.
    tilt.style.transform = wide.matches ? `perspective(1900px) rotateY(${(-7 + x * 2.5).toFixed(3)}deg) rotateX(${(3 - y * 2).toFixed(3)}deg)` : '';
  };
  const onWide = () => write();
  wide.addEventListener('change', onWide);
  const loop = () => {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    write();
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.01) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      for (const l of layers) l.el.style.willChange = '';
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!visible || e.pointerType !== 'mouse') return;
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!raf) {
      for (const l of layers) l.el.style.willChange = 'translate';
      raf = requestAnimationFrame(loop);
    }
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  });
  io.observe(stage);
  window.addEventListener('pointermove', onMove, { passive: true });

  const stop = () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    wide.removeEventListener('change', onWide);
    window.removeEventListener('pointermove', onMove);
    for (const l of layers) {
      l.el.style.translate = '';
      l.el.style.willChange = '';
    }
    if (tilt) tilt.style.transform = '';
  };
  const offLite = onLite(stop);
  return () => {
    offLite();
    stop();
  };
}

/**
 * Stutter watchdog. Counts long frames (> 50ms) that happen while the visitor
 * is scrolling or moving the mouse; three within two seconds means the device
 * is struggling, so the page drops to the lite tier for the rest of the visit.
 * Uses the browser's own frame timing, so it works however the page is
 * scrolled and also catches pointer and idle animation cost.
 */
export function initWatchdog(): () => void {
  if (isLite() || typeof PerformanceObserver === 'undefined') return () => {};
  const supported = PerformanceObserver.supportedEntryTypes ?? [];
  const type = supported.includes('long-animation-frame') ? 'long-animation-frame' : supported.includes('longtask') ? 'longtask' : null;
  if (!type) return () => {};

  let lastInput = -Infinity;
  const onInput = () => {
    lastInput = performance.now();
  };
  const hits: number[] = [];
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.duration < 50 || e.startTime - lastInput > 1000) continue;
      hits.push(e.startTime);
    }
    // Window measured between frame starts, so very long frames (the worst
    // devices) still count three to a window instead of pushing each other out.
    const newest = hits[hits.length - 1];
    while (hits.length && newest - hits[0] > 2000) hits.shift();
    if (hits.length >= 3) {
      stop();
      goLite();
    }
  });

  const events = ['scroll', 'wheel', 'touchmove', 'pointermove'] as const;
  for (const ev of events) window.addEventListener(ev, onInput, { passive: true });
  po.observe({ type, buffered: false });

  function stop() {
    po.disconnect();
    for (const ev of events) window.removeEventListener(ev, onInput);
  }
  return stop;
}

/**
 * Scroll to the booking card and move focus into it. On phones the card itself
 * is the target, so the first question and its Continue button are on screen.
 */
export function goToBooking(e?: { preventDefault(): void }) {
  const section = document.getElementById('book');
  if (!section) return;
  e?.preventDefault();
  const card = document.getElementById('booking-card');
  const target = window.innerWidth < 1024 && card ? card : section;
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  const want = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const alreadyThere = Math.abs(target.getBoundingClientRect().top - want) < 2;
  target.scrollIntoView({ behavior, block: 'start' });
  history.replaceState(null, '', '#book');

  // Sections below the fold render lazily (content-visibility), so their real
  // heights can differ from the estimate the smooth scroll started with.
  // Once the scroll settles, nudge the target back to where it belongs.
  let done = false;
  let timer = 0;
  const inputs = ['wheel', 'touchstart', 'keydown'] as const;
  const cleanup = () => {
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('scrollend', settle);
    for (const ev of inputs) window.removeEventListener(ev, cancel);
  };
  // If the visitor takes over the scroll, leave them where they are.
  const cancel = () => cleanup();
  const settle = () => {
    if (done) return;
    cleanup();
    if (Math.abs(target.getBoundingClientRect().top - want) > 4) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    document.getElementById('booking-focus')?.focus({ preventScroll: true });
  };
  if (alreadyThere || behavior === 'auto') {
    settle();
    return;
  }
  // Whichever comes first: the browser saying the scroll ended, or a timer
  // (older Safari has no scrollend, and long smooth scrolls can stall).
  window.addEventListener('scrollend', settle, { once: true });
  for (const ev of inputs) window.addEventListener(ev, cancel, { once: true, passive: true });
  timer = window.setTimeout(settle, 1400);
}
