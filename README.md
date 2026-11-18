# Abdul Saboor portfolio

Production development environment for a cinematic React portfolio built around a kinetic typographic identity.

Phase 00.5 provides a separate Sanity Studio workspace and validated published-content access layer. Phase 03 preserves the responsive ABDUL / SABOOR Hero, approved circular entrance, original-glyph A/S extraction, and pinned About reading sequence, then extends the same native-scroll controller into a borderless horizontal Education experience. Hero content, CV PDF, About narrative, and repeatable ordered Education records are bounded Sanity fields. Skills and later sections are not implemented yet.

No live Sanity project is connected by default.

## Requirements

- Node.js 24 or a current Node.js release supported by the installed Vite version
- npm

## Commands

```bash
npm install
npm run dev
npm run lint
npm run format:check
npm run build
npm run browser:install
npm run test:content
npm run test:identity
npm run test:e2e
npm run visual:hero
npm run visual:kinetic
npm run visual:type
npm run verify
```

`npm run browser:install` installs Playwright's managed Chromium build inside the project dependency tree. `npm run test:e2e` starts Vite automatically and runs desktop and mobile Chromium checks. While a local preview is running, `npm run visual:hero` captures the settled responsive and reduced-motion Hero frames under `test-results/hero-visuals`; `npm run visual:kinetic` records normal and slow-resource desktop/mobile WebM videos plus seven timestamped stages under `test-results/kinetic-preview-01c`; `npm run visual:type` captures the native typeface comparison used for the Phase 01B.4 decision.

Sanity Studio commands:

```bash
npm run studio:dev
npm run studio:build
npm run studio:schema
```

Copy `.env.example` to `.env.local` and `studio/.env.example` to `studio/.env.local` after creating a Sanity project. See [CMS setup and deployment](docs/CMS.md) for the security boundary, roles, preview limitations, and production checklist.

## Project guidance

- `AGENTS.md` contains durable engineering and design rules.
- `DESIGN.md` is the approved visual and interaction specification.
- `.agents/skills/kinetic-type-motion/SKILL.md` contains the repository-specific typography and motion workflow.
- `docs/KINETIC_IDENTITY.md` documents glyph IDs, font loading, the entrance lifecycle, and future motion ownership.

## Project-local design skills

| Skill                 | Source                                                      | Role                                                        |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Frontend Design       | `anthropics/skills` → `skills/frontend-design`              | Distinctive art direction and implementation discipline     |
| Anti-Slop Design      | `wwewtech/anti-slop-design` → `skills/anti-slop-design`     | Critique for generic generated-interface patterns           |
| Web Design Guidelines | `vercel-labs/agent-skills` → `skills/web-design-guidelines` | Accessibility and interface-quality audit                   |
| Kinetic Type Motion   | This repository                                             | Glyph continuity, native-scroll motion, and monogram review |

UI/UX Pro Max was evaluated but not installed because its broad design database and Python tooling overlap the selected skills. The selected set is smaller and separates creation, motion, critique, and audit responsibilities.
