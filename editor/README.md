# Metaball Brandmark Editor

An interactive generator for the Namche metaball vocabulary. It opens on the
current **Namche Loop** mark; the approved earlier vector remains available as
**Classic Mark**. Place
variable-size nodes on a 5×5 grid (pink outer ring, blue inner 3×3 canvas),
connect them, and render the result either as a **graph** (circles + connectors)
or as organic **metaballs** (gooey blend). Export to SVG, PNG, or JSON. A
**3D view** shows the same mark as a live, orbitable isosurface with a choice
of organic material presets.

The compact Studio chrome uses the private tool lockup and local Namche Shadow
display face. Its Basalt header mark and Rhododendron favicon are synced from
the authoritative sibling `design` repository's generated brand-asset bundle;
the public “Frontier AI Initiative” descriptor is intentionally omitted to keep
the internal editor header compact.

For finishes that cannot be simulated convincingly in a lightweight browser
shader, Studio can send the current camera view plus an optional material
reference to a server-side image model and return a high-fidelity material
study. This is pay-per-render API usage; no provider credential enters the
browser bundle.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Deploy to Vercel (PIN login)

The editor can be deployed to [Vercel](https://vercel.com) with a simple PIN gate.
Vercel deployments require a complete auth configuration: visitors enter the PIN
once, then a signed httpOnly cookie keeps them signed in for 7 days. Missing or
partial credentials fail closed with HTTP 503.

### 1. Push the project

From the `metaball-editor` folder, initialize git (if needed), commit, and push to
GitHub/GitLab/Bitbucket.

### 2. Import on Vercel

1. [New Project](https://vercel.com/new) → import the repo.
2. **Root directory:** `metaball-editor` (if the repo root is the parent folder).
3. Framework preset should detect **Vite** automatically.

### 3. Environment variables

In Project → Settings → Environment Variables, add:

| Name                       | Value                                            |
| -------------------------- | ------------------------------------------------ |
| `AUTH_PIN`                 | Your PIN (e.g. `4829`)                           |
| `AUTH_SECRET`              | Long random string (e.g. `openssl rand -hex 32`) |
| `UPSTASH_REDIS_REST_URL`   | REST URL of the shared Upstash Redis database    |
| `UPSTASH_REDIS_REST_TOKEN` | REST token of the shared Upstash Redis database  |
| `OPENAI_API_KEY`           | Optional server-only key for AI material renders |
| `OPENAI_IMAGE_MODEL`       | Optional model override (default `gpt-image-2`)  |

Apply to **Production** (and Preview if you want PIN on preview URLs too).
Create or connect an Upstash Redis database through the Vercel Marketplace first;
the shared store enforces five PIN attempts per source across all function instances.
When Upstash is configured, login rate limiting also fails closed if the store
times out. Without Upstash configured, login on Vercel fails closed (503): a
per-instance in-memory window would hand every cold-started function a fresh
attempt budget, so serverless never falls back. (The self-hosted server below
does opt in to the in-memory fallback — it is one long-lived process.) Only
intentionally public Vercel deployments should set `AUTH_DISABLED=1`; omitting
credentials alone never disables authentication.

### 4. Deploy

Deploy from the Vercel dashboard or locally:

```bash
npx vercel --prod
```

### Local development

- `npm run dev` — open editor, **no PIN** (auth disabled when env vars are unset).
- `vercel dev` — full stack with middleware + login (reads `.env.local`).

Copy `.env.example` to `.env.local` and fill in values to test login locally.
The same file configures AI material renders for the normal Vite dev server;
see [`../docs/AI_RENDERING.md`](../docs/AI_RENDERING.md).

### How it works

- `middleware.ts` — redirects unauthenticated visitors to `/login`.
- `public/login.html` — PIN form → `POST /api/auth`.
- `api/auth.ts` — rate-limits and verifies the PIN, then sets a signed cookie.
- `api/logout.ts` — clears the authentication cookie at `/api/logout`.

**Note:** This is lightweight access control, not enterprise auth. Do not reuse the
PIN for sensitive data; rotate it if shared widely.

## Self-hosted container

For metaball.namche.ai the editor also ships as a plain Docker image, built
from the repo-root `Dockerfile`, with a small Node server at
[`server/`](server) standing in for Vercel's static hosting + middleware +
serverless functions. It serves the same `dist/` build, applies the same
`middleware.ts` auth semantics, and reuses the same `api/*.ts` handlers and
`lib/*.ts` logic through thin adapters — nothing in the request-handling
logic is forked between the two deployment targets.

### Build and run

```bash
# from the repo root
docker build -t metaball-editor .
docker run -p 8080:8080 metaball-editor
```

or locally without Docker, after `npm run build`:

```bash
npm run build:server -w metaball-editor   # compiles server/ + api/ + lib/ to dist-server/
npm run serve -w metaball-editor          # node dist-server/server/index.js
```

### Environment variables

| Name                        | Value                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `PORT`                      | Port to listen on (default `8080`)                               |
| `AUTH_PIN`                  | PIN gate, same as Vercel (unset = auth disabled)                 |
| `AUTH_SECRET`                | Long random signing string, required alongside `AUTH_PIN`        |
| `AUTH_DISABLED`             | Set to `1` for an intentionally public deployment                 |
| `UPSTASH_REDIS_REST_URL`    | Optional: shared login rate limiting across instances             |
| `UPSTASH_REDIS_REST_TOKEN`  | Optional: shared login rate limiting across instances             |
| `OPENAI_API_KEY`            | Optional server-only key for AI material renders                  |
| `OPENAI_IMAGE_MODEL`        | Optional model override (default `gpt-image-2`)                   |

Without `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, login rate
limiting falls back to an in-memory sliding window scoped to the single
running process — this container is deployed as one instance, so that is
equivalent to the shared store for this deployment shape.

`GET /api/health` always returns `200 {"ok":true}`, exempt from the auth
gate, for the deploy contract's health check.

**The image itself sets `AUTH_DISABLED=1`** (see the Dockerfile): the
container is the intentionally public Studio editor, and the host passes no
env at all. AI material rendering returns its normal "not configured" 503
until a key is provided. Note that omitting `AUTH_PIN`/`AUTH_SECRET`
without `AUTH_DISABLED=1` does **not** make the editor open — with no auth
env vars at all, `authConfiguration()` reports `invalid` and every
non-exempt route (including `/`) fails closed with 503, matching the
Vercel deployment's existing fail-closed behavior. To gate a deployment
of this image, override at runtime: `AUTH_DISABLED=0` plus
`AUTH_PIN`/`AUTH_SECRET` (deployment env beats the image default), and add
`OPENAI_API_KEY` to enable AI rendering.

## How to use

### Shape and nodes

- **Shape presets** – switch the graph without resetting raster colors or 3D material choices.
- **Namche Loop** – the current default mark.
- **Classic Mark** – the exact approved legacy vector with its editable five-node graph.

- **Add a node** – click an empty editable cell (inner 3×3 by default, or any of 25 cells when outer-cell authoring is enabled).
- **Select a node** – click it; size, radius, and delete controls become active.
- **Resize** – choose S, M, L, or XL, or set an exact **Radius** with the slider.
- **Nudge position** – with a node selected, use arrow keys (1 px) or Shift+arrow (5 px) to offset it off the cell center.
- **Move between cells** – Alt+drag or Shift+drag a node onto another empty cell.
- **Remove** – right-click a node, or select it and press Delete / Backspace.

### Connections

- **Connect** – drag from one node to another to toggle an edge.
- **Select a connection** – click the line between two nodes.
- **Customize selected connection** – in Metaball mode, select a join, then under Style turn on
  **Customize selected connection** to override **Neck width** and **Pinch** for that join only.
  Blur and Contrast stay global. Turn the toggle off to follow Style defaults again.
- **Remove connection** – right-click the line, or select it and press Delete.

### Metaball tuning (Metaball mode)

All sliders show numeric readouts and accept typed values:

- **Neck width** – capsule thickness before blur (0.10–1.00). Also available per connection.
- **Blur** – Gaussian blur amount (`gooStd`); higher = softer, wider joins. Global only.
- **Contrast** – alpha cutoff (`gooThreshold`); higher = sharper waist, tighter neck. Global only.
- **Pinch / merge** – morphs bridges from a thick barbell tube (0) toward a classic
  pinched metaball (1): tubes fade out and blur takes over so the silhouette dips
  inward between circles. Also boosts effective blur as tubes fade. Per-connection
  **Pinch** overrides tube scale for that join only (blur boost stays global).

### 2D appearance and authoring

- **Mark** – controls the flat 2D mark color.
- **Namche raster** – turns the complete raster background on or off. When enabled,
  its outer cells, inner cells, and background colors can be edited together.
- **Allow nodes in outer cells** – expands authoring from the inner 3×3 to all 25 cells.
- **Form / Graph** – Form is the actual mark and enables SVG/PNG export; Graph is
  an authoring view for understanding and editing its node network.

### Motion

Choose one loop from the compact **Motion** selector, stop it explicitly, or play
the one-shot **Grow once** reveal. **Allow necks to break** only applies while a
loop is active.

### 3D view

Switch the **2D / 3D** toggle in the header to see the same nodes and connections
rendered as a real, camera-orbitable metaball isosurface (via `THREE.MarchingCubes`)
instead of the flat SVG blur trick.

- Nodes and connections are still authored in **2D** – the 3D view is a live showcase
  of the current document, not a separate editor. Switch back to 2D to keep editing.
- **Neck width**, **Blur**, **Contrast**, and **Pinch / merge** in the Style section
  keep driving the shape live in 3D, exactly as they do in 2D.
- **Material** – available only in 3D. Choose an Organic PBR stand-in or a Liquid
  transmission material and its environment (see below).
- **Fine tune liquid** – keeps the detailed transmission, caustic, wave, rim, and
  optical controls collapsed until they are needed.
- **Surface sampling** – an opt-in advanced overlay. It is off by default so the
  first 3D render does not allocate and animate thousands of points and spheres.
- **AI material render** – captures the current object and camera as the locked
  shape reference, combines it with a generic material direction and optional
  reference image, then calls the configured image model through the protected
  server route. Shape fidelity and material influence are independent controls.
  The result is a rendered study, not a modified mesh or UV texture map.
- **Export GLB** – downloads the isosurface plus Principled-friendly material
  params (color, roughness, metalness, transmission, IOR, clearcoat, sheen, …).
- **Export for Blender** – downloads `metaball-blender-handoff.zip` for Blender
  MCP: `mesh.glb`, live `obj-preview.png`, `HANDOFF.md` (universal
  SurfaceDriver + VERIFY LOOP prompt), and a reference image when available —
  bundled for Harz+Moos / Fels / Schaum, or your own attached image for **any**
  material. Drop the zip into chat with Blender MCP open; follow
  [docs/blender-texture-transfer-prompt.md](docs/blender-texture-transfer-prompt.md).
- **Attach material image** – in AI material render, attach any image as the
  material/lighting look target. The same reference is reused by the optional
  Blender handoff.
- Drag to orbit the camera; scroll/pinch to zoom. Raster and flat mark controls are
  hidden in 3D; material controls are hidden in 2D so the two appearance systems
  cannot conflict.

#### Materials (live stand-ins → Blender)

All presets are plain `MeshPhysicalMaterial` stand-ins for the live 3D view —
not in-browser hair, displacement, or true SSS. Blender finish is always the
universal transfer prompt driven by the reference image (bundled or attached).

| Preset        | Live preview                           | Bundled ref (optional) |
| ------------- | -------------------------------------- | ---------------------- |
| **Harz+Moos** | Amber resin (transmission + clearcoat) | Yes                    |
| **Fels**      | Cool matte stone                       | Yes                    |
| **Schaum**    | Peach satin (light transmission)       | Yes                    |

Workflow: author shape in 2D → check form in 3D → **Export for Blender** →
import in Blender → follow `HANDOFF.md` /
[docs/blender-texture-transfer-prompt.md](docs/blender-texture-transfer-prompt.md).

### History & persistence

- **Undo / Redo** – toolbar buttons or Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z.
- **Autosave** – your work is saved to localStorage automatically.
- **Export JSON / Import JSON** – share or back up the full document (nodes, edges, per-edge overrides, colors, metaball settings).

### Export

- **Export SVG** – flattened to a real vector `<path>` in Form mode (compatible with Figma/Illustrator).
- **Export PNG** – choose scale (1×, 2×, 4×, 8×).
- **Copy SVG** – copies the flattened SVG string to the clipboard.
- **Export GLB** – (3D view) downloads the isosurface as a binary glTF for Blender.
- **Export for Blender** – (3D view) zip handoff for Blender MCP (mesh + preview +
  staged prompt; a bundled organic material ref or your attached reference image).
- **Mark only** – transparent background, mark only (no raster).
- **Advanced export** – optional controls for the flattened path:
  - **Export preview overlay** – dashed outline of the flattened export path on canvas.
  - **Flatten detail** – simplify epsilon for export path smoothness.
  - **Flatten res.** – raster resolution multiplier for sharper exports.

### Keyboard shortcuts

| Key                | Action                             |
| ------------------ | ---------------------------------- |
| Arrow keys         | Nudge selected node (1 px)         |
| Shift + arrow      | Nudge selected node (5 px)         |
| 1 / 2 / 3 / 4      | Set size S / M / L / XL            |
| Delete / Backspace | Remove selected node or connection |
| Escape             | Deselect                           |
| Cmd/Ctrl+Z         | Undo                               |
| Cmd/Ctrl+Shift+Z   | Redo                               |

## Project structure

```
src/
  App.tsx                    state, history, persistence, keyboard shortcuts
  components/
    MetaballCanvas.tsx       SVG renderer + pointer interactions
    Metaball3DPreview.tsx    Studio adapter around public 3D + advanced scenes
    Toolbar.tsx              controls panel
  lib/
    model.ts                 studio document + compatibility adapter to core
    coreDocument.ts          studio document -> @namche/metaball parameters
    history.ts               undo/redo stack
    persistence.ts           localStorage autosave + JSON import/export
    export.ts                SVG / PNG export + clipboard
    export3d.ts              GLB export of the live isosurface
    exportBlenderHandoff.ts  Zip package for Blender MCP handoff
    aiRender.ts              canvas capture + protected API client
    metaball3d.ts            Studio document -> public renderer shape adapter
    materialPresets.ts       compatibility exports from @namche/metaball-react
    organicMaterials.ts      compatibility exports for GLB material params
public/
  handoff-refs/              Look refs for Harz+Moos / Fels / Schaum
docs/
  ../docs/AI_RENDERING.md            server-side AI image material pipeline
  blender-materials.md              Canonical high-end materials after GLB import
  blender-texture-transfer-prompt.md  Generic staged prompt for any object/reference pair
```

The reusable viewer itself lives in the sibling `renderer/` workspace as
`@namche/metaball-react`. The editor's ordinary material view consumes it;
Liquid, surface sampling, and Blender/export hooks stay in the Studio adapter.
See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## How the two render modes share one model

Nodes and edges are authored once. **Graph** mode draws each edge as a thick
round-capped line plus a circle per node. **Metaball** mode draws the same node
circles plus a tube along each edge, all inside an SVG goo filter
(`feGaussianBlur` + `feColorMatrix` threshold) so connected shapes fuse
organically. Export flattens the same field into a smooth SVG path via marching
squares.

Grid geometry and 2D flattening come from the repository's
`@namche/metaball` workspace. `src/lib/model.ts` only adds studio-specific
look, material, liquid, and surface-sampler state.
