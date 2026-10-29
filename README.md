# Mouse Portrait Demo

Interactive mouse-controlled portrait application for **Abdul Saboor**, featuring a photographic subject whose gaze and head pose follow the user's cursor across the screen.

Built with React 19, Vite, and HTML5 Canvas.

## Architecture

```
mouse-portrait-demo/
├── public/
│   └── frames/                  # 340 pre-rendered transparent PNG portrait frames
├── src/
│   ├── app/
│   │   └── App.jsx              # Root component & state orchestration
│   ├── features/
│   │   ├── background/
│   │   │   └── GridCanvas.jsx   # Deformable warped background grid
│   │   └── portrait/
│   │       ├── frameData.js     # 20×17 pose grid math & BFS traversal
│   │       ├── frameList.generated.js # 340-frame filename dictionary
│   │       ├── PortraitCanvas.jsx     # 60fps canvas renderer & state machine
│   │       └── useFramePreloader.js   # Progressive radial preloader
│   ├── styles/
│   │   ├── App.css              # App layout, controls, debug HUD & vignette
│   │   └── index.css            # Global typography and reset
│   └── main.jsx                 # Application entry point
├── package.json
└── vite.config.js
```

## Features

- **Continuous Smoothing & Physics**: Exponential smoothing ($\tau = 35\text{ms}$) with a $2.5\text{px}$ deadzone for intentional pointer movement.
- **Three-Mode State Machine**: `TRACKING` (mouse following), `RETURNING` (smooth $500\text{ms}$ return to neutral upon inactivity or manual recenter), and `HANDOFF` (smooth $120\text{ms}$ cursor pickup).
- **Progressive Radial Preloader**: Tier-1 instant mount on neutral frame (idx 189), followed by BFS radial preloading limited to 6 concurrent requests.
- **Organic Deformable Grid**: Background grid drifts smoothly and deforms organically around the subject's head tilt and shoulder silhouette.

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
