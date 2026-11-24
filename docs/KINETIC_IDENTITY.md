# Kinetic identity architecture

Phase 04 preserves the production Hero and release choreography while extending the existing A/S extraction, About reading sequence, and Education carousel into a scroll-controlled Skills formation.

## Typeface

The loader and Hero wordmark use League Gothic Regular, self-hosted at `public/fonts/league-gothic-regular.woff2` and preloaded from `index.html`. The family is distributed under the SIL Open Font License 1.1; the bundled license is `public/fonts/OFL-League-Gothic.md`.

The Phase 01B.4 rendered comparison considered three implementation classes: a naturally ultra-condensed licensed face, mechanical modification of Big Shoulders Display, and custom vector lettering. League Gothic Regular was selected because its native tall proportions, narrow counters, readable small-size forms, and A/S silhouettes reach the requested architectural character without damaged anatomy or a duplicate SVG rendering layer. The narrower League Gothic Condensed build became too fragile at loader scale; mechanical compression harmed counters and stroke consistency; custom vectors added accessibility, maintenance, and continuity costs without a sufficient visual advantage.

Phase 01C replaces the condensed supporting face with Archivo variable 400–700, self-hosted at `public/fonts/archivo-latin-400-700.woff2` with its OFL text at `public/fonts/OFL-Archivo.txt`. Archivo was selected after evaluating the actual statements, introduction, navigation, and actions: its wider rhythm and open counters give supporting content enough presence to balance League Gothic while remaining neutral enough for editorial UI text.

## Identity contract

`src/identity/kineticIdentity.js` defines the fixed sequence independently from editable CMS profile content:

| Index | ID           | Character | Future role |
| ----: | ------------ | --------- | ----------- |
|     0 | `glyph-a-01` | A         | Monogram A  |
|     1 | `glyph-b-01` | B         | —           |
|     2 | `glyph-d-01` | D         | —           |
|     3 | `glyph-u-01` | U         | —           |
|     4 | `glyph-l-01` | L         | —           |
|     5 | `glyph-s-01` | S         | Monogram S  |
|     6 | `glyph-a-02` | A         | —           |
|     7 | `glyph-b-02` | B         | —           |
|     8 | `glyph-o-01` | O         | —           |
|     9 | `glyph-o-02` | O         | —           |
|    10 | `glyph-r-01` | R         | —           |

The visible glyph spans are `aria-hidden`. A single visually hidden `ABDUL SABOOR` string supplies the accessible level-one heading, preventing repeated character announcements.

## CMS boundary

Sanity exposes exactly three Hero statements (32 characters each), one Hero introduction (130 characters), a Projects action label and discriminated internal/external destination, a CV action label and PDF asset, one About narrative (650 characters), and a repeatable ordered Education collection. Education records use controlled status values, four-digit start/end years, and bounded institution, qualification, stage, academic-label, and description fields. Zod validates the same public content contract and rejects unsafe destination protocols. A published Sanity PDF activates the same-page CV viewer; without one, the reserved View CV row stays honestly unavailable. Internal action destinations activate only when the referenced section exists. Missing or invalid CMS data uses the approved text and action fallbacks.

## Completed Hero layout

- Desktop uses a 60/40 asymmetric composition with the wordmark as the primary anchor and the three large identity statements as the second focal point. The introduction, action rows, and top-right numbered navigation share one alignment system.
- Tablet reflows the identity and editorial content without reducing either to caption scale.
- Mobile uses its own vertical composition: top-right unequal-strokes menu trigger, large wordmark, prominent statements, readable introduction, and two full-width action rows. Short screens may flow naturally rather than clip content.
- Desktop navigation uses Archivo's variable 400–700 weight axis: hover/focus emphasizes only the number, while the current destination emphasizes both number and label. Invisible bold sizing layers reserve each item's maximum advance width, preventing layout movement without adding any decorative hover shape. The mobile menu remains a full-screen native dialog with Escape support and focus restoration.
- The master controller gives the Hero one scoped ScrollTrigger pin. Its measured native scroll range directly moves and uniformly scales the original `glyph-a-01` and `glyph-s-01` DOM elements into a compact overlap while the two remaining word lanes retreat. Their League Gothic anatomy, black fill, and full opacity remain unchanged. The scroll cue targets the real About handoff, and reverse scrolling restores the exact Hero state.
- `src/identity/asMonogram.js` stores the runtime overlap ratios for the original text glyphs. The active browser favicon uses the owner-supplied AS favicon pack, including `public/favicon.ico`, the 16px and 32px PNG exports, the Apple touch icon, and the Android manifest icons. These assets do not replace or alter the animated DOM glyphs. The semantic header destination remains visually empty.
- The mobile dialog uses interruptible GSAP open/close timelines while native `showModal()` retains focus containment and background interaction prevention.
- `HeroNavigation` discovers real section IDs so later phases can activate destinations without changing the navigation data model.
- The scroll cue is active because the identity transformation is a real destination. Its dedicated layout slot is reserved before the cue becomes visible, so the quiet entrance cannot redistribute any Hero content. It occupies the bottom-right editorial column on desktop and follows all Hero content on mobile, then retreats progressively with scroll.
- About occupies the existing pinned stage rather than entering as document flow. Its final geometry is stable before the reveal. A single clip uncovers the composition from master progress 0.12 to 0.42 while A/S is still traveling; the original glyphs remain above it.
- The A/S endpoint is master progress 0.42. At that exact point, the About clip is complete and every dynamically segmented word remains `#666666`. Word-color interpolation begins at 0.425—an imperceptible guard against integer-scroll rounding at the strict handoff—and ends at 0.90, then holds the fully dark state through 1.00. No separate About ScrollTrigger competes for ownership.
- `AboutSection` keeps one semantic paragraph. Inline word spans preserve source whitespace and punctuation, normal browser wrapping, selection, and reading order without duplicating spoken content. Content changes rebuild the word list and safely refresh the existing master timeline.

The editable `profile.fullName` does not redefine the kinetic identity. Supporting arbitrary replacement names would invalidate the fixed count, duplicate-letter IDs, circular layout, and A/S extraction mapping.

## Load assembly implementation

`src/animation/kineticEntrance.js`:

1. Hydrates eleven server-delivered glyph elements that are already positioned as a small centered circle by render-blocking CSS. The browser therefore has a valid loader composition before the React motion module executes.
2. Initializes the GSAP controller from a layout effect and keeps Strict Mode cleanup in the `preparing` state instead of exposing the completed Hero between development replays.
3. Starts a CSS-driven coherent orbit before the motion chunk arrives, then reads that computed angle so GSAP can continue without a rotation reset.
4. Rotates the tangentially oriented glyphs as one coherent object while League Gothic resolves. Cached loads use the configurable `KINETIC_TIMING.minimumLoaderPresentationMs` window of 950 milliseconds; slower critical resources extend the orbit naturally.
5. On font and minimum-presentation readiness, measures the settled Hero rectangles for all `[data-glyph-id]` elements and starts release immediately.
6. Releases the sequential ring through shallow deterministic curves, separate upper/lower word lanes, and slight clockwise timing offsets. On compact layouts an ordered temporary fan prevents letters from crossing while preserving their sequence.
7. Runs one GSAP release timeline in which destination separation leads scale just enough to keep every letter distinguishable; rotation settles progressively while scale and travel continue together. There is no miniature wordmark hold.
8. Preserves the ring's live rotational momentum at release and lands precisely in the native League Gothic wordmark.
9. Derives restrained text-shadow echoes from actual per-frame displacement and independently decays them to zero at rest.
10. During the late glyph settle, the same GSAP timeline reveals the three statements through clipped vertical masks, then resolves the introduction, actions, and navigation with quieter movement. Hidden controls are not focusable because the only initial actions are non-interactive until real content activates them.
11. Clears all transforms and exposes `data-motion-ready="true"` only after the static Hero has been restored exactly.

The font wait has a bounded fallback. If the display face fails or times out, the motion controller is removed and the complete static Hero is revealed with fallback typography instead of leaving a blank loading state.

`index.html` and `src/components/KineticHero.jsx` intentionally share the initial `preparing` state. React hydrates the initial shell rather than replacing it, so the preloader, release, and Hero use the same DOM glyph instances from the first browser paint onward.

`src/animation/kineticTiming.js` is the single runtime timing contract for the minimum loader window, orbit speed, release rotation, release duration, and release lead-in. Runtime data attributes expose measured loader visibility, orbit travel, release duration, and settle duration for browser verification without driving the motion itself.

Mid-animation resize preserves the last visual glyph centers against the new responsive layout, then completes through a short coordinated settle. Reduced motion bypasses the entrance and presents the finished Hero immediately.

No duplicate wordmark layer should replace the moving glyphs.

## Scroll identity, About, Education, and Skills controller

`src/animation/scrollIdentity.js` owns one scoped ScrollTrigger and remains the authority for the pinned visual stage. It moves `glyph-a-01` and `glyph-s-01` into responsive monogram destinations, coordinates the other nine glyphs and Hero support out, uncovers About in parallel, and then changes only word color in reading order. After the completed-reading hold, it delegates the added range to `src/animation/educationSequence.js`. That sequence clears About through a horizontal mask, establishes the first Education record, and translates the measured record track horizontally without changing the A/S glyph transforms.

Education distance derives from the current record count and visible viewport height. Track travel derives from the first and last rendered record offsets. Resize, CMS-driven child changes, and reorder operations rebuild those measurements while preserving the current identity and Education phase progress. One, two, three, and four-or-more record configurations therefore require no animation-code edits. A short final hold keeps the last record readable before the Skills handoff begins.

After that hold, `src/animation/skillsSequence.js` adds a third paused sub-sequence to the same master ScrollTrigger. Education contracts through one owned exit while Skills children remain hidden; the label and supporting copy then establish once, followed by the icon rows. Each row begins as an expanded fan: signed distance from the row center controls horizontal spread, curved lift, rotation, and scale. A single transform tween converges each mark into its CSS-defined irregular destination, so no second settling tween competes for transform ownership. Every mark is a normal CMS skill. The final formation holds before the future Projects boundary.

`src/skills/pyramidLayout.js` calculates narrowing rows from the current visible record count and assigns bounded, deterministic row offsets from a fixed art-direction pattern; it does not encode a 17-item special case or generate random positions. Stable Sanity order determines flat icon order, while CSS derives responsive icon size from the widest calculated row. Before any rebuild measures destinations, animation-owned transforms are cleared so refreshes never treat a mid-fan rectangle as final geometry. Mutation and viewport changes then restore the preserved identity, Education, and Skills progress. The supplied Skiper31 component informed signed center-distance, curved displacement, rotation, scale, and convergence principles only; its Framer Motion, Lenis, overlapping demo sections, and source layout are not included.

The controller takes ownership only after `data-motion-ready="true"`. Reduced motion creates no pin or animation range: the static Hero, fully dark About, every Education record, and the completed Skills formation remain directly readable in normal vertical document flow.

## Measurement and cleanup

- Orbit may begin before font readiness, but final destinations are always remeasured after the display font and responsive CSS settle.
- Refresh cached rectangles after resize and orientation changes, not on every animation frame.
- Batch layout reads before transform writes.
- Keep animation progress outside React state.
- Clean up GSAP contexts, ScrollTriggers, ResizeObservers, media-query listeners, and animation frames when ownership changes or components unmount.
