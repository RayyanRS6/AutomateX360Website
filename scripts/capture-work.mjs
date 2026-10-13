// Screenshots the live portfolio sites listed in src/content.ts (`work`) and
// turns them into the WebP images the page uses, plus src/work-manifest.json.
//
//   node scripts/capture-work.mjs              # every site
//   node scripts/capture-work.mjs nexus        # one slug
//   node scripts/capture-work.mjs --no-shoot   # only rebuild images from the
//                                              # last captures in .cache/work
//
// Uses the locally installed Edge/Chrome (headless) through puppeteer-core.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { work } from '../src/content.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = resolve(root, '.cache/work');
const outDir = resolve(root, 'public/work');
const manifestPath = resolve(root, 'src/work-manifest.json');
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const noShoot = args.includes('--no-shoot');
const only = args.find((a) => !a.startsWith('--'));
const sites = work.filter((w) => !only || w.slug === only);

const BROWSER = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);

/** Longest page section we keep for the hover-scroll card (in CSS px at 1440 wide). */
const MAX_FULL_HEIGHT = 7200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Make scroll-triggered reveals land instantly, and hide scrollbars.
const SETTLE_CSS = `
  *,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}
  html{scroll-behavior:auto!important}
  ::-webkit-scrollbar{display:none}
  #nl-badge-frame,iframe[id*="badge" i],[id*="netlify-badge" i]{display:none!important}
`;

// Host badges (e.g. "Powered by Netlify") are not part of the design.
async function removeBadges(page) {
  await page.evaluate(() => {
    for (const f of document.querySelectorAll('iframe')) if (/netlify/i.test(f.src)) f.remove();
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      const text = (el.textContent || '').trim();
      if ((pos === 'fixed' || pos === 'sticky') && /netlify/i.test(text) && text.length < 60) el.remove();
    }
    for (const el of document.querySelectorAll('[id*="netlify" i], [class*="netlify-badge" i]')) el.remove();
  });
}

/**
 * Full-page capture by scrolling one screen at a time and stitching. Unlike a
 * single full-page shot, this lets scroll-driven sections render as a visitor
 * would see them. The fixed header is kept in the first frame only.
 */
async function stitchedFull(page, out) {
  const vw = 1440;
  const vh = 900;
  const total = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_FULL_HEIGHT);
  const layers = [];
  for (let y = 0; y < total; y += vh) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(500);
    if (y > 0) {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
          const r = el.getBoundingClientRect();
          if (r.top <= 24 && r.height < 170 && r.width > window.innerWidth * 0.5) el.style.visibility = 'hidden';
        }
      });
    }
    const top = await page.evaluate(() => Math.round(window.scrollY));
    const h = Math.min(vh, total - top);
    if (h <= 0) break;
    const buf = await page.screenshot({ type: 'png' });
    layers.push({ input: h < vh ? await sharp(buf).extract({ left: 0, top: 0, width: vw, height: h }).toBuffer() : buf, top, left: 0 });
  }
  await sharp({ create: { width: vw, height: total, channels: 3, background: '#ffffff' } })
    .composite(layers)
    .png()
    .toFile(out);
  await page.evaluate(() => window.scrollTo(0, 0));
  return total;
}

async function settle(page) {
  await page.addStyleTag({ content: SETTLE_CSS });
  await removeBadges(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Walk down the page so lazy images and scroll reveals trigger, then back up.
    const step = Math.max(200, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 300));
    for (const img of document.images) img.loading = 'eager';
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 4000); }))));
    window.scrollTo(0, 0);
  });
  await sleep(900);
}

async function shoot(browser, site) {
  const out = {};
  const page = await browser.newPage();

  // Desktop: first viewport at 2x for the hero, full page at 1x for the cards.
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(site.href, { waitUntil: 'networkidle2', timeout: 90000 });
  await settle(page);
  out.title = await page.title();
  out.description = await page.$eval('meta[name="description"]', (m) => m.content).catch(() => '');
  await page.screenshot({ path: resolve(rawDir, `${site.slug}-fold.png`) });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await sleep(500);
  out.fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await removeBadges(page);
  await stitchedFull(page, resolve(rawDir, `${site.slug}-full.png`));

  // Mobile: first viewport at 2x.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  );
  await page.goto(site.href, { waitUntil: 'networkidle2', timeout: 90000 });
  await settle(page);
  await removeBadges(page);
  await page.screenshot({ path: resolve(rawDir, `${site.slug}-mfold.png`) });

  await page.close();
  return out;
}

async function variants(src, slug, kind, widths, { crop } = {}) {
  for (const w of widths) {
    let img = sharp(src);
    if (crop) img = img.extract(crop);
    await img
      .resize({ width: w, withoutEnlargement: false })
      .webp({ quality: kind === 'full' ? 72 : 80, effort: 6, smartSubsample: true })
      .toFile(resolve(outDir, `${slug}-${kind}-${w}.webp`));
  }
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const browser = noShoot
  ? null
  : await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--hide-scrollbars', '--no-first-run'] });

try {
  for (const site of sites) {
    console.log(`→ ${site.slug}  ${site.href}`);
    const info = browser ? await shoot(browser, site) : { title: '(reused capture)', fullHeight: 0 };

    await variants(resolve(rawDir, `${site.slug}-fold.png`), site.slug, 'fold', [600, 800, 1200, 1600]);

    const m = await sharp(resolve(rawDir, `${site.slug}-mfold.png`)).metadata();
    await variants(resolve(rawDir, `${site.slug}-mfold.png`), site.slug, 'mfold', [300, 400, 600]);
    // 3:4 crop of the top of the phone view, for the proof cards on phones.
    await variants(resolve(rawDir, `${site.slug}-mfold.png`), site.slug, 'mtop', [400, 600], {
      crop: { left: 0, top: 0, width: m.width, height: Math.min(m.height, Math.round((m.width * 4) / 3)) },
    });

    const f = await sharp(resolve(rawDir, `${site.slug}-full.png`)).metadata();
    const keep = Math.min(f.height, MAX_FULL_HEIGHT);
    await variants(resolve(rawDir, `${site.slug}-full.png`), site.slug, 'full', [600, 900, 1200], {
      crop: { left: 0, top: 0, width: f.width, height: keep },
    });

    manifest[site.slug] = { fullRatio: +(keep / f.width).toFixed(3) };
    console.log(`  title: ${info.title}`);
    if (info.description) console.log(`  description: ${info.description}`);
    if (info.fullHeight) console.log(`  page height: ${info.fullHeight}px (kept ${keep}px)`);
  }
} finally {
  await browser?.close();
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${manifestPath}`);
