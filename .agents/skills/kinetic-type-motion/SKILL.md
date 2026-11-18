---
name: kinetic-type-motion
description: Design or review responsive kinetic-typography systems where stable glyph instances move between a loader, Hero wordmark, and scroll-driven monogram. Use for glyph continuity, FLIP-style measurement, GSAP ScrollTrigger choreography, velocity-responsive trails, and reduced-motion behavior; do not use for unrelated interface animation.
---

# Kinetic type motion

Preserve the identity and accessibility of the original glyph instances while moving them between compositions. Treat `DESIGN.md` and `AGENTS.md` as the authority for project-specific art direction and phase scope.

## Identity continuity

- Keep one stable DOM instance for every glyph in `ABDULSABOOR`; distinguish duplicates with durable IDs.
- The circular loader, settled Hero, and A/S monogram are layouts of the same instances, not replacement text layers or opacity swaps.
- Preserve character order and map every glyph to a deterministic source and destination.
- Use the original A1 and S1 as monogram sources. Do not reveal a separate logo.
- Keep the semantic full name independent from the fragmented visual layer so assistive technology announces it once.

## Measurement model

- Wait for the self-hosted display font before recording final glyph geometry.
- Measure layout destinations after CSS has composed the active responsive mode.
- Refresh measurements after viewport, orientation, or font-loading changes; avoid reading layout on every animation frame.
- Prefer GSAP transforms or FLIP-style deltas from measured rectangles. Do not distort glyph anatomy to force a destination.
- Give load assembly and scroll extraction separate state ownership even though they share glyph elements.

## Load-triggered assembly

- Arrange all eleven letters in a compact circular composition with readable spacing and controlled rotation.
- Release glyphs into their exact Hero destinations while carrying rotational momentum into outward travel.
- Avoid random scattering, chaotic crossings, bouncing, abrupt resets, and competing transforms.
- Complete or deliberately resolve the load sequence before the scroll-controlled system becomes authoritative.

## Scroll-driven extraction

- Preserve native scrolling and map ScrollTrigger progress to a scoped, freely reversible timeline.
- Coordinate the exit of non-monogram glyphs while A1 and S1 travel into the compact monogram destination.
- Establish deterministic before, intermediate, and after states so reverse scroll reconstructs the complete Hero.
- Do not add snapping, checkpoints, wheel interception, scroll locking, or forced completion.
- Prevent overlapping triggers from writing to the same glyph transform.

## Velocity-responsive trails

- Derive trail direction and restrained length from actual glyph displacement over time, not normalized timeline progress alone.
- Reverse the trail with movement direction.
- Freeze glyph position immediately when scrolling stops, then dissipate the trail independently at rest.
- Keep completed and idle states sharp. Do not leave permanent blur or heavy filters.
- Prefer a small bounded number of lightweight echoes and disable them for reduced motion.

## Performance and cleanup

- Keep animation updates outside React state.
- Batch geometry reads, cache destinations, and write transforms together.
- Scope GSAP contexts and clean up timelines, ScrollTriggers, observers, listeners, media-query branches, and animation frames.
- Use `will-change` only while motion is active and remove it afterward.
- Re-profile after later sections add DOM or font complexity.

## Accessibility and responsive behavior

- Make the completed static Hero the reduced-motion composition.
- Keep heading semantics, reading order, contrast, and keyboard behavior independent from animation internals.
- Compose desktop, tablet, portrait-mobile, and landscape-mobile destinations separately rather than uniformly scaling one layout.
- Ensure motion never leaves meaningful content inaccessible or duplicated to screen readers.

## Verification gate

Before declaring a kinetic-type phase complete:

- Inspect actual browser frames at the required responsive sizes.
- Test slow and fast forward/reverse scrolling, stopping mid-transition, resize, orientation change, and refresh at nonzero progress.
- Confirm every glyph ID remains unique and the DOM order remains `ABDULSABOOR`.
- Check font-loading stability, destination measurements, console errors, horizontal overflow, cleanup, and reduced motion.
- Report visible collisions, trail artifacts, performance compromises, or unverified conditions instead of masking them.
