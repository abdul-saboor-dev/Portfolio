# CMS setup and deployment

## Architecture

The repository is an npm workspace with three distinct responsibilities:

- `/` — the public React/Vite portfolio. It reads published content only.
- `/studio` — Sanity Studio for authenticated content administration.
- `/packages/content-model` — shared composition constraints, including the six-tagline contract.

The Studio is not embedded in the public application and the frontend remains a Vite application.

## What is and is not configured

The Studio application, schemas, content organization, published-content query, runtime validation, image URL utilities, caching repository, and React hook are implemented locally.

A live backend is **not** connected. No Sanity project, dataset, user membership, CORS origin, Studio hostname, or deployment token has been configured in this repository.

## Create and connect the Sanity project

1. Create or select a project at `https://sanity.io/manage`.
2. Create a `production` dataset. A public dataset allows the static portfolio to read published documents without a token. A private dataset requires a server-side API layer and must not be queried with a token from Vite.
3. Copy `.env.example` to `.env.local` and add the public project ID and dataset.
4. Copy `studio/.env.example` to `studio/.env.local` and add the same project ID and dataset.
5. Add the local frontend origin (`http://127.0.0.1:4173`) and final production frontend origin to Sanity CORS without credentials for published browser reads.
6. Run `npm run studio:dev`. Sanity handles user authentication; there is no custom password database in this repository.

Project IDs, dataset names, and pinned API dates are public configuration. Tokens and session credentials are secrets.

All repository Studio commands set `DO_NOT_TRACK=1` through `studio/scripts/sanity.mjs`; Sanity CLI telemetry is therefore disabled for this project's scripts.

## Access and publishing permissions

Manage members and roles in Sanity Manage rather than in Vite environment variables.

- Keep Administrator access limited to the owner and people who manage project infrastructure.
- On plans that support it, use Contributor for draft-only editing and Editor for people allowed to publish.
- Viewer is read-only.
- Custom document-type roles require a plan that supports custom roles.

Studio action filtering prevents accidental deletion or duplication of singleton documents, but it is an editing convenience—not a security boundary. Sanity roles are the authorization boundary.

## Content workflow

Sanity automatically maintains draft and published versions of documents. Projects therefore do not use a second, conflicting status field.

Recommended verification after credentials are configured:

1. Sign in as the owner and confirm the Studio loads.
2. Create the singleton Profile, About, Contact, and Site Settings documents through the dedicated navigation items. Profile owns exactly three Hero statements (32 characters each), the Hero introduction (130), Projects label/destination, CV label, and PDF; About owns the single narrative (650). Education is a repeatable ordered collection: add, edit, remove, and reorder entries without changing frontend code. Lower display-order values appear first, with start year and document ID providing stable tie-breaks.
3. Enter the six approved taglines and verify that a seventh, duplicate, multiline, or overlong tagline is rejected.
4. Use Skills Library to search by name or alias, browse by category, upload or replace a logo, set Working With/Learning status, control public visibility, and assign a numeric display order. Hidden records remain editable without being returned by the public query.
5. Optionally upload the owner's real CV as a PDF in Profile and confirm the published frontend enables the in-page viewer. Without a published file, the View CV action is withheld.
6. Create a project draft with cover image, alternative text, technologies, and optional links.
7. Confirm an editor without publish permission can save a draft but cannot publish.
8. Publish the project and confirm the public client returns it.
9. Change the draft without publishing and confirm the public client still returns the published version.
10. Unpublish the test content or replace it with real owner-provided content.

## Skills Library import

The supplied external icon catalog can seed the library without committing the full source collection:

```bash
npm run skills:import -- --catalog "D:/path/to/portfolio-skill-icons/ICON_CATALOG.json"
```

That command validates the catalog and assets only. To create missing Sanity records and upload PNG assets, provide `SANITY_STUDIO_PROJECT_ID`, optional `SANITY_STUDIO_DATASET`, and secret `SANITY_AUTH_TOKEN`, then add `--commit`. Existing skill document IDs are skipped so editor changes are not overwritten. The approved selection is initially visible; other imported library records are hidden until the owner enables them. Less and Prettier were absent from the supplied valid catalog and are not regenerated. Live import and retrieval remain unverified until real project credentials are configured.

Do not use fabricated achievements, projects, qualifications, or metrics for testing in the production dataset. Use a disposable test dataset when realistic fixtures are required.

## Preview status

The Presentation tool is configured to load `SANITY_STUDIO_PREVIEW_URL`. It provides the Studio-side foundation and can display the published Vite frontend.

Draft-enabled frontend preview is intentionally not activated. A static Vite browser bundle has nowhere safe to store the authenticated draft-read token or preview secret. Implement draft mode later with a server-side or serverless preview gateway, then configure the Presentation tool's enable/disable endpoints. Never put such a token in a `VITE_*` variable.

## Media

Image fields use Sanity's asset system, hotspot/crop support, mandatory alternative text where images are displayed, and the frontend image URL builder. Project galleries support images and external video URLs. The Profile singleton also accepts one PDF CV; its public asset URL and filename are validated before the Hero enables the viewer. No read token is exposed to the Vite bundle.

Sanity's organization-level Media Library can be connected later if the selected plan and organization provide it. Its organization and library IDs are not known during this phase.

## Deployment

### Sanity-hosted Studio

From `studio/`, authenticate locally and run:

```bash
npm run deploy
```

Choose a `*.sanity.studio` hostname. Sanity serves the static Studio while authentication and Content Lake access remain protected by Sanity.

### Self-hosted Studio

Run `npm run studio:build`, deploy `studio/dist` to a host with SPA fallback routing, add the exact Studio origin to Sanity CORS with credentials, and register the external Studio with `sanity deploy --external --url <studio-url>`.

Do not use broad credentialed wildcards for preview deployments.

### CI/CD

CI deployment requires `SANITY_AUTH_TOKEN` stored in the hosting provider's secret manager. Use a deploy token with only the permissions required for Studio/schema deployment. Never prefix it with `VITE_` or commit it.

## Dependency advisory status

As of November 16, 2026, this repository uses registry-current Sanity Studio `6.23.0`. `npm audit` reports high-severity denial-of-service/prototype-pollution advisories in YAML/TOML parsers pinned inside Sanity CLI's `@vercel/frameworks` dependency. They are build/deployment tooling dependencies, not part of the public portfolio runtime. npm's automatic remediation proposes a breaking downgrade to Sanity 5, so no forced downgrade or untested override has been applied. Recheck after Sanity or `@vercel/frameworks` publishes updated pins.

## Frontend behavior

`src/cms` provides:

- a published-only CDN client;
- one consolidated GROQ request for portfolio content;
- section-by-section Zod validation so one malformed document does not erase unrelated content;
- approved fallback identity, About, Education, and Skills content, plus empty fallbacks for unprovided later sections;
- cached retrieval so scroll animation code never performs CMS requests;
- safe image URL and loading helpers; and
- a reusable `usePortfolioContent` hook for later phases.

Animation components should receive already-loaded content through props or context. They must not call Sanity while ScrollTrigger timelines are running.
