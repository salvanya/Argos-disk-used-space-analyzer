# Lesson: @tanstack/react-virtual renders nothing in jsdom

## Symptom
`FolderTreePanel` tests showed a virtualizer container with correct `height` but zero children rendered. All assertions on tree row content failed.

## Root cause
`useVirtualizer` measures the scroll container's `offsetHeight` to decide which items to render. jsdom reports `0` for all layout metrics, so the virtualizer computes an empty visible range and renders no items.

## Fix / workaround
Mock the virtualizer at the top of any test file that renders a component using `useVirtualizer`:

```ts
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * estimateSize() })),
  }),
}));
```

## How to recognize it next time
Test DOM shows the virtualizer wrapper div (correct `height` style) but no child rows. Any `getByText` / `queryByText` on row content fails despite the data being correct.
