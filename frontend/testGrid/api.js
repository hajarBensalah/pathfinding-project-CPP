import { state } from './state.js';
import { API, CELL, SPEED_CONFIGS } from './constants.js';
import { gs, par, ctx, rows, cols, setCell, sleep } from './grid.js';
import { drawCell, animateReveal } from './renderer.js';
import { updateLiveHud } from './ui.js';

export function getWalls(g) {
    const s = gs(g); const R=rows(g), C=cols(g); const walls=[];
    for(let r=0;r<R;r++) for(let c=0;c<C;c++) if(s[r][c]===CELL.WALL) walls.push({col:c,row:r});
    return walls;
}

export function buildPayload(algo, heuristic, diagonal, g) {
    return {
        algorithm: algo,
        heuristic: algo === 'A*' ? heuristic : 'none',
        diagonal:  algo === 'A*' ? diagonal  : false,
        rows: rows(g), cols: cols(g),
        start: {col:state.startPos.col, row:state.startPos.row},
        end:   {col:state.goalPos.col,  row:state.goalPos.row},
        walls: getWalls(g)
    };
}

export async function initBackend(payload) {
    const res = await fetch(`${API}/init`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Backend /init failed: ${res.status}`);
}

export function intoCELL(s) {
    return {Empty:CELL.EMPTY,Wall:CELL.WALL,Start:CELL.START,Goal:CELL.GOAL,
            Visited:CELL.VISITED,Path:CELL.PATH,Frontier:CELL.FRONTIER,
            Failure:-1,Done:-2}[s] ?? CELL.EMPTY;
}

// ============================================
// ALGO LOOP (shared by all modes)
// Returns { found, visited, goalStep, pathCells, elapsed }
// ============================================
export async function runAlgoLoop(g, speedKey) {
    let visited = 0;
    const tStart = Date.now();
    const cfg = SPEED_CONFIGS[speedKey] ?? SPEED_CONFIGS[0];

    while (true) {
        if (state.stopRequested) return { found:false, visited, goalStep:null, pathCells:[], elapsed: Date.now()-tStart };

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

            // Visualize frontiers — always drawn directly, never animated.
            // Frontier cells are 2-4× more numerous than visited cells per step;
            // animating them causes rAF loop accumulation and visible lag.
            const frontiers = stepObj.cells || [];
            for (const f of frontiers) {
                f.state = intoCELL(f.state);
                const fs = gs(g)[f.row]?.[f.col];
                if (fs !== CELL.START && fs !== CELL.GOAL && fs !== CELL.VISITED) {
                    setCell(f.col, f.row, CELL.FRONTIER, g);
                    drawCell(ctx(g), f.col, f.row, CELL.FRONTIER);
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

        if      (cfg.delay    > 0) await sleep(cfg.delay);
        else if (cfg.throttle)    await new Promise(requestAnimationFrame);
    }
}

// ============================================
// EXTRACT PATH (no animation, just returns array)
// ============================================
export function extractPath(g, goalStep) {
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
