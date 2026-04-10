import { state } from './state.js';
import { CELL, BENCH_COMBOS } from './constants.js';
import { par, gs, ctx, setCell, sleep } from './grid.js';
import { drawGrid, animateReveal, drawBenchOverlay } from './renderer.js';
import {
    updateStatus, updateSingleStats, enterRunningMode, exitRunningMode,
    updateLiveHud, startTimer, stopTimer, fmtTime,
    addBenchRow, updateBenchRow, setProgress, resetVisuals
} from './ui.js';
import { buildPayload, initBackend, runAlgoLoop } from './api.js';

export async function startVisualization() {
    if (state.isRunning) return;
    resetVisuals();
    state.isRunning = true; state.stopRequested = false;
    document.getElementById('runBtn').disabled  = true;
    document.getElementById('stopBtn').disabled = false;

    const algoLabel = state.mode === 'benchmark' ? 'BENCHMARK'
        : state.selectedAlgo1 === 'A*' ? `A* · ${state.selectedHeur1.toUpperCase()}`
        : state.selectedAlgo1;
    enterRunningMode(algoLabel);

    try {
        if      (state.mode === 'single')    await runSingleMode();
        else if (state.mode === 'compare')   await runCompareMode();
        else if (state.mode === 'benchmark') await runBenchmarkMode();
    } catch(e) {
        console.error(e);
        updateStatus('ERROR — backend offline?','error');
    }

    exitRunningMode();
    state.isRunning = false; state.stopRequested = false;
    document.getElementById('runBtn').disabled  = false;
    document.getElementById('stopBtn').disabled = true;
}

// ============================================
// SINGLE MODE
// ============================================
export async function runSingleMode() {
    const diag = document.getElementById('diagCheck1').checked;
    const payload = buildPayload(state.selectedAlgo1, state.selectedHeur1, diag, 1);
    const label = state.selectedAlgo1 === 'A*' ? `A* (${state.selectedHeur1.toUpperCase()})` : state.selectedAlgo1;
    document.getElementById('gridLabel1').textContent = label;
    await initBackend(payload);
    updateStatus('RUNNING','running');
    startTimer();

    const res = await runAlgoLoop(1, state.selectedSpeed);

    stopTimer();
    if (res.found) {
        updateStatus('PATH FOUND','done');
        const pathLen = await drawPath(1, res.goalStep);
        const elapsed = res.elapsed;
        updateSingleStats({ time: fmtTime(elapsed), visited: res.visited, path: pathLen });
    } else if (!state.stopRequested) {
        updateStatus('NO PATH FOUND','error');
        updateSingleStats({ time: fmtTime(res.elapsed), visited: res.visited, path: 0 });
    }
}

// ============================================
// COMPARE MODE
// ============================================
export async function runCompareMode() {
    const diag1 = document.getElementById('diagCheck1').checked;
    const diag2 = document.getElementById('diagCheck2').checked;
    const lbl1 = state.selectedAlgo1 === 'A*' ? `A* (${state.selectedHeur1})` : state.selectedAlgo1;
    const lbl2 = state.selectedAlgo2 === 'A*' ? `A* (${state.selectedHeur2})` : state.selectedAlgo2;
    document.getElementById('cAlgo1Label').textContent = lbl1.toUpperCase();
    document.getElementById('cAlgo2Label').textContent = lbl2.toUpperCase();
    document.getElementById('compareStats').style.display = '';

    startTimer();
    // RUN A
    updateStatus(`RUNNING ${lbl1}...`,'running');
    document.getElementById('runningHudAlgo').textContent = lbl1.toUpperCase();
    await initBackend(buildPayload(state.selectedAlgo1, state.selectedHeur1, diag1, 1));
    const t1s = Date.now();
    const r1  = await runAlgoLoop(1, state.selectedSpeed);
    const t1  = Date.now() - t1s;
    if (r1.found) await drawPath(1, r1.goalStep);

    if (state.stopRequested) { stopTimer(); return; }

    // RUN B
    updateStatus(`RUNNING ${lbl2}...`,'running');
    document.getElementById('runningHudAlgo').textContent = lbl2.toUpperCase();
    await initBackend(buildPayload(state.selectedAlgo2, state.selectedHeur2, diag2, 2));
    const t2s = Date.now();
    const r2  = await runAlgoLoop(2, state.selectedSpeed);
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
export async function runBenchmarkMode() {
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
        if (state.stopRequested) break;
        const combo = combos[i];

        // Show progress row (pending)
        addBenchRow(tbody, i+1, combo, null, 'pending');
        setProgress(i, combos.length);
        updateStatus(`BENCH ${i+1}/${combos.length} — ${combo.algo} ${combo.heuristic}`,'running');

        // Reset grid1 visuals (keep walls)
        state.parents1 = Array.from({length:state.ROWS1},()=>Array(state.COLS1).fill(null));
        for(let r=0;r<state.ROWS1;r++) for(let c=0;c<state.COLS1;c++)
            if(state.gridState1[r][c]!==CELL.WALL&&state.gridState1[r][c]!==CELL.START&&state.gridState1[r][c]!==CELL.GOAL)
                state.gridState1[r][c]=CELL.EMPTY;

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

    if (!state.stopRequested) {
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
        await drawBenchOverlay(top3, ranked);
    } else {
        updateStatus('STOPPED','error');
    }
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
