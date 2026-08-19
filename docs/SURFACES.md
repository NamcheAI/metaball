# Parametric 3D surfaces

The metaball shape and its surface are independent. Core owns the canonical
graph; the renderer turns it into an isosurface and applies a surface strategy;
Studio persists controls and prepares production handoffs.

## Strategies, not one universal parameter bag

Different media need different controls. The public `surface` contract is a
discriminated union, and the editor renders controls from the selected
surface's registry entry.

| Strategy | Presets | Parameters | Live renderer | Production path |
| --- | --- | --- | --- | --- |
| Plain | Smooth | none | physical base material | GLB as-is |
| Shader | Pearl | micro relief, layer variation | UV-free object-space shader | Blender nacre shader when needed |
| Shader / lattice | Coral | deformation, porosity, pore size, nub density | fast relief preview | membrane-first Blender geometry for open cells |
| Fibers | Moss, Grass, Fur | density, length, thickness, clumping, curl, gravity, color variation | deterministic instanced fibers | Blender hair curves / geometry nodes |

Only `scale`, `intensity`, and `seed` are common. Never put porosity controls on
fur or curl controls on pearl merely to make the data shape uniform.

## Public renderer

```tsx
<Metaball3D preset="loop" surface="pearl" autoRotate />

<Metaball3D
  preset="loop"
  surface={{
    kind: 'fur',
    density: 0.9,
    length: 0.42,
    curl: 0.65,
    colorVariation: 0.3,
  }}
/>
```

Surface presets select a suitable physical base material when `material` is
omitted. Passing `material` explicitly is an intentional override. Shader
surfaces do not fetch textures or add render passes. Fiber layers are
deterministic instanced geometry and are disposed with their component.

The component ref still exposes the canonical Marching Cubes body. Fiber
instances and vertex-shader displacement are live rendering layers; they are
not silently baked into that mesh.

## Export fidelity

`Export GLB` contains the canonical isosurface and physical base material.
`Export for Blender` additionally includes `surface.json`, the preview image,
and strategy-specific reconstruction instructions:

- Pearl becomes a layered, UV-free nacre shader.
- Coral open cells become membrane-first topology. A normal/bump map alone is
  not equivalent.
- Moss, grass, and fur become hair curves or instanced geometry.

This makes the limitation explicit instead of exporting a misleading flat
mesh that merely looked detailed in WebGL.

## Figma Weave

Weave is the art-direction branch, not the geometry source of truth. Recipe
`8ifPta04P57rgclEck5fBa` accepts a neutral metaball render plus material
references and produces image-conditioned variants. Use the strategy's own
parameters when mapping prompt variables. Generated images may change the
silhouette; optional image-to-3D models may reconstruct a different mesh.

Approved results belong in the design repository with a manifest containing:

- source shape preset and metaball commit;
- surface preset and normalized parameters;
- Weave recipe id and version;
- model/node names, seed, references, run id, and output hashes;
- reviewer and approval state.

The agent workflow is documented in
[`metaball-weave-surfaces`](../.cursor/skills/metaball-weave-surfaces/SKILL.md).
Weave runs consume account credits and always require the tool's explicit cost
approval. Do not automate private browser endpoints.

## Adding a surface

1. Add a discriminated parameter type and registry entry in
   `renderer/src/surfaces.ts`.
2. Choose `plain`, `shader`, or `fibers`. Add a new rendering strategy only
   when those semantics are insufficient.
3. Add only controls meaningful to that medium.
4. Give the preset a suitable physical base in `renderer/src/materials.ts`.
5. Define live-preview versus production/export fidelity explicitly.
6. Add normalization, parameter-separation, editor persistence, and visual
   smoke tests.
7. Update this document and `renderer/README.md`.
