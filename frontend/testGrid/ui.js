import { state } from './state.js';
import { CELL } from './constants.js';
import { rows, cols, resizeCanvases, initGridState, syncWallsToGrid2 } from './grid.js';
import { drawGrid } from './renderer.js';

export function setMode(m) {
    if (state.isRunning) return;
    state.mode = m;
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

export function selectAlgo(btn, g) {
    const algo = btn.dataset.algo;
    if (g === 1) {
        state.selectedAlgo1 = algo;
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('gridLabel1').textContent = algo;
        document.getElementById('heuristicBox1').style.display = algo === 'A*' ? '' : 'none';
    } else {
        state.selectedAlgo2 = algo;
        document.querySelectorAll('.algo-btn2').forEach(b => b.classList.remove('active2'));
        btn.classList.add('active2');
        document.getElementById('gridLabel2').textContent = algo;
        document.getElementById('heuristicBox2').style.display = algo === 'A*' ? '' : 'none';
    }
}

export function selectHeuristic(btn, g) {
    const h = btn.dataset.h; // 'Manhattan' | 'Euclidean' | 'Chebyshev'
    if (g === 1) {
        state.selectedHeur1 = h;
        document.querySelectorAll('#heuristicBox1 .heur-btn').forEach(b => b.classList.remove('active','active2'));
        btn.classList.add('active');
        // Chebyshev is designed for diagonal movement — auto-enable it
        if (h === 'Chebyshev') document.getElementById('diagCheck1').checked = true;
    } else {
        state.selectedHeur2 = h;
        document.querySelectorAll('#heuristicBox2 .heur-btn').forEach(b => b.classList.remove('active','active2'));
        btn.classList.add('active2');
        if (h === 'Chebyshev') document.getElementById('diagCheck2').checked = true;
    }
}

export function selectSpeed(btn) {
    state.selectedSpeed = parseInt(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

export function selectTool(btn) {
    state.selectedTool = btn.dataset.tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

export function updateStatus(text, type) {
    document.getElementById('statusText').textContent = text;
    document.getElementById('statusDot').className = 'status-dot' + (type?' '+type:'');
}

export function updateSingleStats(d) {
    document.getElementById('statTime').textContent    = d ? d.time    : '--';
    document.getElementById('statVisited').textContent = d ? d.visited : '--';
    document.getElementById('statPath').textContent    = d ? d.path    : '--';
}

export function enterRunningMode(algoLabel) {
    document.body.classList.add('is-running');
    document.getElementById('runningHudAlgo').textContent = algoLabel;
    document.getElementById('liveVisited').textContent = '0';
    document.getElementById('liveTime').textContent    = '00:00.000';
}

export function exitRunningMode() {
    document.body.classList.remove('is-running');
}

export function updateLiveHud(visited) {
    document.getElementById('liveVisited').textContent = visited;
    if (state.startTime)
        document.getElementById('liveTime').textContent = fmtTime(Date.now() - state.startTime);
}

export function startTimer() {
    state.startTime = Date.now();
    document.getElementById('timerBar').classList.add('visible');
    state.timerInterval = setInterval(()=>{
        document.getElementById('timerDisplay').textContent = fmtTime(Date.now()-state.startTime);
    }, 50);
}

export function stopTimer() {
    clearInterval(state.timerInterval);
    document.getElementById('timerBar').classList.remove('visible');
}

export function getElapsedMs() { return state.startTime ? Date.now()-state.startTime : 0; }

export function fmtTime(ms) {
    return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
}

export function setProgress(done, total) {
    document.getElementById('benchProgressFill').style.width = `${Math.round(done/total*100)}%`;
    document.getElementById('benchProgressText').textContent = `${done} / ${total}`;
}

export function addBenchRow(tbody, rank, combo, result, status, allRanked) {
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

export function updateBenchRow(tbody, idx, result) {
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

export function stopVisualization() {
    state.stopRequested = true;
    document.getElementById('stopBtn').disabled = true;
    updateStatus('STOPPED','error');
}

export function resetVisuals() {
    state.parents1 = Array.from({length:state.ROWS1},()=>Array(state.COLS1).fill(null));
    state.parents2 = Array.from({length:state.ROWS2},()=>Array(state.COLS2).fill(null));
    [[state.gridState1,state.ROWS1,state.COLS1,1],[state.gridState2,state.ROWS2,state.COLS2,2]].forEach(([s,R,C,g])=>{
        if (!s) return;
        for(let r=0;r<R;r++) for(let c=0;c<C;c++)
            if(s[r][c]!==CELL.WALL&&s[r][c]!==CELL.START&&s[r][c]!==CELL.GOAL) s[r][c]=CELL.EMPTY;
        drawGrid(g);
    });
    document.getElementById('runBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

export function resetAll() {
    if (state.isRunning) return;
    stopTimer();
    resetVisuals();
    updateStatus('IDLE','');
    updateSingleStats(null);
}
