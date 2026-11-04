# Technical Handover Document: Interactive Portfolio Project

> **Target Audience:** ChatGPT / AI Assistant & Successor Engineers  
> **Repository:** `d:\AI\Portfolio`  
> **Subject / Owner:** Abdul Saboor  
> **Date of Documentation:** November 2026  
> **Active Branch:** `feature/halftone-reveal`  
> **Primary Technology:** React 19, Vite 8, WebGL2 GLSL Shaders, HTML5 Canvas

---

## Quick Context for ChatGPT

If you are an incoming AI assistant or developer reading this to quickly get up to speed:

1. **What is this project?**  
   An ultra-modern, high-performance interactive hero/portrait experience for Abdul Saboor's personal developer portfolio. The photographic subject's head pose, yaw, and pitch smoothly track user pointer (mouse, touch, pen) movements in real time across the entire viewport.
2. **Current Visual Identity & Novel Shader:**  
   The portrait is rendered using custom **WebGL2 GLSL Shaders** (`halftonePipeline.js`) adapted from React Bits *HalftoneReveal*. By default, the portrait displays as a crisp, digital-print **halftone matrix composed of square pixel cells** (cellSize: 7.0px, angle: 0°) on a solid dark background (`#050505`). Gaps between square cells are transparent. When the user hovers over the portrait canvas, a dynamic cursor trail **reveals the sharp, full-colour underlying photograph** beneath the halftone mask. Upon cursor exit, the trail gracefully decays over ~1.15s back to the halftone aesthetic.
3. **Core Assets & Scale:**  
   The motion engine uses **340 pre-rendered transparent PNG frames** (`public/frames/`) mapped to a discrete **20 column (yaw: -20° to +20°) × 17 row (pitch: -20° to +13.7°)** grid.
4. **State Machine & Physics:**  
   A 60fps `requestAnimationFrame` loop in `PortraitCanvas.jsx` powers a 3-mode physics state machine:
   - `TRACKING`: Continuous exponential smoothing ($\tau = 35\text{ms}$) with a $2.5\text{px}$ intentional displacement deadzone.
   - `RETURNING`: After 2000ms of pointer inactivity, smoothly animates the head back to neutral pose `(col 9, row 9; yaw -1.1°, pitch -1.1°)` over 500ms using cubic ease-in-out.
   - `HANDOFF`: If the user moves the pointer while returning, seamlessly transitions the trajectory over 120ms without jarring snaps.
5. **Preloading Strategy:**  
   `useFramePreloader.js` guarantees instant Tier-1 load of the center frame (`idx 189`), followed by a radial breadth-first search (BFS) queue of remaining frames capped at 6 concurrent network requests.
6. **Current Stage:**  
   The hero interactive portrait engine is rock-solid and production-ready (clean build with Vite and Oxlint). The project currently functions as a single-screen portrait demo stage. Standard portfolio content (navigation, about, skills, project showcase, contact forms) is not yet built.

---

## 1. Project Overview

### 1.1 Purpose and Vision
The project serves as the flagship digital portfolio for **Abdul Saboor**. Its purpose is to deliver an unforgettable first impression by blending cutting-edge graphics programming (custom WebGL2 halftone shaders, frame interpolation mathematics, smooth physics simulation) with responsive web design.

### 1.2 Design Philosophy & Visual Identity
- **Minimalist & Cinematic:** Deep void `#050505` background allows the subject to command focus.
- **Digital-Print Halftone Aesthetic:** Rather than ordinary raster imagery, the subject is rendered as an array of mathematically calculated square pixel cells that respond dynamically to image luminance and tonal curves.
- **Tactile Discovery:** Hovering reveals the sharp, authentic full-colour photograph beneath the digital halftone screen, creating an engaging "inspect/reveal" interaction loop.
- **Silent Reliability:** Fallback to standard 2D HTML5 Canvas rendering if WebGL2 is disabled or unsupported.

### 1.3 Intended User Experience
- **Immediate Interactivity:** The user sees a neutral portrait loading immediately via instant Tier-1 frame fetching.
- **Omnipresent Gaze:** Moving the mouse anywhere across the browser causes the portrait's eyes and head to follow naturally.
- **Fluid Halftone Decay:** Moving inside the portrait stage reveals full colour; leaving allows the trail to dissipate cleanly.
- **Mobile First Touch:** Touch dragging on smartphones mirrors the mouse reveal; releasing allows the trail to decay while head tracking matches touch position.

### 1.4 Current Development Stage
- **Hero Portrait Engine:** Completed and thoroughly refined.
- **Halftone WebGL2 Integration:** Completed (recently transitioned from circular dots to square digital cells for an authentic print aesthetic).
- **Portfolio Content Layers:** Planned / Yet to be constructed (e.g. hero typography, about me, work history, project showcase cards, contact links).

---

## 2. Technology Stack

### 2.1 Core Frameworks & Libraries
| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime / Library** | React | `^19.3.1` | UI declarative composition and state hooks |
| **DOM Renderer** | React DOM | `^19.3.1` | React DOM binding |
| **Build Tool / Dev Server** | Vite | `^8.3.5` | Next-generation ESM bundler and HMR server |
| **Vite React Plugin** | `@vitejs/plugin-react` | `^6.1.2` | Fast Refresh and JSX transformation |
| **Linter** | Oxlint | `^1.89.0` | High-performance Rust-based JavaScript/React linter |
| **Rendering API** | WebGL 2.0 (GLSL ES 3.00) | Native | Off-screen FBO mask ping-pong & halftone shader pipeline |
| **Fallback API** | HTML5 2D Canvas | Native | Graceful fallback when WebGL2 context creation fails |

### 2.2 Development Environment & Build Scripts
From `package.json`:
- `npm run dev`: Starts Vite local development server (`http://localhost:5173`).
- `npm run build`: Bundles production assets into `dist/` directory via Rollup/Vite.
- `npm run lint`: Runs `oxlint` static code analysis.
- `npm run preview`: Previews the production bundle locally.

---

## 3. Project Structure

### 3.1 Complete Directory Tree
```
Portfolio/
├── .git/                               # Git version control
├── dist/                               # Production build output
├── node_modules/                       # NPM dependencies
├── public/
│   ├── favicon.svg                     # Custom SVG portfolio favicon
│   ├── icons.svg                       # SVG sprite/icons reference
│   └── frames/                         # 340 pre-rendered transparent PNG portrait frames
│       ├── Abdul-Saboor_000_0_0_yaw-20_pitch-20_px-15_py15.png
│       ├── ...
│       └── Abdul-Saboor_339_19_16_yaw20_pitch13.7_px15_py-10.3.png
├── src/
│   ├── app/
│   │   └── App.jsx                     # Root application container & preloader coordination
│   ├── assets/
│   │   ├── hero.png                    # Static reference asset
│   │   ├── react.svg                   # Default Vite asset
│   │   └── vite.svg                    # Default Vite asset
│   ├── features/
│   │   └── portrait/
│   │       ├── frameData.js            # 20×17 pose grid geometry, coordinate math, BFS order
│   │       ├── frameList.generated.js  # Generated array mapping flat index (0-339) to filename
│   │       ├── halftonePipeline.js     # WebGL2 engine: shaders, FBO ping-pong, uniforms, render passes
│   │       ├── PortraitCanvas.jsx      # Canvas lifecycle, 60fps RAF loop, state machine, event listeners
│   │       └── useFramePreloader.js    # Progressive image loading hook with concurrency control (max 6)
│   ├── styles/
│   │   ├── App.css                     # Layout, loading overlay, portrait sizing, theme variables
│   │   └── index.css                   # Global CSS reset and Inter font setup
│   └── main.jsx                        # React root entry point (`createRoot`)
├── .gitignore
├── .oxlintrc.json                      # Oxlint linter configuration
├── halftone_reveal_supplied_1.txt      # Source reference doc for React Bits HalftoneReveal
├── halftone_reveal_supplied_2.txt      # Source reference doc for WebGL HalftoneReveal
├── index.html                          # Single page HTML entry
├── package.json                        # Project metadata, dependencies, and npm scripts
├── package-lock.json                   # Deterministic dependency lockfile
├── README.md                           # Original project documentation
└── vite.config.js                      # Vite plugin configuration
```

### 3.2 Role of Core Files
- `src/main.jsx`: Bootstraps React 19 into `#root`.
- `src/app/App.jsx`: Hosts the `PortraitCanvas`, handles the center-frame loading spinner overlay, and manages shared mutable pose references.
- `src/features/portrait/PortraitCanvas.jsx`: Manages the pointer/touch events, viewport coordinate normalisation, 3-mode state machine, WebGL2 context loss/restoration, and delegates drawing.
- `src/features/portrait/halftonePipeline.js`: Implements the dual-pass WebGL2 pipeline. Pass 1 renders the pointer brush trail into a ping-pong FBO texture. Pass 2 computes square halftone cells from frame luminance and blends with full-colour photo inside reveal mask.
- `src/features/portrait/frameData.js`: Mathematical definitions for yaw/pitch bounds, coordinate translation, nearest loaded index search, and radial BFS generation.
- `src/features/portrait/frameList.generated.js`: Read-only registry containing all 340 filename strings indexed `0` to `339`.
- `src/features/portrait/useFramePreloader.js`: Custom hook orchestrating Tier 1 (center frame) priority load and Tier 2 radial queue.

---

## 4. Architecture and Implementation

### 4.1 System Architecture Diagram
```
[User Input: pointermove / touchmove]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ PortraitCanvas.jsx                                     │
│  - Normalizes (x, y) to viewport [-1, 1]              │
│  - Maps to target (yaw, pitch)                         │
│  - Updates 3-Mode State Machine:                       │
│    • TRACKING (tau=35ms smoothing)                     │
│    • RETURNING (500ms easeInOut to neutral)            │
│    • HANDOFF (120ms easeInOut transition)              │
│  - Tracks pointer reveal position & inside/outside flag │
└──────────────────────────┬─────────────────────────────┘
                           │
                 Every RequestAnimationFrame
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ frameData.js             │  │ halftonePipeline.js      │
│ - yawPitchToFractional   │  │ (WebGL2 Engine)          │
│ - nearestLoadedIndex     │  │  1. Upload 512×512 image │
│ - selects active frame   │  │  2. Mask FBO pass (trail)│
└───────────┬──────────────┘  │  3. View Pass (halftone + │
            │                 │     reveal composite)    │
            ▼                 └──────────────────────────┘
┌──────────────────────────┐
│ useFramePreloader.js     │
│ - HTMLImageElement cache │
└──────────────────────────┘
```

### 4.2 3-Mode Animation State Machine
Located inside `PortraitCanvas.jsx`:
1. **`MODE_TRACKING`**:
   - Follows pointer target yaw and pitch.
   - Smooths values using continuous exponential decay:
     $$\alpha = 1 - e^{-\Delta t / \tau},\quad \tau = 35\text{ms}$$
   - A deadzone of $2.5\text{px}$ (`JITTER_PX`) prevents micro-twitches or false wakeups from noisy mice.
   - Resets an idle timer (`IDLE_MS = 2000ms`) on intentional pointer motion.
2. **`MODE_RETURNING`**:
   - Triggered when the idle timer expires (no pointer movement for 2s) or via `recenter()` handle.
   - Interpolates from current yaw/pitch back to `NEUTRAL_YAW` (-1.1°) and `NEUTRAL_PITCH` (-1.1°) over $500\text{ms}$ (`RETURN_DURATION_MS`) using cubic ease-in-out:
     $$E(t) = \begin{cases} 4t^3 & \text{if } t < 0.5 \\ 1 - \frac{(-2t + 2)^3}{2} & \text{otherwise} \end{cases}$$
3. **`MODE_HANDOFF`**:
   - If the user moves the pointer while the head is in `RETURNING` mode, it transitions to `MODE_HANDOFF`.
   - Smoothly glides from the returning position to the new cursor target over $120\text{ms}$ (`HANDOFF_DURATION_MS`), preventing visual snapping. Once $t \ge 1$, returns to `MODE_TRACKING`.

### 4.3 WebGL2 Dual-Pass Halftone & Reveal Engine
Located inside `src/features/portrait/halftonePipeline.js`:

#### Pass 1: Ping-Pong Mask Shader (`MASK_SHADER`)
- Maintains two off-screen Framebuffer Objects (`this.masks[0]` and `this.masks[1]`) scaled at `MASK_SCALE = 0.5` of viewport resolution.
- Reads previous frame mask from `uPrevious`, subtracts temporal decay `uFade` ($dt / \text{linger}$), and blends a capsule/line segment between previous pointer position `uFrom` and current pointer position `uTo`.
- Uniform `uSoftness = 0.65` produces smooth feathered edges around the cursor trail.

#### Pass 2: View Screen Shader (`VIEW_SHADER`)
- **Silhouette Transparency**: Evaluates `photo(p, 0.0, 0.0).a`. If $\le 0.001$, fragments are discarded (`vec4(0.0)`), guaranteeing that the canvas background remains completely transparent and never forms an ugly black bounding box.
- **Coverage & Cell Sizing**:
  Samples luminance at cell centers using ITU-R BT.709 weights (`LUMA = vec3(0.2126, 0.7152, 0.0722)`). Deep shadows ($\le 0.02$) drop to 0 coverage.
- **Reach Calculation (Shape 2: Square Pixel Cells)**:
  `reach(t)` computes cell half-width:
  $$\text{reach}(t) = \text{mix}(0.065, 0.44, t^{0.82})$$
  - Deep shadows/contours: fine micro-squares (`0.065..0.10`) preserving hair outlines and garment contours.
  - Midtones: clean square matrix with open negative space.
  - Highlights: capped at `0.44` so square cells never bridge or bleed across neighboring grid lines (preserving at least a 12% border gap).
- **Composite Equation**:
  ```glsl
  vec3 rgbPremul = uInk * (kDot * sharp.a * (1.0 - revealFactor)) + photoColor * (sharp.a * revealFactor);
  float totalAlpha = mix(kDot * sharp.a, sharp.a, revealFactor);
  outColor = vec4(rgbPremul, totalAlpha);
  ```
  Blended onto the canvas using premultiplied alpha: `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`.

### 4.4 Pose Coordinates & Grid Mathematics
From `frameData.js`:
- Total Frames: $20 \times 17 = 340$.
- Columns: 20 discrete yaw angles from $-20.0^\circ$ to $+20.0^\circ$ in steps of $\approx 2.1^\circ$.
- Rows: 17 discrete pitch angles from $-20.0^\circ$ to $+13.7^\circ$ in steps of $\approx 2.1^\circ$.
- Flat index formula: $\text{idx} = \text{row} \times 20 + \text{col}$.
- Neutral pose: `col = 9, row = 9` (Index: $9 \times 20 + 9 = 189$; yaw $-1.1^\circ$, pitch $-1.1^\circ$).
- Normalized mouse mapping: $nx, ny \in [-1, 1] \implies \text{yaw}, \text{pitch}$ interpolated between extent bounds.

---

## 5. Design System

### 5.1 Exact Color Codes
Defined in `src/styles/App.css`:
- `--bg-base`: `#050505` (Deep void black; main background)
- `--grid-line`: `#252525` (Subtle grid borders/lines)
- `--accent`: `rgba(120, 120, 180, 0.08)`
- `--accent-border`: `rgba(140, 140, 200, 0.15)`
- `--text-primary`: `rgba(255, 255, 255, 0.9)` (Off-white heading/body text)
- `--text-muted`: `rgba(255, 255, 255, 0.45)` (Subtle labels and captions)
- `--progress-fill`: `rgba(130, 110, 255, 0.8)` (Violet loading spinner accent)
- Halftone Ink (`uInk`): `[1.0, 1.0, 1.0]` (Pure white cells)
- Halftone Paper (`uPaper`): `[0.0, 0.0, 0.0]` (Transparent substrate)

### 5.2 Typography
- Imported via Google Fonts in `src/styles/index.css`: `'Inter', system-ui, -apple-system, sans-serif`
- Weights loaded: `300`, `400`, `500`, `600`.
- Text rendering: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`

### 5.3 Layout Rules & Breakpoints
- **Desktop Stage (`.portrait-stage`)**:
  - `height: clamp(0px, 82vh, 720px);`
  - Positioned at `bottom: 0; left: 50%; transform: translateX(-50%);`
  - Prevents the portrait from overflowing or dominating ultra-wide displays.
- **Mobile Breakpoint (`max-width: 600px`)**:
  - `height: 100vh; height: 100dvh; width: 100vw;`
  - Portrait canvas scales to `width: 100%; height: auto; max-width: 100vw;` for an immersive full-screen experience.
- **Viewport Constraints**: `overflow: hidden` on both `body` and `.app`. No browser scrollbars exist in the current layout.

### 5.4 Active Halftone Configuration Settings
Inside `halftonePipeline.js`:
```javascript
export const HALFTONE_CONFIG = {
  mode: 0,                 // 0: mono
  shape: 2,                // 2: square pixel cell
  cellSize: 7.0,           // Square grid pitch (CSS px)
  angle: 0,                // 0° for axis-aligned square pixels
  dotScale: 1.0,           // Scaling factor for cells
  inkColor: [1.0, 1.0, 1.0],
  paperColor: [0.0, 0.0, 0.0],
  contrast: 1.15,
  brightness: 0.02,
  invert: false,
  roughness: 0.0,          // Crisp, mathematically pure cell edges
  revealRadius: 140,       // Reveal radius (CSS px) around cursor
  softness: 0.65,          // Feathered blend on reveal boundary
  linger: 1.15,            // Seconds reveal trail lingers before decaying
};
```

---

## 6. Features and Pages

| Feature | Purpose | Implementation File | Status | Notes |
|---|---|---|---|---|
| **Head Tracking Engine** | Rotates head pose to track cursor across screen | `PortraitCanvas.jsx`, `frameData.js` | **Completed** | Full viewport tracking, 60fps RAF, 35ms exponential smoothing. |
| **WebGL2 Halftone Shader** | Stylizes portrait as square pixel halftone matrix | `halftonePipeline.js` | **Completed** | Square cells (shape 2) with adaptive reach based on luminance. |
| **Cursor Photograph Reveal** | Disolves halftone to reveal full-colour photo under cursor | `halftonePipeline.js` | **Completed** | Ping-pong FBO trail persistence with 1.15s linger decay. |
| **Progressive Frame Loader** | Loads center frame immediately, queues remaining 339 | `useFramePreloader.js` | **Completed** | Concurrency throttled to 6 parallel requests; radial BFS order. |
| **Loading Spinner Overlay** | Prevents layout pop before initial center frame arrives | `App.jsx`, `App.css` | **Completed** | Displays only until `isCenterLoaded` is true. |
| **2D Canvas Fallback** | Fallback for devices without WebGL2 support | `PortraitCanvas.jsx` | **Completed** | Grayscale 2D draw with circular clipped photo reveal. |
| **Hero Portfolio Content** | Name typography, titles, intro copy, CTA buttons | *Not yet created* | **Planned** | Stage is clean and ready for content overlay. |
| **Projects Showcase** | Display previous development work, case studies, links | *Not yet created* | **Planned** | Could be cards, side panels, or overlay modals. |
| **Skills & About Section** | Developer biography, tech stack badges | *Not yet created* | **Planned** | Needs integration with layout. |
| **Contact Form / Socials** | GitHub, LinkedIn, email form | *Not yet created* | **Planned** | Icons ready in `public/icons.svg`. |

---

## 7. Current Development Status

### 7.1 Completed Features
- Full 340-frame 20×17 pose lookup with sub-degree interpolation.
- Responsive WebGL2 canvas with Device Pixel Ratio (DPR) backing store scaling (clamped to max DPR 2 for performance).
- WebGL context loss and context restoration event handling.
- Square digital-print halftone shader pipeline with alpha transparency preservation.
- Preloader state machine with instant mount on center frame `Abdul-Saboor_189_9_9_yaw-1.1_pitch-1.1_px-0.8_py-0.8.png`.
- Touch and pointer event parity for mobile and desktop devices.

### 7.2 Recent Architectural Changes (from Git History)
1. **Removed Debug HUD & Controls (`commit b9cc426`):** The top-right debug toggle button and recenter button were cleaned up from `App.jsx` and `App.css` to present a clean, distraction-free stage.
2. **Switched Halftone to Square Pixel Cells (`commit 14834ac`):** Halftone `shape` transitioned from `0` (circular dots) to `2` (square pixel cells) with `angle: 0` for an authentic digital-print aesthetic.
3. **Solid Background with Full-Colour Reveal (`commit c82ac35`):** Background effects (earlier experimental light rays / grid canvas) were removed in favour of a clean solid `#050505` backdrop, while hover reveal was made full-colour.

---

## 8. Important Development Context & Constraints

### 8.1 Critical Conventions That Must Not Be Broken
- **Alpha Silhouette Preservation:**
  The 340 source frames have transparent backgrounds. The fragment shader in `halftonePipeline.js` strictly discards fragments where `sharp.a <= 0.001`. Do **not** remove this check or clear with an opaque background in the view pass; doing so will cause the portrait bounding box to occlude background elements.
- **In-Place Sub-Image Uploads:**
  `halftonePipeline.js` allocates a single 512×512 texture (`imageTexture`) during construction and uses `gl.texSubImage2D` when the active frame index changes. Do **not** recreate textures inside the RAF loop or memory will leak rapidly.
- **DPR Clamping:**
  `PortraitCanvas.jsx` clamps DPR to 2.0 (`Math.min(window.devicePixelRatio || 1, 2)`). Higher DPR on 4K screens will cause excessive fill-rate bottlenecks in the WebGL fragment shader without perceptible visual gain.
- **Do Not Modify `frameList.generated.js` Manually:**
  This file matches the exact file names in `public/frames/`. Modifying it manually could break the index-to-filename hash mapping.

### 8.2 Environment & Deployment Configuration
- **Vite Base Path:** Default `./` or `/` in `vite.config.js`.
- **Static Assets:** `public/frames/` holds ~50MB of images (340 PNGs at ~150-180KB each). When deploying to services like Vercel, Netlify, or Cloudflare Pages, ensure CDN caching headers (e.g., `Cache-Control: public, max-age=31536000, immutable`) are configured for `/frames/*`.
- **No Secrets or Backend Dependencies:** The project is 100% client-side static React/WebGL. There are no environment variables or backend endpoints currently required.

---

## 9. Future Development Guidance for ChatGPT

When continuing development on this project, prioritize the following sequential steps:

### Step 1: Design and Overlay the Portfolio Hero UI
The portrait canvas is currently rendered alone in `App.jsx`. Add the content layer over or beside the portrait:
- Add a semantic header with Abdul Saboor's logo/branding and navigation links (e.g. *Work*, *About*, *Contact*).
- Introduce a typography layer (e.g. "Abdul Saboor — Full-Stack Engineer / Creative Technologist") with subtle blend mode (`mix-blend-mode: difference` or elevated z-index) or a clean 2-column hero split on desktop (`left: text/intro, right: interactive portrait`).
- Ensure all interactive buttons, links, or text cards have `pointer-events: auto` and a higher `z-index` so head tracking continues smoothly in the background without pointer event blockage.

### Step 2: Implement Page Sections or Modal Drawer Navigation
Depending on the desired UX (single-page vertical scroll vs. fullscreen slide/modal system):
- **Option A (Vertical Scroll):** Pin the portrait stage as a `position: sticky` or `position: fixed` background hero that scales down or cross-fades into content sections (Projects, Experience, Skills, Contact) as the user scrolls.
- **Option B (Slide/Overlay Drawers):** Keep the portrait as the persistent immersive desktop background and trigger floating glassmorphism panels or fullscreen overlays when navigation links are clicked.

### Step 3: Performance & Mobile Optimisation
- The 340 PNG frames total around 50MB. While `useFramePreloader.js` successfully delays loading the outer frames until the center frame is ready, consider converting the PNG frames to WebP or AVIF in future optimization passes to reduce network payloads by up to 60-70%.

---

## 10. Summary Verification Checklist for Incoming AI

Before making changes in any new session, run:
```bash
# 1. Verify dependencies are intact
npm install

# 2. Verify code passes Oxlint without warnings
npm run lint

# 3. Test production build
npm run build
```

*This handover document was prepared automatically from the inspected source files and Git history. All details reflect the exact state of the repository as of November 2026.*
