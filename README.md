# Portfolio

A React + Vite foundation for a premium, experimental developer portfolio.

The current implementation is a four-shot, scroll-scrubbed introduction sequence. It uses the supplied illustrated portrait assets, a deliberate editorial cut between portrait crops, and a single coordinated GSAP/ScrollTrigger timeline.

## Development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Project structure

```text
src/
├── animation/  # GSAP registration and reusable scroll-scene helpers
├── assets/     # Illustrated portrait and media assets when introduced
├── components/ # Shared structural and accessible UI pieces
├── config/     # Narrative acts and project-level configuration
├── scenes/     # One directory per cinematic narrative scene
└── styles/     # Global tokens, layout, and scene styling
```

The six-act narrative is represented in configuration, but only the introduction is rendered until the content and artwork for later acts are defined. Reduced-motion visitors receive the final identity composition without the long scroll sequence.
