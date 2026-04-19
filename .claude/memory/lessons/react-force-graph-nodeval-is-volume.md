# Lesson: `react-force-graph-3d` `nodeVal` is VOLUME, not radius

## Symptom
All spheres in the 3D graph looked roughly the same size. A 1 GB folder vs a 1 KB file produced spheres whose visible radii differed only slightly, even though `nodeRadius(size)` returned clearly different values on a log scale.

## Root cause
`react-force-graph-3d` interprets the `nodeVal` prop as the **volume** of the sphere, not the radius. Internally the library takes the cube root of `nodeVal` to derive the drawn radius. When we passed `nodeVal={(n) => n.radius}` with a log-scaled radius, the library cube-rooted it, compressing the already-flat distribution into something visually near-uniform.

## Fix / workaround
Pass the cube of the desired radius so the library's internal cbrt recovers it:

```tsx
nodeVal={(n: GraphNode) => n.radius ** 3}
```

Keep `nodeRelSize={1}` so 1 unit of recovered radius equals 1 px.

## How to recognize it next time
- A `react-force-graph-{2d,3d}` scene where node-size variation feels much weaker than the data you're passing.
- Any time you find yourself doing log-scaling for a graph-lib size prop — check whether the prop name is `val` or `size` or `radius`. If it's `val`, the library almost certainly treats it as volume.
- Sanity check: pass two nodes with values `1` and `1000`. If radii look ~3× apart (cbrt(1000)=10 vs cbrt(1)=1), the library is cube-rooting your input.
