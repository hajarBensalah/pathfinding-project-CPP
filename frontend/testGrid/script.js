/* ============================================
   PATHFINDER — MAIN SCRIPT
   Heuristics: Manhattan / Euclidean / Diagonal
   Modes: Single / Compare / Benchmark
   ============================================ */

const CELL_SIZE = 18;
const API = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : "http://localhost:8080";

const CELL = { EMPTY:0, WALL:1, START:2, GOAL:3, VISITED:4, PATH:5, FRONTIER:6 };

const COLORS = {
    [CELL.EMPTY]:    "#0d1120",
    [CELL.WALL]:     "#060810",   // near-black, clearly distinct from empty
    [CELL.START]:    "#00e676",
    [CELL.GOAL]:     "#ff3d57",
    [CELL.VISITED]:  "#1976d2",   // light blue — clearly visible explored cells
    [CELL.FRONTIER]: "#2979ff",   // bright electric blue — distinct from visited
    [CELL.PATH]:     "#ffd32a",
};
const GLOW = {
    [CELL.START]:    "#00e676",
    [CELL.GOAL]:     "#ff3d57",
    [CELL.PATH]:     "#ffd32a",
    [CELL.FRONTIER]: "#60a5fa",
};

// Speed config: { batch = steps per HTTP call, delay = ms between calls, animate = use reveal animation }
const SPEED_CONFIGS = {
    120: { batch: 1,    delay: 80,  animate: true  },  // SLOW  — 1 step, animated, 80ms pause
    20:  { batch: 3,    delay: 30,  animate: true  },  // MID   — 3 steps, animated, 30ms pause
    2:   { batch: 30,   delay: 0,   animate: false },  // FAST  — 30 steps, no anim, no pause
    0:   { batch: 2000, delay: 0,   animate: false },  // MAX   — all at once
};
const BENCH_PATH_COLORS = [
    { stroke: '#00e5ff', glow: '#00e5ff', label: '1ST' },  // cyan
    { stroke: '#ff4757', glow: '#ff4757', label: '2ND' },  // red
    { stroke: '#a855f7', glow: '#a855f7', label: '3RD' },  // purple
];
let mode         = 'single';
let selectedAlgo1= 'BFS';
let selectedAlgo2= 'Dijkstra';
let selectedHeur1= 'Manhattan';
let selectedHeur2= 'Manhattan';
let selectedSpeed= 20;
let selectedTool = 'wall';
let isRunning    = false;
let stopRequested= false;
let drawingWalls = false;

let canvas1, ctx1, COLS1, ROWS1, gridState1, parents1;
let canvas2, ctx2, COLS2, ROWS2, gridState2, parents2;
let activeCellSize = CELL_SIZE; // changes in compare mode
let startPos = null;
let goalPos  = null;
let draggingWhat = null;
let timerInterval= null;
let startTime    = null;

// ============================================
// BOOT
// ============================================
window.addEventListener('load', () => {
    canvas1 = document.getElementById('gridCanvas1');
    ctx1    = canvas1.getContext('2d');
    canvas2 = document.getElementById('gridCanvas2');
    ctx2    = canvas2.getContext('2d');
    resizeCanvases();
    startPos = { row: Math.floor(ROWS1 / 2), col: 2 };
    goalPos  = { row: Math.floor(ROWS1 / 2), col: COLS1 - 3 };
    initGridState(1);
    drawGrid(1);
    attachEvents(canvas1, 1);
    attachEvents(canvas2, 2);
    window.addEventListener('resize', onResize);
});

function onResize() {
    resizeCanvases();
    initGridState(1);
    if (mode === 'compare') initGridState(2);
    drawGrid(1);
    if (mode === 'compare') drawGrid(2);
}

// ============================================
// CANVAS SIZING
// ============================================
function resizeCanvases() {
    const area  = document.getElementById('gridsArea');
    const areaW = area.clientWidth  - 28;
    const areaH = area.clientHeight - 48;
    const n   = mode === 'compare' ? 2 : 1;
    const gap = mode === 'compare' ? 12 : 0;
    const gW  = Math.floor((areaW - gap * (n - 1)) / n);
    const gH  = mode === 'single'
        ? Math.min(areaH, Math.floor(gW * 0.5))
        : areaH;

    // In compare mode shrink cell size so both grids fit comfortably
    const cs = mode === 'compare' ? 14 : CELL_SIZE;

    COLS1 = COLS2 = Math.floor(gW / cs);
    ROWS1 = ROWS2 = Math.floor(gH / cs);
    canvas1.width  = canvas2.width  = COLS1 * cs;
    canvas1.height = canvas2.height = ROWS1 * cs;

    // Store active cell size for drawing
    activeCellSize = cs;
}

// ============================================
// GRID STATE
// ============================================
function initGridState(g) {
    const R = g === 1 ? ROWS1 : ROWS2;
    const C = g === 1 ? COLS1 : COLS2;
    const gs = Array.from({length:R}, () => Array(C).fill(CELL.EMPTY));
    const par= Array.from({length:R}, () => Array(C).fill(null));
    gs[startPos.row][startPos.col] = CELL.START;
    gs[goalPos.row][goalPos.col]   = CELL.GOAL;
    if (g === 1) { gridState1 = gs; parents1 = par; }
    else         { gridState2 = gs; parents2 = par; }
}

function gs(g)  { return g === 1 ? gridState1 : gridState2; }
function par(g) { return g === 1 ? parents1   : parents2;   }
function ctx(g) { return g === 1 ? ctx1       : ctx2;       }
function rows(g){ return g === 1 ? ROWS1 : ROWS2; }
function cols(g){ return g === 1 ? COLS1 : COLS2; }

function setCell(col, row, state, g) {
    const s = gs(g);
    if (s && s[row]) s[row][col] = state;
}

// ============================================
// DRAW
// ============================================
function drawGrid(g) {
    const c = ctx(g); const R = rows(g); const C = cols(g); const s = gs(g);
    if (!c || !s) return;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    for (let r = 0; r < R; r++)
        for (let cc = 0; cc < C; cc++)
            drawCell(c, cc, r, s[r][cc]);
}

function drawCell(c, col, row, state) {
    const cs = activeCellSize;
    const x = col * cs, y = row * cs;
    const cx = x + cs / 2, cy = y + cs / 2;

    c.shadowBlur = 0;

    switch (state) {
        case CELL.WALL:
            // Clearly distinct from empty: near-black with a faint inset border
            c.fillStyle = COLORS[CELL.WALL];
            c.fillRect(x, y, cs, cs);
            c.strokeStyle = "rgba(80,100,160,0.12)";
            c.lineWidth = 1;
            c.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
            break;

        case CELL.START:
            c.fillStyle = COLORS[CELL.EMPTY];
            c.fillRect(x, y, cs, cs);
            c.shadowColor = COLORS[CELL.START]; c.shadowBlur = 16;
            c.fillStyle = COLORS[CELL.START];
            c.beginPath();
            c.moveTo(x + cs*0.22, y + cs*0.16);
            c.lineTo(x + cs*0.82, y + cs*0.5);
            c.lineTo(x + cs*0.22, y + cs*0.84);
            c.closePath(); c.fill();
            break;

        case CELL.GOAL: {
            c.fillStyle = COLORS[CELL.EMPTY];
            c.fillRect(x, y, cs, cs);
            const r = cs * 0.34;
            c.shadowColor = COLORS[CELL.GOAL]; c.shadowBlur = 16;
            c.fillStyle = COLORS[CELL.GOAL];
            c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = COLORS[CELL.EMPTY];
            c.beginPath(); c.arc(cx, cy, r * 0.4, 0, Math.PI*2); c.fill();
            break;
        }

        case CELL.VISITED:
            // Flat clear navy — readable, no heavy gradients
            c.fillStyle = COLORS[CELL.VISITED];
            c.fillRect(x, y, cs, cs);
            break;

        case CELL.FRONTIER:
            // Bright electric blue — clearly distinct from visited navy
            c.shadowColor = COLORS[CELL.FRONTIER]; c.shadowBlur = 8;
            c.fillStyle = COLORS[CELL.FRONTIER];
            c.fillRect(x, y, cs, cs);
            break;

        case CELL.PATH:
            // Full-cell gold with glow
            c.shadowColor = COLORS[CELL.PATH]; c.shadowBlur = 14;
            c.fillStyle = COLORS[CELL.PATH];
            c.fillRect(x, y, cs, cs);
            break;

        default:
            // EMPTY
            c.fillStyle = COLORS[CELL.EMPTY];
            c.fillRect(x, y, cs, cs);
            break;
    }

    // Grid lines — thinner on processed cells, visible on empty/wall
    c.shadowBlur = 0;
    const processed = state === CELL.VISITED || state === CELL.FRONTIER || state === CELL.PATH;
    c.strokeStyle = processed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.07)";
    c.lineWidth = 0.5;
    c.strokeRect(x, y, cs, cs);
}

function animateReveal(c, col, row, state) {
    const cs = activeCellSize;
    const x = col*cs, y = row*cs;
    const cx = x + cs/2, cy = y + cs/2;
    let size = 2;
    const step = cs / 3.5;
    function frame() {
        size = Math.min(size + step, cs);
        c.fillStyle = COLORS[CELL.EMPTY];
        c.fillRect(x, y, cs, cs);
        c.strokeStyle = "rgba(255,255,255,0.07)";
        c.lineWidth = 0.5;
        c.strokeRect(x, y, cs, cs);
        c.shadowBlur = 0;
        if (GLOW[state]) { c.shadowColor = GLOW[state]; c.shadowBlur = 8; }
        c.fillStyle = COLORS[state] || COLORS[CELL.EMPTY];
        c.fillRect(cx - size/2, cy - size/2, size, size);
        c.shadowBlur = 0;
        if (size < cs) requestAnimationFrame(frame);
        else drawCell(c, col, row, state);
    }
    requestAnimationFrame(frame);
}

// ============================================
// MOUSE EVENTS
// ============================================
function attachEvents(canvas, g) {
    canvas.addEventListener('mousedown', e => onDown(e, g));
    canvas.addEventListener('mousemove', e => onMove(e, g));
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); const c = mCell(e,canvas,g); if(c) eraseCell(c,g); });
    window.addEventListener('mouseup', () => { drawingWalls = false; draggingWhat = null; });
}

function mCell(e, canvas, g) {
    const cs = activeCellSize;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cs);
    const row = Math.floor((e.clientY - rect.top)  / cs);
    if (row < 0 || row >= rows(g) || col < 0 || col >= cols(g)) return null;
    return { row, col };
}

function onDown(e, g) {
    if (isRunning) return;
    const canvas = g === 1 ? canvas1 : canvas2;
    const cell = mCell(e, canvas, g);
    if (!cell) return;
    const state = gs(g)[cell.row][cell.col];
    if (state === CELL.START)      { draggingWhat = 'start'; }
    else if (state === CELL.GOAL)  { draggingWhat = 'goal';  }
    else                           { drawingWalls = true; paintCell(cell.col, cell.row); }
}

function onMove(e, g) {
    if (isRunning) return;
    const canvas = g === 1 ? canvas1 : canvas2;
    const cell = mCell(e, canvas, g);
    if (!cell) return;
    const {row, col} = cell;

    if (draggingWhat) {
        const s = gs(g)[row][col];
        if (s === CELL.WALL || s === CELL.START || s === CELL.GOAL) return;

        if (draggingWhat === 'start') {
            // clear old from both grids
            const old = startPos;
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[old.row]) return;
                gs2[old.row][old.col] = CELL.EMPTY;
                drawCell(ctx(gg), old.col, old.row, CELL.EMPTY);
            });
            startPos = {row, col};
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[row]) return;
                gs2[row][col] = CELL.START;
                drawCell(ctx(gg), col, row, CELL.START);
            });
        } else {
            const old = goalPos;
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[old.row]) return;
                gs2[old.row][old.col] = CELL.EMPTY;
                drawCell(ctx(gg), old.col, old.row, CELL.EMPTY);
            });
            goalPos = {row, col};
            [1,2].forEach(gg => {
                const gs2 = gs(gg); if (!gs2 || !gs2[row]) return;
                gs2[row][col] = CELL.GOAL;
                drawCell(ctx(gg), col, row, CELL.GOAL);
            });
        }
    } else if (drawingWalls) {
        paintCell(col, row);
    }
}

function paintCell(col, row) {
    const state = gs(1)[row] ? gs(1)[row][col] : null;
    if (state === CELL.START || state === CELL.GOAL) return;
    const newState = selectedTool === 'wall' ? CELL.WALL : CELL.EMPTY;
    // paint both grids when in compare/bench so they stay in sync
    const grids = (mode === 'compare' || mode === 'benchmark') ? [1,2] : [1];
    grids.forEach(g => {
        const gs2 = gs(g); if (!gs2 || !gs2[row] || col >= cols(g)) return;
        gs2[row][col] = newState;
        drawCell(ctx(g), col, row, newState);
    });
}

function eraseCell(cell, g) {
    const {col, row} = cell;
    const state = gs(g)[row][col];
    if (state === CELL.START || state === CELL.GOAL) return;
    setCell(col, row, CELL.EMPTY, g);
    drawCell(ctx(g), col, row, CELL.EMPTY);
}

// ============================================
// UI CONTROLS
// ============================================
function setMode(m) {
    if (isRunning) return;
    mode = m;
    ['single','compare','benchmark'].forEach(id => {
        document.getElementById(`tab-${id}`).classList.toggle('active', id === m);
    });

    const show  = (id, vis) => { const el = document.getElementById(id); if(el) el.style.display = vis ? '' : 'none'; };
    const showB = (id, vis) => { const el = document.getElementById(id); if(el) el.classList.toggle('hidden', !vis); };

    show('algo2Section',  m === 'compare');
    show('benchSection',  m === 'benchmark');
    show('speedSection',  m !== 'benchmark');
    show('statsSection',  m !== 'benchmark');
    show('compareStats',  m === 'compare');
    document.getElementById('statsGrid').style.display = m === 'single' ? 'grid' : 'none';
    showB('gridWrapper2', m === 'compare');
    showB('benchPanel',   m === 'benchmark');

    resizeCanvases();
    initGridState(1);
    if (m === 'compare') { initGridState(2); syncWallsToGrid2(); }
    drawGrid(1);
    if (m === 'compare') drawGrid(2);

    document.getElementById('algo1SectionLabel').textContent =
        m === 'compare' ? 'ALGORITHM · A' : 'ALGORITHM';
}

function syncWallsToGrid2() {
    const R = Math.min(ROWS1, ROWS2), C = Math.min(COLS1, COLS2);
    for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++)
            gridState2[r][c] = gridState1[r][c] === CELL.WALL ? CELL.WALL : CELL.EMPTY;

    // Clamp and place start/goal on grid2
    const s = clampToWalkable(startPos, 2);
    const g2 = clampToWalkable(goalPos,  2);
    startPos = s;
    goalPos  = g2;

    // Also update grid1 in case positions changed
    clearStartGoal(1); clearStartGoal(2);
    gridState1[startPos.row][startPos.col] = CELL.START;
    gridState1[goalPos.row][goalPos.col]   = CELL.GOAL;
    gridState2[startPos.row][startPos.col] = CELL.START;
    gridState2[goalPos.row][goalPos.col]   = CELL.GOAL;
}

function clearStartGoal(g) {
    const s = gs(g); if (!s) return;
    for (let r = 0; r < rows(g); r++)
        for (let c = 0; c < cols(g); c++)
            if (s[r][c] === CELL.START || s[r][c] === CELL.GOAL)
                s[r][c] = CELL.EMPTY;
}

// Find nearest walkable cell to a position within a given grid
function clampToWalkable(pos, g) {
    const R = rows(g), C = cols(g);
    const s = gs(g);
    if (!s) return pos;

    // First clamp to grid bounds (leave 1 cell margin)
    let row = Math.max(1, Math.min(R - 2, pos.row));
    let col = Math.max(1, Math.min(C - 2, pos.col));

    if (s[row][col] !== CELL.WALL) return { row, col };

    // BFS outward from clamped position to find nearest non-wall cell
    const visited = new Set();
    const queue = [{ row, col }];
    visited.add(`${row},${col}`);
    while (queue.length) {
        const cur = queue.shift();
        if (s[cur.row]?.[cur.col] !== CELL.WALL) return { row: cur.row, col: cur.col };
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nr = cur.row + dr, nc = cur.col + dc;
            const key = `${nr},${nc}`;
            if (nr >= 1 && nr < R-1 && nc >= 1 && nc < C-1 && !visited.has(key)) {
                visited.add(key);
                queue.push({ row: nr, col: nc });
            }
        }
    }
    return { row, col }; // fallback
}

function selectAlgo(btn, g) {
    const algo = btn.dataset.algo;
    if (g === 1) {
        selectedAlgo1 = algo;
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('gridLabel1').textContent = algo;
        document.getElementById('heuristicBox1').style.display = algo === 'A*' ? '' : 'none';
    } else {
        selectedAlgo2 = algo;
        document.querySelectorAll('.algo-btn2').forEach(b => b.classList.remove('active2'));
        btn.classList.add('active2');
        document.getElementById('gridLabel2').textContent = algo;
        document.getElementById('heuristicBox2').style.display = algo === 'A*' ? '' : 'none';
    }
}

function selectHeuristic(btn, g) {
    const h = btn.dataset.h; // 'Manhattan' | 'Euclidean' | 'Chebyshev'
    if (g === 1) {
        selectedHeur1 = h;
        document.querySelectorAll('#heuristicBox1 .heur-btn').forEach(b => b.classList.remove('active','active2'));
        btn.classList.add('active');
        // Chebyshev is designed for diagonal movement — auto-enable it
        if (h === 'Chebyshev') document.getElementById('diagCheck1').checked = true;
    } else {
        selectedHeur2 = h;
        document.querySelectorAll('#heuristicBox2 .heur-btn').forEach(b => b.classList.remove('active','active2'));
        btn.classList.add('active2');
        if (h === 'Chebyshev') document.getElementById('diagCheck2').checked = true;
    }
}

function selectSpeed(btn) {
    selectedSpeed = parseInt(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectTool(btn) {
    selectedTool = btn.dataset.tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ============================================
// MAZE GENERATORS
// ============================================
function generateMaze(type) {
    if (isRunning) return;
    resetVisuals();
    if (type === 'binary')    binaryTree();
    if (type === 'recursive') recursiveDivision();

    // After maze generation on grid1, clamp start/goal to walkable cells
    const s = clampToWalkable(startPos, 1);
    const g = clampToWalkable(goalPos,  1);
    // Make sure they don't land on the same cell
    startPos = s;
    goalPos  = (g.row === s.row && g.col === s.col)
        ? clampToWalkable({ row: ROWS1 - 2, col: COLS1 - 2 }, 1)
        : g;

    gridState1[startPos.row][startPos.col] = CELL.START;
    gridState1[goalPos.row][goalPos.col]   = CELL.GOAL;

    if (mode === 'compare' || mode === 'benchmark') {
        syncWallsToGrid2();
        drawGrid(2);
    }
    drawGrid(1);
}

function binaryTree() {
    const R = ROWS1, C = COLS1;
    for (let r=0;r<R;r++) for(let c=0;c<C;c++) gridState1[r][c] = CELL.WALL;
    for (let r=1;r<R;r+=2) {
        for (let c=1;c<C;c+=2) {
            gridState1[r][c] = CELL.EMPTY;
            const opts = [];
            if (r-2 > 0) opts.push('up');
            if (c+2 < C-1) opts.push('right');
            if (!opts.length) continue;
            const dir = opts[Math.floor(Math.random()*opts.length)];
            if (dir==='up') gridState1[r-1][c] = CELL.EMPTY;
            else            gridState1[r][c+1] = CELL.EMPTY;
        }
    }
    // generateMaze() will place start/goal after clamping
}

function recursiveDivision() {
    const R = ROWS1, C = COLS1;
    for (let r=0;r<R;r++) for(let c=0;c<C;c++) gridState1[r][c]=CELL.EMPTY;
    for (let r=0;r<R;r++) { gridState1[r][0]=CELL.WALL; gridState1[r][C-1]=CELL.WALL; }
    for (let c=0;c<C;c++) { gridState1[0][c]=CELL.WALL; gridState1[R-1][c]=CELL.WALL; }
    divide(1,1,R-2,C-2);
    // generateMaze() will place start/goal after clamping
}

function divide(rS,cS,rE,cE) {
    const h=rE-rS, w=cE-cS;
    if(h<2||w<2) return;
    const horiz = h>w ? true : w>h ? false : Math.random()<0.5;
    if(horiz){
        const wR = rS+1+2*Math.floor(Math.random()*Math.floor(h/2));
        const pC = cS+2*Math.floor(Math.random()*Math.ceil(w/2));
        for(let c=cS;c<=cE;c++) if(c!==pC) gridState1[wR][c]=CELL.WALL;
        divide(rS,cS,wR-1,cE); divide(wR+1,cS,rE,cE);
    } else {
        const wC = cS+1+2*Math.floor(Math.random()*Math.floor(w/2));
        const pR = rS+2*Math.floor(Math.random()*Math.ceil(h/2));
        for(let r=rS;r<=rE;r++) if(r!==pR) gridState1[r][wC]=CELL.WALL;
        divide(rS,cS,rE,wC-1); divide(rS,wC+1,rE,cE);
    }
}

function clearWalls() {
    if (isRunning) return;
    [gridState1, gridState2].forEach((gs2, idx) => {
        if (!gs2) return;
        const R = idx===0?ROWS1:ROWS2, C = idx===0?COLS1:COLS2;
        for(let r=0;r<R;r++) for(let c=0;c<C;c++) if(gs2[r][c]===CELL.WALL) gs2[r][c]=CELL.EMPTY;
    });
    drawGrid(1); if (mode==='compare') drawGrid(2);
}

// ============================================
// RESET
// ============================================
function resetAll() {
    if (isRunning) return;
    stopTimer();
    resetVisuals();
    updateStatus('IDLE','');
    updateSingleStats(null);
}

function resetVisuals() {
    parents1 = Array.from({length:ROWS1},()=>Array(COLS1).fill(null));
    parents2 = Array.from({length:ROWS2},()=>Array(COLS2).fill(null));
    [[gridState1,ROWS1,COLS1,1],[gridState2,ROWS2,COLS2,2]].forEach(([s,R,C,g])=>{
        if (!s) return;
        for(let r=0;r<R;r++) for(let c=0;c<C;c++)
            if(s[r][c]!==CELL.WALL&&s[r][c]!==CELL.START&&s[r][c]!==CELL.GOAL) s[r][c]=CELL.EMPTY;
        drawGrid(g);
    });
    document.getElementById('runBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// ============================================
// STATUS / STATS
// ============================================
function updateStatus(text, type) {
    document.getElementById('statusText').textContent = text;
    document.getElementById('statusDot').className = 'status-dot' + (type?' '+type:'');
}

function updateSingleStats(d) {
    document.getElementById('statTime').textContent    = d ? d.time    : '--';
    document.getElementById('statVisited').textContent = d ? d.visited : '--';
    document.getElementById('statPath').textContent    = d ? d.path    : '--';
}

// ============================================
// TIMER
// ============================================
function startTimer() {
    startTime = Date.now();
    document.getElementById('timerBar').classList.add('visible');
    timerInterval = setInterval(()=>{
        document.getElementById('timerDisplay').textContent = fmtTime(Date.now()-startTime);
    }, 50);
}
function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('timerBar').classList.remove('visible');
}
function getElapsedMs() { return startTime ? Date.now()-startTime : 0; }
function fmtTime(ms) {
    return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
}

// ============================================
// PAYLOAD BUILDER
// ============================================
function getWalls(g) {
    const s = gs(g); const R=rows(g), C=cols(g); const walls=[];
    for(let r=0;r<R;r++) for(let c=0;c<C;c++) if(s[r][c]===CELL.WALL) walls.push({col:c,row:r});
    return walls;
}

function buildPayload(algo, heuristic, diagonal, g) {
    return {
        algorithm: algo,
        heuristic: algo === 'A*' ? heuristic : 'none',
        diagonal:  algo === 'A*' ? diagonal  : false,
        rows: rows(g), cols: cols(g),
        start: {col:startPos.col, row:startPos.row},
        end:   {col:goalPos.col,  row:goalPos.row},
        walls: getWalls(g)
    };
}

async function initBackend(payload) {
    const res = await fetch(`${API}/init`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Backend /init failed: ${res.status}`);
}

function intoCELL(s) {
    return {Empty:CELL.EMPTY,Wall:CELL.WALL,Start:CELL.START,Goal:CELL.GOAL,
            Visited:CELL.VISITED,Path:CELL.PATH,Frontier:CELL.FRONTIER,
            Failure:-1,Done:-2}[s] ?? CELL.EMPTY;
}

// ============================================
// STOP
// ============================================
function stopVisualization() {
    stopRequested = true;
    document.getElementById('stopBtn').disabled = true;
    updateStatus('STOPPED','error');
}

// ============================================
// START ENTRY POINT
// ============================================
function enterRunningMode(algoLabel) {
    document.body.classList.add('is-running');
    document.getElementById('runningHudAlgo').textContent = algoLabel;
    document.getElementById('liveVisited').textContent = '0';
    document.getElementById('liveTime').textContent    = '00:00.000';
}

function exitRunningMode() {
    document.body.classList.remove('is-running');
}

function updateLiveHud(visited) {
    document.getElementById('liveVisited').textContent = visited;
    if (startTime)
        document.getElementById('liveTime').textContent = fmtTime(Date.now() - startTime);
}

async function startVisualization() {
    if (isRunning) return;
    resetVisuals();
    isRunning = true; stopRequested = false;
    document.getElementById('runBtn').disabled  = true;
    document.getElementById('stopBtn').disabled = false;

    const algoLabel = mode === 'benchmark' ? 'BENCHMARK'
        : selectedAlgo1 === 'A*' ? `A* · ${selectedHeur1.toUpperCase()}`
        : selectedAlgo1;
    enterRunningMode(algoLabel);

    try {
        if      (mode === 'single')    await runSingleMode();
        else if (mode === 'compare')   await runCompareMode();
        else if (mode === 'benchmark') await runBenchmarkMode();
    } catch(e) {
        console.error(e);
        updateStatus('ERROR — backend offline?','error');
    }

    exitRunningMode();
    isRunning = false; stopRequested = false;
    document.getElementById('runBtn').disabled  = false;
    document.getElementById('stopBtn').disabled = true;
}

// ============================================
// SINGLE MODE
// ============================================
async function runSingleMode() {
    const diag = document.getElementById('diagCheck1').checked;
    const payload = buildPayload(selectedAlgo1, selectedHeur1, diag, 1);
    const label = selectedAlgo1 === 'A*' ? `A* (${selectedHeur1.toUpperCase()})` : selectedAlgo1;
    document.getElementById('gridLabel1').textContent = label;
    await initBackend(payload);
    updateStatus('RUNNING','running');
    startTimer();

    const res = await runAlgoLoop(1, selectedSpeed);

    stopTimer();
    if (res.found) {
        updateStatus('PATH FOUND','done');
        const pathLen = await drawPath(1, res.goalStep);
        const elapsed = res.elapsed;
        updateSingleStats({ time: fmtTime(elapsed), visited: res.visited, path: pathLen });
    } else if (!stopRequested) {
        updateStatus('NO PATH FOUND','error');
        updateSingleStats({ time: fmtTime(res.elapsed), visited: res.visited, path: 0 });
    }
}

// ============================================
// COMPARE MODE
// ============================================
async function runCompareMode() {
    const diag1 = document.getElementById('diagCheck1').checked;
    const diag2 = document.getElementById('diagCheck2').checked;
    const lbl1 = selectedAlgo1 === 'A*' ? `A* (${selectedHeur1})` : selectedAlgo1;
    const lbl2 = selectedAlgo2 === 'A*' ? `A* (${selectedHeur2})` : selectedAlgo2;
    document.getElementById('cAlgo1Label').textContent = lbl1.toUpperCase();
    document.getElementById('cAlgo2Label').textContent = lbl2.toUpperCase();
    document.getElementById('compareStats').style.display = '';

    startTimer();
    // RUN A
    updateStatus(`RUNNING ${lbl1}...`,'running');
    document.getElementById('runningHudAlgo').textContent = lbl1.toUpperCase();
    await initBackend(buildPayload(selectedAlgo1, selectedHeur1, diag1, 1));
    const t1s = Date.now();
    const r1  = await runAlgoLoop(1, selectedSpeed);
    const t1  = Date.now() - t1s;
    if (r1.found) await drawPath(1, r1.goalStep);

    if (stopRequested) { stopTimer(); return; }

    // RUN B
    updateStatus(`RUNNING ${lbl2}...`,'running');
    document.getElementById('runningHudAlgo').textContent = lbl2.toUpperCase();
    await initBackend(buildPayload(selectedAlgo2, selectedHeur2, diag2, 2));
    const t2s = Date.now();
    const r2  = await runAlgoLoop(2, selectedSpeed);
    const t2  = Date.now() - t2s;
    if (r2.found) await drawPath(2, r2.goalStep);

    stopTimer();
    updateStatus('COMPARE DONE','done');

    document.getElementById('cTime1').textContent    = fmtTime(t1);
    document.getElementById('cTime2').textContent    = fmtTime(t2);
    document.getElementById('cVisited1').textContent = r1.visited;
    document.getElementById('cVisited2').textContent = r2.visited;
    document.getElementById('cPath1').textContent    = r1.pathLen || '--';
    document.getElementById('cPath2').textContent    = r2.pathLen || '--';
}

// ============================================
// BENCHMARK MODE
// ============================================
const BENCH_COMBOS = [
    { algo:'BFS',      heuristic:'none',       diagonal:false },
    { algo:'Dijkstra', heuristic:'none',       diagonal:false },
    { algo:'A*',       heuristic:'Manhattan',  diagonal:false },
    { algo:'A*',       heuristic:'Euclidean',  diagonal:false },
    { algo:'A*',       heuristic:'Chebyshev',  diagonal:false },
    { algo:'A*',       heuristic:'Manhattan',  diagonal:true  },
    { algo:'A*',       heuristic:'Euclidean',  diagonal:true  },
    { algo:'A*',       heuristic:'Chebyshev',  diagonal:true  },
];

async function runBenchmarkMode() {
    const diagAllowed = document.getElementById('benchDiagCheck').checked;
    const combos = BENCH_COMBOS.filter(c => !c.diagonal || diagAllowed);

    // Show bench panel, clear table
    document.getElementById('benchPanel').classList.remove('hidden');
    const tbody = document.getElementById('benchTableBody');
    tbody.innerHTML = '';
    document.getElementById('benchSubtitle').textContent = `${combos.length} configurations · same grid`;
    document.getElementById('benchProgressFill').style.width = '0%';
    document.getElementById('benchProgressText').textContent = `0 / ${combos.length}`;

    updateStatus('BENCHMARKING…','running');
    startTimer();

    const results = [];

    for (let i = 0; i < combos.length; i++) {
        if (stopRequested) break;
        const combo = combos[i];

        // Show progress row (pending)
        addBenchRow(tbody, i+1, combo, null, 'pending');
        setProgress(i, combos.length);
        updateStatus(`BENCH ${i+1}/${combos.length} — ${combo.algo} ${combo.heuristic}`,'running');

        // Reset grid1 visuals (keep walls)
        parents1 = Array.from({length:ROWS1},()=>Array(COLS1).fill(null));
        for(let r=0;r<ROWS1;r++) for(let c=0;c<COLS1;c++)
            if(gridState1[r][c]!==CELL.WALL&&gridState1[r][c]!==CELL.START&&gridState1[r][c]!==CELL.GOAL)
                gridState1[r][c]=CELL.EMPTY;
        drawGrid(1);

        const payload = buildPayload(combo.algo, combo.heuristic, combo.diagonal, 1);
        await initBackend(payload);
        const tStart = Date.now();
        const res = await runAlgoLoop(1, 0); // always MAX speed for bench
        const elapsed = Date.now() - tStart;

        let pathLen = 0;
        if (res.found) pathLen = await drawPath(1, res.goalStep);

        const result = { ...combo, elapsed, visited: res.visited, pathLen, found: res.found, pathCells: res.pathCells || [] };
        results.push(result);

        // Update row with real data
        updateBenchRow(tbody, i, result);
        setProgress(i+1, combos.length);

        await sleep(60); // brief pause so user sees grid
    }

    stopTimer();

    if (!stopRequested) {
        // Rank by: path found first, then pathLen asc, then visited asc, then time asc
        const ranked = [...results].sort((a,b)=>{
            if (a.found !== b.found) return a.found ? -1 : 1;
            if (a.pathLen !== b.pathLen) return a.pathLen - b.pathLen;
            if (a.visited !== b.visited) return a.visited - b.visited;
            return a.elapsed - b.elapsed;
        });
        // Re-render table in ranked order with highlights
        tbody.innerHTML = '';
        ranked.forEach((r, idx) => addBenchRow(tbody, idx+1, r, r, 'done', ranked));
        updateStatus('BENCHMARK COMPLETE','done');
        document.getElementById('benchSubtitle').textContent =
            `Winner: ${ranked[0]?.algo} ${ranked[0]?.heuristic !== 'none' ? '(' + ranked[0].heuristic + ')' : ''} ${ranked[0]?.diagonal?'+ diag':''}`;

        // Draw top-3 paths overlaid on the final grid
        const top3 = ranked.filter(r => r.found && r.pathCells?.length > 0).slice(0, 3);
        await drawBenchOverlay(top3, ranked);    } else {
        updateStatus('STOPPED','error');
    }
}

function setProgress(done, total) {
    document.getElementById('benchProgressFill').style.width = `${Math.round(done/total*100)}%`;
    document.getElementById('benchProgressText').textContent = `${done} / ${total}`;
}

function addBenchRow(tbody, rank, combo, result, status, allRanked) {
    const tr = document.createElement('tr');
    tr.dataset.idx = rank - 1;

    const rankClass = rank<=3 ? `rank-${rank}` : 'rank-n';
    const rankHTML = `<span class="rank-badge ${rankClass}">${rank}</span>`;

    const algoKey = combo.algo === 'BFS' ? 'bfs' : combo.algo === 'Dijkstra' ? 'dijk' : 'astar';
    const algoHTML = `<span class="algo-chip ${algoKey}">${combo.algo}</span>`;

    const heurHTML = combo.heuristic === 'none' ? '<span style="color:var(--text-dim)">—</span>'
        : `<span style="color:var(--accent3);font-size:10px">${combo.heuristic.toUpperCase()}</span>`;

    const diagHTML = combo.diagonal ? `<span style="color:var(--green);font-size:10px">YES</span>`
        : `<span style="color:var(--text-dim);font-size:10px">NO</span>`;

    if (!result || status === 'pending') {
        tr.innerHTML = `<td>${rankHTML}</td><td>${algoHTML}</td><td>${heurHTML}</td><td>${diagHTML}</td>
            <td style="color:var(--text-dim)">…</td><td style="color:var(--text-dim)">…</td>
            <td style="color:var(--text-dim)">…</td><td><span class="status-chip nofound">RUNNING</span></td>`;
    } else {
        // determine best values for highlighting
        const bestTime    = allRanked ? Math.min(...allRanked.filter(r=>r.found).map(r=>r.elapsed)) : null;
        const bestVisited = allRanked ? Math.min(...allRanked.filter(r=>r.found).map(r=>r.visited)) : null;
        const bestPath    = allRanked ? Math.min(...allRanked.filter(r=>r.found&&r.pathLen>0).map(r=>r.pathLen)) : null;

        const isB = v => v !== null && result.found;
        const tClass = isB(bestTime)    && result.elapsed  === bestTime    ? 'class="best-cell"' : '';
        const vClass = isB(bestVisited) && result.visited  === bestVisited ? 'class="best-cell"' : '';
        const pClass = isB(bestPath)    && result.pathLen  === bestPath    ? 'class="best-cell"' : '';

        const statusChip = result.found
            ? '<span class="status-chip found">FOUND</span>'
            : '<span class="status-chip nofound">NO PATH</span>';

        tr.innerHTML = `<td>${rankHTML}</td><td>${algoHTML}</td><td>${heurHTML}</td><td>${diagHTML}</td>
            <td ${tClass}>${result.elapsed}</td>
            <td ${vClass}>${result.visited}</td>
            <td ${pClass}>${result.pathLen || '—'}</td>
            <td>${statusChip}</td>`;
    }
    tbody.appendChild(tr);
}

function updateBenchRow(tbody, idx, result) {
    const row = tbody.children[idx];
    if (!row) return;
    const algoKey = result.algo === 'BFS' ? 'bfs' : result.algo === 'Dijkstra' ? 'dijk' : 'astar';
    const algoHTML = `<span class="algo-chip ${algoKey}">${result.algo}</span>`;
    const heurHTML = result.heuristic === 'none' ? '<span style="color:var(--text-dim)">—</span>'
        : `<span style="color:var(--accent3);font-size:10px">${result.heuristic.toUpperCase()}</span>`;
    const diagHTML = result.diagonal ? `<span style="color:var(--green);font-size:10px">YES</span>`
        : `<span style="color:var(--text-dim);font-size:10px">NO</span>`;
    const statusChip = result.found
        ? '<span class="status-chip found">FOUND</span>'
        : '<span class="status-chip nofound">NO PATH</span>';
    const rankClass = (idx+1)<=3 ? `rank-${idx+1}` : 'rank-n';
    row.innerHTML = `<td><span class="rank-badge ${rankClass}">${idx+1}</span></td>
        <td>${algoHTML}</td><td>${heurHTML}</td><td>${diagHTML}</td>
        <td>${result.elapsed}</td><td>${result.visited}</td>
        <td>${result.pathLen||'—'}</td><td>${statusChip}</td>`;
}

// ============================================
// ALGO LOOP (shared by all modes)
// Returns { found, visited, goalStep, pathCells, elapsed }
// ============================================
async function runAlgoLoop(g, speedKey) {
    let visited = 0;
    const tStart = Date.now();
    const cfg = SPEED_CONFIGS[speedKey] ?? SPEED_CONFIGS[0];

    while (true) {
        if (stopRequested) return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };

        let data;
        try {
            const res = await fetch(`${API}/steps?n=${cfg.batch}`);
            if (!res.ok) throw new Error(`Backend /steps failed: ${res.status}`);
            data = await res.json();
        } catch(e) {
            return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };
        }

        const stepList = data.steps || [];
        let goalStep = null;

        for (const stepObj of stepList) {
            const step = stepObj.step;
            step.state = intoCELL(step.state);

            if (step.state === -2) {
                return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };
            }
            if (step.state === -1) {
                return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };
            }

            // Record parent
            if (step.parent) par(g)[step.row][step.col] = step.parent;

            // Visualize current cell
            const curState = gs(g)[step.row]?.[step.col];
            if (curState !== CELL.START && curState !== CELL.GOAL) {
                visited++;
                setCell(step.col, step.row, CELL.VISITED, g);
                if (cfg.animate) animateReveal(ctx(g), step.col, step.row, CELL.VISITED);
                else             drawCell(ctx(g), step.col, step.row, CELL.VISITED);
                updateLiveHud(visited);
            }

            // Visualize frontiers
            const frontiers = stepObj.cells || [];
            for (const f of frontiers) {
                f.state = intoCELL(f.state);
                const fs = gs(g)[f.row]?.[f.col];
                if (fs !== CELL.START && fs !== CELL.GOAL && fs !== CELL.VISITED) {
                    setCell(f.col, f.row, CELL.FRONTIER, g);
                    if (cfg.animate) animateReveal(ctx(g), f.col, f.row, CELL.FRONTIER);
                    else             drawCell(ctx(g), f.col, f.row, CELL.FRONTIER);
                }
            }

            if (step.state === CELL.GOAL) {
                if (step.parent) par(g)[step.row][step.col] = step.parent;
                goalStep = step;
                break;
            }
        }

        if (goalStep) {
            const pathCells = extractPath(g, goalStep);
            return { found:true, visited, goalStep, pathCells, elapsed: Date.now()-tStart };
        }

        // If backend says done but no goal found
        if (data.done) {
            return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };
        }

        if (cfg.delay > 0) await sleep(cfg.delay);
    }
}

// ============================================
// EXTRACT PATH (no animation, just returns array)
// ============================================
function extractPath(g, goalStep) {
    const p = par(g);
    let { col, row } = goalStep;
    const path = [];
    while (p[row]?.[col]) {
        const prev = p[row][col];
        path.push({ col: prev.col, row: prev.row });
        col = prev.col; row = prev.row;
    }
    path.reverse();
    return path;
}

// ============================================
// DRAW PATH
// ============================================
async function drawPath(g, goalStep) {
    const p = par(g); const s = gs(g); const c = ctx(g);
    let {col, row} = goalStep;
    const path = [];
    while (p[row]?.[col]) {
        const prev = p[row][col];
        path.push(prev);
        col = prev.col; row = prev.row;
    }
    path.reverse();
    for (const pt of path) {
        if (s[pt.row][pt.col] !== CELL.START && s[pt.row][pt.col] !== CELL.GOAL) {
            setCell(pt.col, pt.row, CELL.PATH, g);
            animateReveal(c, pt.col, pt.row, CELL.PATH);
        }
        await sleep(55);
    }
    return path.length;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================
// BENCHMARK OVERLAY — top-3 paths on one grid
// ============================================
async function drawBenchOverlay(top3, allRanked) {
    if (top3.length === 0) return;

    // Reset grid1 to clean state (walls + start + goal only)
    for (let r = 0; r < ROWS1; r++)
        for (let c = 0; c < COLS1; c++)
            if (gridState1[r][c] !== CELL.WALL && gridState1[r][c] !== CELL.START && gridState1[r][c] !== CELL.GOAL)
                gridState1[r][c] = CELL.EMPTY;
    drawGrid(1);

    // Update legend
    renderOverlayLegend(top3, allRanked);

    // Draw each path sequentially, cell by cell, with unique color
    for (let i = 0; i < top3.length; i++) {
        const result = top3[i];
        const color  = BENCH_PATH_COLORS[i];

        for (const cell of result.pathCells) {
            if (gridState1[cell.row][cell.col] === CELL.START ||
                gridState1[cell.row][cell.col] === CELL.GOAL) continue;

            drawBenchPathCell(ctx1, cell.col, cell.row, color.stroke, color.glow);
            await sleep(40);
        }
        await sleep(180); // pause between paths
    }
}

function drawBenchPathCell(ctx, col, row, color, glow) {
    const cs = activeCellSize;
    const x  = col * cs, y = row * cs;
    const margin = Math.max(2, Math.floor(cs * 0.18));

    // Base cell
    ctx.fillStyle = COLORS[CELL.EMPTY];
    ctx.fillRect(x, y, cs, cs);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, cs, cs);

    // Glowing colored square
    ctx.shadowColor = glow;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + margin, y + margin, cs - margin * 2, cs - margin * 2);
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
}

function renderOverlayLegend(top3, allRanked) {
    // Inject legend into bench subtitle area
    const sub = document.getElementById('benchSubtitle');
    const parts = top3.map((r, i) => {
        const col  = BENCH_PATH_COLORS[i];
        const label = r.heuristic !== 'none'
            ? `${r.algo} (${r.heuristic}${r.diagonal ? ' +diag' : ''})`
            : r.algo;
        return `<span class="overlay-legend-dot" style="background:${col.stroke};box-shadow:0 0 6px ${col.glow}"></span>`
             + `<span class="overlay-legend-text" style="color:${col.stroke}">${label}</span>`;
    });
    sub.innerHTML = `<span class="overlay-legend-wrap">${parts.join('<span class="overlay-legend-sep">·</span>')}</span>`;
}