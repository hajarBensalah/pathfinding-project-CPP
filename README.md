# Pathfinding Visualizer

An interactive pathfinding algorithm visualizer with a C++ REST backend and a Vanilla JS canvas frontend.

---

## Features

- **3 Algorithms:** BFS, Dijkstra, A*
- **A* Heuristics:** Manhattan, Euclidean, Chebyshev
- **Diagonal movement** toggle for A*
- **3 Visualization modes:** Single, Compare (two algorithms side-by-side), Benchmark (all combos ranked)
- **4 Speed levels:** Slow, Mid, Fast, Max
- **Maze generators:** Binary Tree, Recursive Division
- **Interactive grid:** Draw/erase walls, drag start/goal
- **Dockerized deployment** via Docker Compose + nginx

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  HTML5 Canvas + Vanilla JS (script.js)        │  │
│  │  - Renders grid, animations, stats            │  │
│  │  - Communicates with backend via fetch()      │  │
│  └───────────────────┬───────────────────────────┘  │
└──────────────────────┼──────────────────────────────┘
                       │  HTTP (REST)
          ┌────────────▼────────────┐
          │   nginx (port 80)       │
          │   - Serves static files │
          │   - /api/* → backend    │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  C++ Backend (port 8080)│
          │  httplib + nlohmann/json│
          │  - Grid management      │
          │  - Algorithm execution  │
          └─────────────────────────┘
```

### Backend (`PathFindingBackend/`)

Written in C++17. Uses two header-only libraries:
- [`httplib.h`](https://github.com/yhirose/cpp-httplib) — HTTP server
- [`nlohmann/json.hpp`](https://github.com/nlohmann/json) — JSON serialization

**Class hierarchy:**

```
Cell                        ← base grid cell (state, parent pointer)
├── DijkstraNode            ← adds cost field
└── aStarNode               ← adds gCost, hCost; computes fCost()

Grid                        ← owns the 2D cell array, wall set, frontier set
PathFinder (abstract)       ← step() / finished() interface
├── BFS                     ← queue-based
├── Dijkstra                ← min-heap by cost
└── aStar                   ← min-heap by f-cost; supports diagonal + heuristics
```

**Global state (main.cpp):**

| Variable | Type | Description |
|----------|------|-------------|
| `grid` | `unique_ptr<Grid>` | The active pathfinding grid |
| `pathFinder` | `unique_ptr<PathFinder>` | Active algorithm instance |
| `start`, `goal` | `Cell*` (raw) | Non-owning pointers into grid cells |
| `stateMutex` | `std::mutex` | Guards all handler access |

> `pathFinder` must be destroyed before `grid` (holds a `Grid&` reference).

### Frontend (`frontend/testGrid/`)

Pure HTML5 + CSS3 + Vanilla JS. No frameworks or build tools. The frontend is structured as ES modules loaded from `script.js` (`type="module"`).

| File | Purpose |
|------|---------|
| `Index.html` | UI shell (sidebar controls, canvas containers) |
| `script.js` | Entry point — boot block, resize handler, `window.*` bindings for HTML onclick |
| `constants.js` | All read-only constants (`CELL`, `COLORS`, `SPEED_CONFIGS`, `BENCH_COMBOS`, …) |
| `state.js` | Single mutable `state` object shared across all modules |
| `grid.js` | Grid data ops: `gs`, `par`, `ctx`, `initGridState`, `resizeCanvases`, `sleep`, … |
| `renderer.js` | All canvas drawing: `drawGrid`, `drawCell`, `animateReveal`, bench overlay |
| `events.js` | Mouse interaction: `attachEvents`, `onDown`, `onMove`, `paintCell`, `eraseCell` |
| `api.js` | Backend communication: `buildPayload`, `initBackend`, `runAlgoLoop`, `extractPath` |
| `ui.js` | DOM/stats updates, timers, mode/algo/speed selectors, `resetVisuals`, `resetAll` |
| `maze.js` | Maze generation: `binaryTree`, `recursiveDivision`, `clearWalls` |
| `modes.js` | Mode orchestration: `runSingleMode`, `runCompareMode`, `runBenchmarkMode`, `startVisualization` |
| `config.js` | Runtime config (`API_BASE`, `CELL_SIZE`) — plain script, loaded before modules |
| `style.css` | Dark-themed styling |

**Module dependency order** (each module only imports from those above it):
```
constants.js → state.js → grid.js → renderer.js → ui.js → api.js → (events.js, maze.js) → modes.js → script.js
```

**Local grid state** is kept in the shared `state` object (`state.gridState1/2`, `state.parents1/2`) and stays in sync with the backend step-by-step. The canvas re-renders only the changed cells.

---

## API Reference

Base URL: `http://localhost:8080` (local) or `/api` (Docker via nginx).

### `POST /init`

Initialize the grid and select an algorithm.

**Request body:**
```json
{
  "algorithm": "BFS | Dijkstra | A*",
  "rows": 30,
  "cols": 50,
  "start": { "col": 5, "row": 15 },
  "end":   { "col": 45, "row": 15 },
  "walls": [{ "col": 10, "row": 10 }, "..."],
  "diagonal": true,
  "heuristic": "Manhattan | Euclidean | Chebyshev"
}
```

> `diagonal` and `heuristic` are only used by A*.

**Response:** `{ "status": "initialized" }`

---

### `GET /step`

Execute a single algorithm step.

**Response:**
```json
{
  "step": {
    "col": 6, "row": 15,
    "state": "Visited",
    "parent": { "col": 5, "row": 15 }
  },
  "cells": [
    { "col": 7, "row": 15, "state": "Frontier" }
  ]
}
```

`cells` contains only newly-changed frontier cells (incremental update).

---

### `GET /steps?n=N`

Execute N steps in one request (batch mode, capped at 5000).

**Response:**
```json
{
  "steps": [ "...array of step objects..." ],
  "done": false
}
```

When `done` is `true`, the algorithm has finished (path found or failure).

---

## Algorithm Details

### BFS (Breadth-First Search)

| Property | Value |
|----------|-------|
| Data structure | Queue (FIFO) |
| Optimal | Yes (unweighted graphs) |
| Complete | Yes |
| Heuristic | None |
| Diagonal | No |

Explores all neighbors layer by layer. Guarantees the shortest path when all edges have equal cost.

### Dijkstra's Algorithm

| Property | Value |
|----------|-------|
| Data structure | Min-heap (by cost) |
| Optimal | Yes (non-negative weights) |
| Complete | Yes |
| Heuristic | None |
| Diagonal | No |

Treats all moves as cost 1 in this implementation. Expands nodes in order of increasing distance from start. Same result as BFS here, but extendable to weighted grids.

### A* Algorithm

| Property | Value |
|----------|-------|
| Data structure | Min-heap (by f = g + h) |
| Optimal | Yes (with admissible heuristic) |
| Complete | Yes |
| Heuristic | Manhattan / Euclidean / Chebyshev |
| Diagonal | Configurable |

`g` = cost from start, `h` = estimated cost to goal.

**Heuristics:**

| Heuristic | Formula | Best for |
|-----------|---------|---------|
| Manhattan | `\|dx\| + \|dy\|` | 4-directional grids |
| Euclidean | `sqrt(dx² + dy²)` | Diagonal-aware distance |
| Chebyshev | `max(\|dx\|, \|dy\|)` | 8-directional (king's move) |

Diagonal moves cost `sqrt(2)` ≈ 1.414 and require both orthogonal neighbors to be free.

---

## Visualization Modes

| Mode | Description |
|------|-------------|
| **Single** | One algorithm on a full-size canvas |
| **Compare** | Two algorithms side-by-side on smaller canvases |
| **Benchmark** | Runs all algorithm/heuristic combinations and ranks by visited cells, path length, and time |

**Speed levels:**

| Label | Batch size | Delay | Animated |
|-------|-----------|-------|---------|
| SLOW | 1 step | 80 ms | Yes |
| MID | 3 steps | 30 ms | Yes |
| FAST | 30 steps | 0 ms | No |
| MAX | 2000 steps | 0 ms | No |

---

## Running Locally

### Option 1 — Docker (recommended)

Requirements: Docker, Docker Compose.

```bash
git clone <repo-url>
cd pathfinding-project-CPP
docker compose up --build
```

Open `http://localhost` in your browser.

**How it works:**
- `Dockerfile.backend` compiles the C++ source with GCC 13 + CMake
- `Dockerfile.frontend` places the static files in nginx
- nginx proxies `/api/*` to the backend and serves the frontend on port 80

### Option 2 — Manual (Windows / MSVC)

**Backend:**

1. Open `PathFindingBackend/PathFindingBackend.sln` in Visual Studio.
2. Build in Release or Debug (x64).
3. Run the compiled binary — it listens on `0.0.0.0:8080`.

**Frontend:**

1. Edit `frontend/testGrid/config.js`:
   ```js
   window.APP_CONFIG = {
       API_BASE: "http://localhost:8080",
       CELL_SIZE: 18
   };
   ```
2. Serve the `frontend/testGrid/` directory with any static file server, for example:
   ```bash
   npx serve frontend/testGrid
   ```
   > A server is required — ES modules are blocked by browsers on `file://` URLs.

### Option 3 — CMake (Linux / WSL)

```bash
cd PathFindingBackend
cmake -S . -B build
cmake --build build
./build/PathFindingBackend
```

---

## Project Structure

```
pathfinding-project-CPP/
├── PathFindingBackend/
│   ├── CMakeLists.txt
│   └── PathFindingBackend/
│       ├── main.cpp              # HTTP server, endpoints, global state
│       ├── Cell.h / Cell.cpp     # Base cell class, CellState enum
│       ├── Grid.h / Grid.cpp     # Grid, neighbor lookup, JSON serialization
│       ├── PathFinder.h/.cpp     # Abstract base + factory
│       ├── BFS.h / BFS.cpp       # Breadth-First Search
│       ├── Dijkstra.h/.cpp       # Dijkstra's algorithm
│       ├── DijkstraNode.h        # Cell + cost field
│       ├── aStar.h / aStar.cpp   # A* algorithm
│       ├── aStarNode.h           # Cell + gCost/hCost fields
│       ├── Step.h                # Step data structure
│       ├── Vector2.h             # 2D coordinate struct
│       ├── httplib.h             # Header-only HTTP server
│       └── nlohmann/json.hpp     # Header-only JSON library
├── frontend/
│   └── testGrid/
│       ├── Index.html            # UI
│       ├── config.js             # API_BASE and CELL_SIZE (plain script, runs before modules)
│       ├── script.js             # Entry point — boot + window.* bindings (type="module")
│       ├── constants.js          # All read-only constants
│       ├── state.js              # Shared mutable state object
│       ├── grid.js               # Grid data ops + resizeCanvases + sleep
│       ├── renderer.js           # Canvas drawing
│       ├── events.js             # Mouse interaction
│       ├── api.js                # Backend fetch calls + runAlgoLoop
│       ├── ui.js                 # DOM updates, timers, selectors
│       ├── maze.js               # Maze generators
│       ├── modes.js              # Single / Compare / Benchmark orchestration
│       └── style.css             # Dark-theme styles
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── nginx.conf
```

---

## How a Run Works (End-to-End)

```
1. User draws walls, places start/goal, picks algorithm + settings, clicks RUN
2. Frontend sends POST /init with full grid config
3. Backend creates Grid (allocates cells, marks walls) + PathFinder instance
4. Frontend enters the animation loop:
     a. GET /steps?n=<batch>
     b. Backend calls pathFinder->step() N times, returns JSON
     c. Frontend updates local gridState array
     d. Draws/animates changed cells on canvas
     e. Records parent pointers for path reconstruction
     f. Repeats until step.state == Goal or done == true
5. On goal found: frontend traces parent chain back to start, draws path in amber
6. Stats panel shows elapsed time, cells visited, path length
```
