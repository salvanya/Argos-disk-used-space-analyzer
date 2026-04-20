# Lesson: augment default spheres without replacing them (`nodeThreeObjectExtend`)

## Symptom
We wanted expanded folders to grow an outer ring in the 3D graph while still
keeping the library's built-in sphere (sized via `nodeVal`) underneath. A naive
`nodeThreeObject={(n) => ring}` erased the sphere — the ring was drawn alone.

## Root cause
`react-force-graph-3d`'s `nodeThreeObject` **replaces** the default geometry.
To add extra geometry *on top of* the default sphere, pass `nodeThreeObjectExtend={true}`
alongside `nodeThreeObject`. Then the library composes your mesh into a group
with its own sphere instead of swapping it out.

## Fix / workaround
```tsx
<ForceGraph3D
  graphData={graphData}
  nodeVal={(n) => n.radius ** 3}          // volume (see the nodeval-is-volume lesson)
  nodeThreeObjectExtend={true}
  nodeThreeObject={(n: GraphNode) => {
    if (!n.expanded) return null;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(n.radius * 1.35, n.radius * 1.55, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    ring.rotation.x = Math.PI / 2;        // lie flat so the ring is visible from any angle
    return ring;
  }}
/>
```

Returning `null` from `nodeThreeObject` for unexpanded nodes leaves just the
default sphere — cheapest possible per-node cost.

## How to recognize it next time
- Your custom `nodeThreeObject` mesh renders but the sphere disappears → you
  forgot `nodeThreeObjectExtend`.
- When appending new data to an already-mounted `ForceGraph3D`, keep the
  component mounted (don't remount based on a changing `key`) and pass the
  next `graphData` reference. The force simulation re-warms smoothly; a
  remount throws the camera.
