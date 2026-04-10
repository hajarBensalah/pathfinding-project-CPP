export const CELL_SIZE = 18;
export const API = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : "http://localhost:8080";

export const CELL = { EMPTY:0, WALL:1, START:2, GOAL:3, VISITED:4, PATH:5, FRONTIER:6 };

export const BG_COLOR = "#080c14";

export const COLORS = {
    [CELL.EMPTY]:    BG_COLOR,
    [CELL.WALL]:     "#1e2840",
    [CELL.START]:    "#10d9a0",
    [CELL.GOAL]:     "#f43f5e",
    [CELL.VISITED]:  "#3b5bdb",
    [CELL.FRONTIER]: "#60a5fa",
    [CELL.PATH]:     "#f59e0b",
};

export const GLOW = {
    [CELL.START]:    "#10d9a0",
    [CELL.GOAL]:     "#f43f5e",
    [CELL.PATH]:     "#f59e0b",
    [CELL.FRONTIER]: "#93c5fd",
    [CELL.VISITED]:  "#4f6ef7",
};

// Speed config: { batch, delay, animate, throttle }
//   throttle: true  → yield to requestAnimationFrame between batches (smooth 60fps visual)
//   throttle: false → run as fast as possible (MAX: just finish, SLOW/MID: delay handles pacing)
export const SPEED_CONFIGS = {
    120: { batch: 1,    delay: 80,  animate: true,  throttle: false },  // SLOW  — 1 step, animated, 80ms pause
    20:  { batch: 3,    delay: 30,  animate: true,  throttle: false },  // MID   — 3 steps, animated, 30ms pause
    2:   { batch: 30,   delay: 0,   animate: false, throttle: true  },  // FAST  — rAF-paced, smooth canvas updates
    0:   { batch: 2000, delay: 0,   animate: false, throttle: false },  // MAX   — all at once, no visual pacing
};

export const BENCH_PATH_COLORS = [
    { stroke: '#10d9a0', glow: '#10d9a0', label: '1ST' },  // mint
    { stroke: '#f43f5e', glow: '#f43f5e', label: '2ND' },  // rose
    { stroke: '#a78bfa', glow: '#a78bfa', label: '3RD' },  // violet
];

export const BENCH_COMBOS = [
    { algo:'BFS',      heuristic:'none',       diagonal:false },
    { algo:'Dijkstra', heuristic:'none',       diagonal:false },
    { algo:'A*',       heuristic:'Manhattan',  diagonal:false },
    { algo:'A*',       heuristic:'Euclidean',  diagonal:false },
    { algo:'A*',       heuristic:'Chebyshev',  diagonal:false },
    { algo:'A*',       heuristic:'Manhattan',  diagonal:true  },
    { algo:'A*',       heuristic:'Euclidean',  diagonal:true  },
    { algo:'A*',       heuristic:'Chebyshev',  diagonal:true  },
];
