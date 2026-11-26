import { chromium } from 'playwright';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #151515; font-family: Arial, sans-serif; }
    main { width: 210mm; min-height: 297mm; padding: 24mm 22mm 18mm; }
    .top { border-bottom: 1px solid #151515; padding-bottom: 10mm; }
    .label, h2, footer { font-size: 9pt; letter-spacing: .09em; text-transform: uppercase; }
    .label { font-weight: 700; }
    h1 { margin: 4mm 0 2mm; font-size: 32pt; letter-spacing: -.04em; line-height: 1; }
    .sub { color: #666; font-size: 10.5pt; }
    section { display: grid; grid-template-columns: 34mm 1fr; gap: 6mm; padding: 7mm 0; border-bottom: 1px solid #d2d2ce; }
    h2 { margin: 0; font-weight: bold; }
    p, li { margin: 0 0 3mm; font-size: 10.5pt; line-height: 1.5; }
    ul { margin: 0; padding-left: 5mm; }
    .muted { color: #666; }
    footer { margin-top: 12mm; color: #666; }
  </style></head><body><main>
    <header class="top"><div class="label">Curriculum vitae</div><h1>Abdul Saboor</h1><div class="sub">Web Developer · Creative Designer · Problem Solver</div></header>
    <section><h2>Profile</h2><div><p>Building digital experiences through code, creativity, and thoughtful design.</p></div></section>
    <section><h2>Education</h2><div><p><strong>Diploma in Computer Information Technology (DAE CIT)</strong><br>Government College of Technology Bhakkar · 2024–2027 · In progress</p><p><strong>Matriculation, Science</strong><br>Govt. Model High School Bhakkar · 2022–2024</p></div></section>
    <section><h2>Selected work</h2><div><p><strong>DAE2UNI Pathway</strong><br>A platform for DAE CIT students to explore universities and computing programs.</p><p><strong>Interactive Portrait Showcase</strong><br>An interactive portrait that follows the cursor using HTML5 Canvas.</p><p><strong>Portfolio Legacy</strong><br>A personal portfolio exploring responsive layouts and visual design.</p></div></section>
    <footer>Abdul Saboor · Portfolio</footer>
  </main></body></html>`);
  await page.pdf({
    path: resolve('public/demo-cv.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
} finally {
  await browser.close();
}
