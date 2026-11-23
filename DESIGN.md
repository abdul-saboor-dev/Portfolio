# Portfolio design specification

## Status

Kinetic Identity is the approved visual direction. The former spiral-led concept is permanently retired. Phase 04 extends the approved Hero, A₁/S₁ transformation, About reading experience, and Education carousel into a vertical Skills formation. Projects and later portfolio scenes remain out of scope.

## Core idea

The portfolio opens as a typographic identity system built from the eleven ordered letters in `ABDULSABOOR`. The static resting state is a monumental two-line **ABDUL / SABOOR** wordmark. Future phases may rearrange those exact glyph instances into a compact circular loader and later extract the original A and S into a monogram.

The design must remain strong with motion disabled. Typography—not decorative artwork—is the memorable visual element.

## Palette

| Role                 | Value     |
| -------------------- | --------- |
| Canvas               | `#F5F5F2` |
| Wordmark             | `#101010` |
| Primary typography   | `#151515` |
| Secondary typography | `#666666` |

Use a light theme only. Do not add a theme toggle. Additional colors require a concrete semantic need and approval.

## Typography

The kinetic wordmark uses **League Gothic Regular**, self-hosted from The League of Moveable Type under the SIL Open Font License 1.1. Supporting copy and interface text use the wider **Archivo** variable family, self-hosted under the SIL Open Font License 1.1. Its substantial text color balances League Gothic's extreme condensation without competing with the identity.

- Use League Gothic's native proportions for every loader and Hero glyph; do not stretch the DOM or replace the glyphs with a second vector layer.
- Preserve the ultra-condensed American Gothic construction, narrow counters, and strong A/S/R silhouettes.
- Use optical spacing rather than forcing both name lines to identical widths.
- Keep font loading stable with a local WOFF2 preload and a durable fallback.
- Do not use Arial, Space Grotesk, generic template typography, decorative cuts, bevels, or modified glyph anatomy.

## Static Hero composition

- Render **ABDUL** and **SABOOR** as one semantic level-one heading.
- Give each visible glyph a stable unique ID while keeping the fragmented visual layer hidden from assistive technology.
- On desktop, use an approximately 60/40 editorial relationship: the name anchors the left field while the three approved identity statements become a clear second focal point in the right field. The CMS introduction sits below them as quieter context.
- Indent ABDUL optically against the wider SABOOR line; this offset also prepares the future A/S convergence.
- On tablet and mobile, recompose the layout vertically rather than uniformly shrinking the desktop poster.
- At 320 px width, the full name must remain readable without horizontal overflow or accidental clipping.
- Do not add a portrait, year label, texture, card, or unapproved introduction. The AS identity is absent at Hero rest and exists only as the outcome of the scroll transformation.
- Present the six-section navigation model—Home, About, Education, Skills, Projects, Contact—but only make sections that exist in the DOM interactive. Never create broken anchors for future sections.
- Distinguish desktop navigation states through typography only: default number and label regular, hover/focus number bold with the label regular, and the active number and label both bold. Reserve bold text width so variable-weight interpolation never shifts neighboring items. Do not add backgrounds, underlines, rules, pills, or other hover ornaments.
- Keep two full-width action rows in the composition. `EXPLORE PROJECTS ↗` and `VIEW CV ↗` become interactive only when a real Projects section or published CV exists; otherwise they remain visibly unavailable rather than becoming fake links.
- On mobile, use the restrained `MENU` plus unequal-strokes trigger and a full-screen native dialog. The surface unfolds downward, the section items enter with a short vertical stagger, and the two strokes resolve into the close mark. Closing retracts the items and surface before returning focus. Preserve Escape handling, focus return, current-section registration, and background interaction prevention.
- Enable the in-portfolio CV viewer only when a published Sanity PDF is available.
- In the current Hero-only build, compact vertical spacing at reduced mobile heights so the complete composition remains inside one visible viewport without clipping. Future implemented sections add native document height rather than changing the Hero geometry.
- Render `SCROLL TO EXPLORE ↓` after the Hero settles because Phase 02A now provides a real scroll-controlled identity destination. It remains static at rest, links to the transition endpoint, and retreats progressively with scroll progress.

## AS monogram

- Use the original League Gothic A₁ and S₁ DOM glyphs for the scroll endpoint. Their anatomy never morphs, stretches, fades, or swaps to a second rendered logo.
- The compact mark is created only through uniform scale and relative placement: A sits slightly higher, while S overlaps its right side from a slightly lower position.
- A thin canvas-colored text stroke develops on S only as the letters overlap. It preserves legibility without changing either glyph's underlying shape.
- The measured runtime destination remains driven by `src/identity/asMonogram.js`. The browser favicon is the owner-supplied black-and-white AS artwork in `public/favicon.png`; it is intentionally independent from the animated DOM glyph geometry.
- Keep visible artwork near 36 px tall on desktop and 34 px on mobile, optically centered against the mobile MENU control.
- The final header mark is compact and never appears as a separate logo before the transformation.

## Fixed identity contract

The motion identity is immutable even if editable CMS profile content changes:

`A₁ B₁ D₁ U₁ L₁ S₁ A₂ B₂ O₁ O₂ R₁`

- Stable IDs distinguish duplicate A, B, and O instances.
- A₁ and S₁ are the future monogram source glyphs.
- The DOM order always matches `ABDULSABOOR`.
- Final glyph geometry is measured only after font loading and must be refreshed after viewport changes.
- CMS profile fields supply supporting content; they do not redefine the eleven-glyph animation identity.

## Motion sequence

The first two steps are implemented by the Phase 01B entrance system. The remaining steps are architecture guidance for later phases:

1. The initial HTML and render-blocking CSS place the eleven real Hero glyphs in a compact, tangentially oriented circle at the true viewport center before the React motion module executes. CSS begins rotating that composition immediately; GSAP inherits its live angle and continues at 85 degrees per second while the display font resolves.
2. A configurable 950-millisecond minimum presentation window keeps the object perceptible on cached loads without delaying a ready page for multiple seconds. Readiness remains authoritative when the display font or motion module takes longer, and the font wait has a bounded fallback.
3. Once the font and minimum presentation are ready, one GSAP entrance timeline preserves the ring's angular momentum, separates the two word lanes early, scales through the travel, and resolves into measured Hero destinations. Mobile adds a temporary ordered fan so narrow trajectories do not cause collisions. The same timeline reveals the statements, introduction, action rows, and navigation during the late settle; there is no unrelated interface timer.
4. Directional shadow echoes derive from measured glyph displacement and disappear when movement ends.
5. Native scroll detaches A₁ and S₁, coordinates the two word lanes and supporting content out of the composition, and uniformly scales and overlaps the unchanged source glyphs into the top-left AS monogram. The About composition is already fixed in its final geometry and uncovers during that same movement.
6. At the exact monogram handoff, the complete About narrative is visible in secondary gray and no reading progression has started. Further native scroll darkens words in document order without changing their position, weight, spacing, or wrapping. The last ten percent of the master range is a short completed-reading hold. Reverse scrolling restores the color sequence, About reveal, and Hero continuously.
7. Continued native scroll clears the completed About composition with a restrained horizontal mask while the first Education record emerges into the same fixed stage. Once the first record is legible, vertical progress translates one borderless Education surface horizontally. The final record holds before the scroll range ends, and reverse scrolling reconstructs the complete About composition.
8. After the final Education hold, its horizontal language contracts toward the center while Skills establishes a vertical direction. Ordered, supplied technology marks descend into calculated inverted-pyramid rows. The permanent code symbol rises from below last, then the completed composition holds. Reverse scrolling dismantles the formation and restores Education without a second ScrollTrigger.

The load-triggered assembly and scroll-triggered extraction are separate systems. Scroll motion remains freely reversible with no snapping, locking, checkpoints, or wheel interception.

## Responsive and accessible behavior

- Compose and verify desktop, laptop, tablet, 390 px, 375 px, 320 px, and landscape-mobile layouts independently.
- Preserve semantic order, heading accessibility, readable supporting text, keyboard access, and stable layout.
- The reduced-motion state presents the completed static Hero followed by normal-flow, fully readable About, Education, and Skills sections. It does not pin, translate records horizontally, or require motion for comprehension.
- Use transform-based future animation and avoid React state updates on animation frames.
- Do not duplicate accessible name content inside the motion layer.

## Content integrity

The name **ABDUL SABOOR**, approved Hero statements, introduction, About narrative, three supplied Education records, and owner-approved technology selection are the only approved personal content in this phase. Skills use supplied original-color assets and a sortable visible/hidden CMS library; source-library entries never imply proficiency until the owner enables them. Do not invent biography, projects, experience, awards, metrics, or additional claims.

## Prohibited direction

Do not restore decorative spirals, continuous threads, waves, path-based tagline animation, portrait imagery, pre-existing AS logos, gradients, grain overlays, glow, particles, glassmorphism, or generic card-based Hero layouts.
