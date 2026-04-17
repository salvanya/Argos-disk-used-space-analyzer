# Decision 0003: DiskScanner Is Synchronous; Async Wrapping at the API Layer

Status: accepted
Date: 2026-04-16

## Context

The scanner must report progress to the frontend while running (WebSocket in M2).
The question was whether to make DiskScanner itself async (using asyncio + run_in_executor
per directory) or keep it synchronous and wrap it at the API layer.

## Decision

`DiskScanner.scan()` is a plain synchronous method.
In M2, the FastAPI WebSocket endpoint will call it via
`asyncio.get_event_loop().run_in_executor(None, scanner.scan, root, options, callback)`
so the scan runs in a thread pool without blocking the event loop.

## Alternatives Considered

- **Async scanner with asyncio.gather over directories**: filesystem syscalls block
  regardless of async wrappers; no real throughput gain; adds asyncio complexity
  and makes the scanner hard to call from synchronous code (tests, CLI).
- **Multiprocessing**: higher overhead, IPC complexity; deferred unless Python speed
  proves inadequate on real disks (benchmark during M2).

## Consequences

**Positive**
- Scanner is trivially testable — no asyncio machinery in unit tests.
- Scanner can be called from the CLI or a script without an event loop.
- Clean separation: business logic (scan) vs. delivery mechanism (WebSocket).

**Negative**
- The progress callback is called from the thread pool thread; the WebSocket sender
  must be thread-safe (use `asyncio.run_coroutine_threadsafe` or a `queue.Queue`).

## Follow-ups

- Design the progress queue pattern in M2 before writing code.
- If scan on a large real disk is too slow (< 100k files/min target), revisit with
  `concurrent.futures.ThreadPoolExecutor` scanning per top-level subdirectory.
