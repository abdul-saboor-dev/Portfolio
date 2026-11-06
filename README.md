# Mouse Portrait Demo

Interactive mouse-controlled portrait application for **Abdul Saboor**, featuring a photographic subject whose gaze and head pose follow the user's cursor across the screen.

Built with React 19, Vite, and HTML5 Canvas.

## Architecture

```
interactive-portrait-showcase/
├── public/
│   ├── frames/                      # 340 transparent portrait frames (PNG sources, WebP runtime)
│   └── favicon.svg
├── scripts/
│   ├── convert-webp.mjs             # PNG → WebP frame conversion
│   └── generate-frame-list.mjs      # regenerates frameList.generated.js
├── src/
│   ├── app/
│   │   └── App.jsx                  # Root component
│   ├── features/portrait/
│   │   ├── frameData.js             # 20×17 pose grid math & BFS traversal
│   │   ├── frameList.generated.js   # 340-frame filename dictionary
│   │   ├── PortraitCanvas.jsx       # 60fps canvas renderer & state machine
│   │   └── useFramePreloader.js     # Progressive radial preloader
│   ├── styles/
│   │   ├── App.css                  # Portrait stage & loading overlay
│   │   └── index.css                # Global reset
│   └── main.jsx                     # Application entry point
├── package.json
└── vite.config.js
```

## Features

- **Continuous Smoothing & Physics**: Exponential smoothing ($\tau = 35\text{ms}$) with a $2.5\text{px}$ deadzone for intentional pointer movement.
- **Three-Mode State Machine**: `TRACKING` (cursor following), `RETURNING` (smooth $500\text{ms}$ return to neutral upon inactivity) and `HANDOFF` (smooth $120\text{ms}$ cursor pickup).
- **Progressive Radial Preloader**: Tier-1 instant mount on neutral frame (idx 189), followed by BFS radial preloading limited to 6 concurrent requests.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run Oxlint
npm run lint

# Build for production
npm run build
```
