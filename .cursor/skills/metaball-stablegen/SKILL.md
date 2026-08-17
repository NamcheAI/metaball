---
name: metaball-stablegen
description: >-
  Optional StableGen (sakalond/StableGen) photographic texture bake spike for
  Metaball meshes after procedural SurfaceDriver materials already pass. Use
  only when the user explicitly asks for StableGen, AI projected textures, or
  a Stage 3b bake — never for default handoffs. Do not use texture-diffusion
  or dream-textures.
---

# Metaball StableGen spike (optional Stage 3b)

Photographic multi-view bake. **Not** a replacement for SurfaceDriver
geometry + correlated shading.

## Status

Documented spike procedure only. Run when ComfyUI is standing and the user
explicitly opts in. Keep out of default `HANDOFF.md` until one material family
is proven end-to-end.

## Use / do not use

| Do | Don't |
|----|-------|
| After Stages 0–3 procedural material **passed** VERIFY LOOP | Replace weld / SurfaceDriver / Factor shading |
| IPAdapter / ref-image guided projection for grain | Install [texture-diffusion](https://github.com/Shaamallow/texture-diffusion) |
| Bake to PBR maps, then re-verify vs `REFERENCE_IMAGE` | Revive [dream-textures](https://github.com/carson-katri/dream-textures) (stale since 2024-08) |
| One object / one look per spike | Run both StableGen and texture-diffusion |

## Prerequisites

- [sakalond/StableGen](https://github.com/sakalond/StableGen) **≥ v0.3.1** (GPL-3.0)
- ComfyUI reachable (local or remote API) with required ControlNet / IPAdapter nodes
- Blender **4.2–4.5** (OSL path) or **5.1+** (GPU Raycast). **Avoid 5.0** (OSL broken; Raycast not yet)
- Known open issues to watch: AngleThreshold property error; 4.5 image return KeyError; install quirks on 4.3.2; crash-on-start reports
- Duplicate mesh `{OBJECT}_stablegen` so procedural `{OBJECT}_textured` stays intact

## Spike procedure

```
OBJECT: {OBJECT_NAME}_textured   # already passed Stage 3
REFERENCE_IMAGE: {path}
WORKDIR: {WORKDIR}
STABLEGEN_MODE: ipadapter_project_bake

Goal: optional photographic bake without destroying procedural displace.
```

1. **Baseline** — screenshot `WORKDIR/03_material.png` (or re-capture
   `WORKDIR/03b_before_stablegen.png`). Record bbox + camera.
2. **Duplicate** → `{OBJECT}_stablegen`. Hide procedural copy (do not delete).
3. **StableGen setup** (UI or `bpy.ops` via MCP):
   - Cameras around subject (addon camera tools)
   - ControlNet depth (and optionally canny/normal) so projection respects form
   - IPAdapter / image guidance from `REFERENCE_IMAGE` for palette/grain
   - Prefer local refine / sequential views over a single naive view
4. **Generate + project + blend** viewpoints; then **bake** to standard PBR
   maps if the spike needs portable textures.
5. **VERIFY LOOP** (same budget as handoff Stage 3):
   - screenshot → `WORKDIR/03b_stablegen.png`
   - vision vs `REFERENCE_IMAGE` + vs `03_material.png` (must not regress
     silhouette; material family must still match)
   - max 2 revisions (ControlNet strength, IPAdapter weight, discard-over-angle)
6. **Decision gate**
   - PASS + clearly better grain → keep `{OBJECT}_stablegen` as optional beauty
     candidate; note procedural still authoritative for displace correlation
   - FAIL → hide/delete bake copy; keep procedural; report blockers (ComfyUI,
     Blender version, addon bug)

## Agent constraints

- Drive Blender through existing **ahujasid blender-mcp**
  (`execute_blender_code` / screenshots). Do not add kevinbadi WebSocket toolkit.
- Do not change Stage 0 camera for comparison shots.
- Do not claim “StableGen replaces SurfaceDriver” in reports.
- Skip entirely if ComfyUI or the addon is unavailable — say so and stop.

## Report template

```
1. Blender version + StableGen version + ComfyUI reachability
2. Whether procedural Stage 3 had already passed
3. ControlNet / IPAdapter / camera count used
4. VERIFY results (03b) + revision count
5. Keep or discard decision + paths to screenshots / baked maps
6. Explicit confirmation: texture-diffusion and dream-textures were NOT used
```

## Related

- Default path: skill `metaball-blender-handoff`
- Factor contract: skill `metaball-surface-driver`
- Beauty stills after either path: skill `metaball-beauty-cam`
