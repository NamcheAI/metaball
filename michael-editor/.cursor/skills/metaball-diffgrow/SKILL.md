---
name: metaball-diffgrow
description: >-
  Optional Metaball differential-growth organic pass using the vendored
  inca/blender-differential-growth 2.1.1 addon. Use when the user asks for
  mycelium/lichen/coral growth, porous organic silhouette variation, or
  diffgrow on a metaball — never as the default material handoff path.
---

# Metaball differential growth (optional)

Gated organic geometry pass. **Destructive** (in-place mesh edit). Not part of
the default SurfaceDriver handoff.

## Addon pin

| Item | Value |
|------|-------|
| Upstream | [inca/blender-differential-growth](https://github.com/inca/blender-differential-growth) |
| Vendored | `blender-handoff-new/vendor/blender-differential-growth-2-1-1/` |
| Zip | `blender-handoff-new/vendor/diffgrow-2-1-1.zip` |
| Release | **2.1.1** (2022) + local tree includes Feb 2025 Blender **4.3** manifest / normal-recalc fix |
| Operator | `object.diff_growth_step` |
| Panel | Object Properties → Differential Growth |

Enable via Preferences → Add-ons, or the handoff `_start_mcp.py` which loads
`diffgrow` when present.

## When to use / when not

**Use** for mycelium / lichen / coral-like rim growth after weld, when the
brand asks for living silhouette variation beyond SurfaceDriver displace.

**Do not use** as a substitute for Stage 2 SurfaceDriver, on every handoff,
or with huge `dt` / many steps without saves (combinatorial hang risk).

## Guard rails

1. **Save `.blend` before first step.**
2. Duplicate OBJECT → `{OBJECT}_diffgrow`; never grow the clean original.
3. Weld Marching Cubes mesh first (same preflight as handoff).
4. Max undo steps recommended in Blender prefs (addon is destructive).
5. After growth: bbox CHECK vs pre-growth baseline — stay within **~3%** on
   X/Y when possible; Z drift up to ~10% was observed once on a porous pass
   and must be reported (see proven settings below). If silhouette breaks,
   undo / restore duplicate and reduce steps or radii.
6. Then continue material transfer on the grown mesh (SurfaceDriver) if needed.
7. Camera framing unchanged from material Stage 0 unless user asks otherwise.

## Vertex group (required)

Addon requires an active vertex group (Weight Paint). For closed metaball
meshes:

- Paint peak-weighted growth (high weights on ridges / desired grow zones).
- Set `inhibit_base = 0` on closed meshes (non-zero base inhibitor fights
  non-boundary verts — see proven note below).

## Safe starting band (proven porous white pass)

From `blender-handoff-new/appearance_analysis.json` (`Metaball_diffgrow`):

| Setting | Value | Notes |
|---------|-------|-------|
| steps | **5–8** (proven: 7) | Stop early; check bbox each few steps |
| `split_radius` | ~`0.03` (object-scale) | Scale with mesh size; defaults 0.5 are often huge |
| `repulsion_radius` | ~`2 × split_radius` | proven ~0.056 |
| `dt` | **0.02–0.04** | proven 0.04; avoid ≥0.1 on dense meshes |
| `fac_rep` | ~0.7 | |
| `fac_noise` | ~0.2 | keep low for controllable silhouette |
| `fac_attr` | 0 | unless intentional |
| `inhibit_base` | **0** on closed mesh | required for growth via weights |
| `inhibit_shell` | 0 start | raise only if sharpness blows up |
| `seed` | any 1–1000 | record in report |

Default addon numbers (`split_radius=0.5`, `dt=0.1`, `fac_rep=1`,
`fac_noise=1`, `inhibit_base=1`) are **unsafe** for unit-scale metaballs —
always scale radii to the object and prefer the band above.

## Agent procedure (MCP)

```
1. get_object_info → record bbox + vert count (baseline)
2. execute_blender_code: duplicate, weld if needed, ensure vertex group
3. Set diff_growth_settings from safe band
4. Loop: object.diff_growth_step × N (small batches of 1–2)
5. After each batch: bbox % drift + vert count; screenshot if useful
6. Stop at step budget or if any axis drifts past tolerance
7. Write WORKDIR/diffgrow_analysis.json (mirror appearance_analysis schema)
8. Shade Smooth; proceed to SurfaceDriver / handoff Stage 2+ if materials pending
```

## Report schema

```json
{
  "method": "inca/blender-differential-growth",
  "object": "<name>_diffgrow",
  "addon": "2.1.1",
  "steps": 0,
  "verts_start": 0,
  "verts_end": 0,
  "bbox_drift_pct": [0, 0, 0],
  "settings": {},
  "note": ""
}
```
