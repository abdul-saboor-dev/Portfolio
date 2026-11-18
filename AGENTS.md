# Portfolio project instructions

## Scope and authority

- Read `DESIGN.md` before any visual, typography, or motion work.
- Preserve user-provided content and references as the source of truth.
- Do not invent biography, skills, achievements, metrics, clients, projects, or supporting copy.
- Keep setup, design, implementation, motion, and deployment phases distinct. Do not advance to a later phase without an explicit request.
- The abandoned spiral concept must not be restored or used as a fallback direction.

## Project skills

Use the smallest relevant set and apply them in this order:

1. For new interface design or a substantial redesign, read `.agents/skills/frontend-design/SKILL.md`.
2. For kinetic typography, glyph transitions, monogram extraction, or scroll-motion review, read `.agents/skills/kinetic-type-motion/SKILL.md`.
3. Before shipping visual work, use `.agents/skills/anti-slop-design/SKILL.md` as a critique pass. Project direction in `DESIGN.md` overrides generic archetypes or fixed stylistic prescriptions in that skill.
4. For an accessibility and interface-quality audit, read `.agents/skills/web-design-guidelines/SKILL.md`. If its live rule source cannot be fetched, report that limitation rather than claiming a complete audit.

## Creative direction

- Build a premium cinematic portfolio around kinetic identity typography.
- The fixed motion identity is the eleven ordered glyphs in `ABDULSABOOR`.
- Use warm off-white `#F5F5F2` for the canvas, `#101010` for the wordmark, `#151515` for primary typography, and `#666666` for secondary typography.
- The site is light theme only. Do not add a theme toggle.
- Do not add portraits, decorative geometry, gradients, grain, glow, particles, glass panels, or a pre-existing AS logo.

## Interaction

- Preserve native free scrolling.
- Future scroll motion must use scoped GSAP ScrollTrigger timelines with reversible scrubbing.
- Do not add checkpoints, snapping, forced animation completion, scroll locking, or wheel interception.
- Keep the load-triggered circular glyph release separate from the later scroll-driven A/S extraction.
- The A and S monogram must be formed from the original Hero glyph instances, not a replacement mark.
- Provide a meaningful reduced-motion composition.

## Visual quality

- Treat typography as the primary design element and keep the static composition visually complete.
- Avoid generic developer-portfolio layouts, card grids, arbitrary labels, and placeholder marketing copy.
- Prefer optical spacing, asymmetry, strong scale, and controlled negative space.
- Do not distort glyph anatomy with artificial CSS stretching.
- Treat creative references as inspiration, never as layouts or copy to reproduce.

## Engineering

- Maintain modular React components and stable glyph identifiers.
- Keep semantic heading content separate from decorative motion internals so assistive technology does not hear duplicated letters.
- Measure final glyph geometry only after the self-hosted display font loads, and remeasure after responsive layout changes.
- Keep GSAP timelines organized, scoped, and properly cleaned up.
- Avoid React state updates during animation unless application state genuinely changes.
- Prioritize scroll performance, responsive behavior, accessibility, and stable layout.
- Do not add a major dependency without justification and explicit scope.
- Verify builds and actual browser behavior before reporting completion.
- Report technical limitations and incomplete verification honestly.
- Keep Sanity Studio isolated in `studio/`; do not move the public Vite frontend into the Studio or into Next.js.
- Public frontend code may use only the Sanity project ID, dataset, and pinned API version. Never expose read, write, deploy, or preview tokens through `VITE_*` variables.
- Fetch portfolio content outside animation timelines. GSAP must animate already-rendered content rather than trigger CMS requests.
- Preserve existing CMS validation contracts. The fixed eleven-glyph motion identity is independent from the editable CMS profile name and supporting content.

## Required checks

Run the relevant subset during development and `npm run verify` before a phase is declared complete. Visual phases also require browser inspection at the required desktop, tablet, mobile, landscape-mobile, and reduced-motion sizes.
