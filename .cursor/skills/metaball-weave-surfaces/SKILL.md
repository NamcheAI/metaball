---
name: metaball-weave-surfaces
description: >-
  Run a published Figma Weave workflow to explore material and surface looks on
  an exact NAMCHE metaball render, then record reproducible approved outputs.
  Use for Weave/Weavy style transfer, model comparison, coral or pearl concept
  renders, and design-repo material studies. Not the production mesh pipeline.
---

# Metaball → Figma Weave surface study

## Contract

- Canonical geometry stays in `@namche/metaball`.
- Recipe: `8ifPta04P57rgclEck5fBa`.
- Use the Weave MCP tools directly. A pasted `/flow/<id>` URL already contains
  the recipe id; do not automate the Weave browser UI.
- Inspect the input contract and recipe version before every run.
- Running spends Weave credits. Present the structured cost and obtain the
  required explicit approval before calling the run tool.
- Weave outputs are art-direction images or exploratory reconstructed models,
  never an automatic replacement for the canonical metaball mesh.

## Inputs

1. Export a neutral, front-facing metaball PNG with fixed camera and background.
2. Attach one material reference per run. Do not mix unrelated surface families.
3. Read `surface.json` and map only parameters belonging to its `kind`:
   - pearl: scale, intensity, micro relief, layer variation;
   - coral: scale, intensity, deformation, porosity, pore size, nub density;
   - moss/grass/fur: scale, intensity, density, length, thickness, clumping,
     curl, gravity, color variation.
4. Do not invent pore settings for fibers or fiber settings for minerals.
5. Ask the image model to preserve overall mark proportions and camera. Report
   visible silhouette drift rather than hiding it.

## Run and verify

1. `figma_weave_get_tool_inputs(recipeId)`.
2. Upload local image/reference assets when necessary.
3. Preview the exact cost and get explicit approval.
4. `figma_weave_run_tool` with the returned recipe version and node ids.
5. Poll the run output; do not submit duplicate runs while it is pending.
6. Compare output against the neutral render for silhouette, counter-form,
   material family, surface scale, lighting, and obvious image artifacts.
7. Keep model identity and seed. A beautiful but unreproducible result stays a
   draft.

## Production routing

- Pearl accepted as a still may be recreated with the renderer/Blender nacre
  shader.
- Coral with through-cells routes to
  [`metaball-porous-lattice`](../metaball-porous-lattice/SKILL.md).
- Moss, grass, and fur route to Blender hair curves or geometry nodes when an
  actual 3D asset is required.
- Image-to-3D output is exploratory. Inspect topology, silhouette, UVs,
  animation suitability, and model licensing before adopting it.

## Design-repo record

Write approved assets under `assets/metaballs/material-studies/<kind>/` and
store a manifest with source commit, preset/parameters, recipe id/version,
node models, seed, references, run id, output hashes, and approval state. Keep
generated media out of generic UI texture tokens.

See [`docs/SURFACES.md`](../../../docs/SURFACES.md) for the renderer and export
architecture.
