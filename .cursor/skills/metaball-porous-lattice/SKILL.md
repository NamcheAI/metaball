---
name: metaball-porous-lattice
description: >-
  Build trabecular / coral-like through-porosity on a metaball letter form in
  Blender using membrane-first geometry. Use when the user asks for porous
  coral, Weavy-style porosity, letter-r coral refs, or when boolean/Voronoi
  volume attempts look chunky, popcorn, or closed-void. Not the default
  SurfaceDriver material handoff.
---

# Metaball porous lattice

## Lessons

- **Punching a thick letter-r never becomes coral.** Sphere booleans on a solid (or even a Solidify shell) still read as “chunky r with craters,” not trabecular lattice.
- **Voronoi wall beads alone = popcorn.** DistributePointsInVolume → keep distance-to-edge → PointsToVolume without a continuous membrane disconnects into a blob cloud.
- **Interior-only cells don’t show.** Sites deep inside leave closed voids; pores must break the surface (or connect a surface network).
- **Volume-fuse after nubs refills.** Fine fuse helps, but it thickens walls and undoes lace.
- **What worked for continuity:** clean welded envelope → thin Solidify → elongated through-windows on the shell → light peak nubs/microdots. Looks porous, still optically thick on metaball bulbs.
- **True next leap:** density/SDF field = inside letter-r **and** near Voronoi edges (continuous walls), not boolean punches.

## Files (canonical location)

Everything lives under:

`…/P357 Here be dragons/03_Entwurf/Metaball/blender-handoff-new/`

| File | Role |
|------|------|
| `metaball_porous_white.blend` | Main scene (`Metaball_weavy`, archives of failed variants) |
| `05_product.png` / `03_material_cycles.png` | Beauty VERIFY |
| `02_geometry.png` | Geometry check |
| `appearance_analysis.json` | Pipeline + gaps + archived attempts |
| `diffgrow_analysis.json` | Diffgrow settings/report |
| `mesh.glb` | Source letter-r |
| `ref_coral_a.png` / `ref_coral_b.png` | Target refs |
| `scripts/membrane_first_lattice.py` | Rebuild membrane-first lattice from clean `Metaball` |

Do **not** use `blender-handoff/` (`fels_rock.blend`) for this look — older fels rock pass.

## Skills

Sibling skills under `…/Metaball/.cursor/skills/`:

- `metaball-blender-handoff` — default material transfer
- `metaball-porous-lattice` — this skill (through-porosity geometry)
- `metaball-surface-driver` — shared Factor geometry ↔ shading
- `metaball-diffgrow` — optional organic growth
- `metaball-beauty-cam` — beauty stills / turntable
- `metaball-stablegen` — optional photographic bake (opt-in only)

## When to use

- Reference reads as trabecular coral / lace membrane / through-cells
- User params like Weavy: deform / porosity / pore_size / nub_density
- Prior attempt looks like a drilled solid, popcorn beads, or closed bubbles

**Do not use** for matte rock (Fels), foam *surface* dimples only (Schaum displace), or resin+moss.

## Proven pipeline (continuity)

```
1. Duplicate clean welded envelope → Metaball_weavy (archive prior working copy)
2. Thin Solidify → membrane shell
3. Elongated through-windows on the shell (sites must break the surface)
4. Light peak nubs / microdots — fine fuse only; do not volume-fuse the whole shell
5. CoralPorcelain — cream AO body + moderated periwinkle ridge glaze
6. VERIFY → 02_geometry / 03_material_cycles / 05_product vs coral refs
7. Update appearance_analysis.json
```

Script: `blender-handoff-new/scripts/membrane_first_lattice.py`

Archived failures in the blend (leave hidden): `Metaball_weavy_chunky`, `_punched`, `_popcorn`.

## Next leap

Density/SDF field = inside letter-r **and** near Voronoi edges (continuous walls), high voxel res — **not** boolean punches and **not** PointsToVolume popcorn.

## Agent procedure (MCP)

```
1. Open blender-handoff-new/metaball_porous_white.blend
2. get_scene_info / get_object_info — prefer Metaball_weavy or clean Metaball
3. If rebuilding: run scripts/membrane_first_lattice.py
4. Keep CoralPorcelain; Cycles verify stills into WORKDIR
5. Update appearance_analysis.json (pipeline, verts, bbox_drift, gap_vs_refs)
6. diffgrow / beauty-cam only if user asks
```
