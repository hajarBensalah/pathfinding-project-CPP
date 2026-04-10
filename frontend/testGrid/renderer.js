import { state } from './state.js';
import { CELL, BG_COLOR, COLORS, BENCH_PATH_COLORS } from './constants.js';
import { gs, ctx, rows, cols, sleep } from './grid.js';

// Cancellation tokens — keyed by "<canvasIndex>_<col>_<row>".
// When animateReveal is called for a cell that is already animating, the old
// animation's token is marked done so its rAF loop exits on the next tick.
const _animTokens = new Map();

export function drawGrid(g) {
    const c = ctx(g); const R = rows(g); const C = cols(g); const s = gs(g);
    if (!c || !s) return;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    for (let r = 0; r < R; r++)
        for (let cc = 0; cc < C; cc++)
            drawCell(c, cc, r, s[r][cc]);
}

export function drawCell(c, col, row, cellState) {
    const cs = state.activeCellSize;
    const x = col * cs, y = row * cs;
    const cx = x + cs / 2, cy = y + cs / 2;
    const gap = cs > 10 ? 1.5 : 1;
    const rx = x + gap, ry = y + gap;
    const rw = cs - gap * 2, rh = cs - gap * 2;
    const radius = Math.max(2, cs * 0.15);

    // Paint background slot
    c.shadowBlur = 0;
    c.fillStyle = BG_COLOR;
    c.fillRect(x, y, cs, cs);

    switch (cellState) {
        case CELL.EMPTY:
            // Subtle dot at center to show the grid exists
            c.fillStyle = "rgba(255,255,255,0.04)";
            c.beginPath();
            c.arc(cx, cy, 1, 0, Math.PI * 2);
            c.fill();
            break;

        case CELL.WALL:
            c.fillStyle = COLORS[CELL.WALL];
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            // Subtle top-edge highlight
            c.fillStyle = "rgba(255,255,255,0.05)";
            c.fillRect(rx + 2, ry + 1, rw - 4, 1);
            break;

        case CELL.VISITED:
            c.fillStyle = "rgba(59,91,219,0.72)";
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            // Inner highlight top
            c.fillStyle = "rgba(255,255,255,0.06)";
            c.fillRect(rx + 2, ry + 1, rw - 4, 1);
            break;

        case CELL.FRONTIER:
            c.shadowColor = COLORS[CELL.FRONTIER]; c.shadowBlur = 12;
            c.fillStyle = COLORS[CELL.FRONTIER];
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            c.shadowBlur = 0;
            // Bright center dot
            c.fillStyle = "rgba(255,255,255,0.4)";
            c.beginPath();
            c.arc(cx, cy, cs * 0.12, 0, Math.PI * 2);
            c.fill();
            break;

        case CELL.PATH:
            c.shadowColor = COLORS[CELL.PATH]; c.shadowBlur = 18;
            c.fillStyle = COLORS[CELL.PATH];
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            c.shadowBlur = 0;
            // Inner glow stripe
            c.fillStyle = "rgba(255,255,255,0.2)";
            c.fillRect(rx + 2, ry + 1, rw - 4, 2);
            break;

        case CELL.START: {
            // Tinted tile background
            c.fillStyle = "rgba(16,217,160,0.12)";
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            // Arrow pointing right
            c.shadowColor = COLORS[CELL.START]; c.shadowBlur = 16;
            c.fillStyle = COLORS[CELL.START];
            c.beginPath();
            c.moveTo(x + cs * 0.22, y + cs * 0.2);
            c.lineTo(x + cs * 0.78, y + cs * 0.5);
            c.lineTo(x + cs * 0.22, y + cs * 0.8);
            c.closePath();
            c.fill();
            c.shadowBlur = 0;
            break;
        }

        case CELL.GOAL: {
            // Tinted tile background
            c.fillStyle = "rgba(244,63,94,0.12)";
            c.beginPath();
            c.roundRect(rx, ry, rw, rh, radius);
            c.fill();
            // Outer ring
            c.shadowColor = COLORS[CELL.GOAL]; c.shadowBlur = 16;
            c.strokeStyle = COLORS[CELL.GOAL];
            c.lineWidth = Math.max(1, cs * 0.08);
            c.beginPath();
            c.arc(cx, cy, cs * 0.3, 0, Math.PI * 2);
            c.stroke();
            // Inner filled dot
            c.fillStyle = COLORS[CELL.GOAL];
            c.beginPath();
            c.arc(cx, cy, cs * 0.12, 0, Math.PI * 2);
            c.fill();
            c.shadowBlur = 0;
            break;
        }
    }
    c.shadowBlur = 0;
}

export function animateReveal(c, col, row, cellState) {
    // Cancel any in-progress animation for this cell so stale rAF loops don't accumulate
    const key = `${c === state.ctx1 ? 1 : 2}_${col}_${row}`;
    const prev = _animTokens.get(key);
    if (prev) prev.done = true;
    const token = { done: false };
    _animTokens.set(key, token);

    const cs = state.activeCellSize;
    const x = col*cs, y = row*cs;
    const cx = x + cs/2, cy = y + cs/2;
    // Circle expands from center until it fills the cell corner-to-corner
    const maxR = cs * 0.72;
    let r = 1;
    const step = maxR / 5;
    function frame() {
        if (token.done) return;
        r = Math.min(r + step, maxR);
        // Clear slot
        c.fillStyle = BG_COLOR;
        c.fillRect(x, y, cs, cs);
        // Clipped expanding circle — shadowBlur intentionally omitted here;
        // it is expensive inside a rAF loop. The glow appears via drawCell at the end.
        c.save();
        c.beginPath(); c.rect(x, y, cs, cs); c.clip();
        c.fillStyle = COLORS[cellState] || COLORS[CELL.VISITED];
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.restore();
        if (r < maxR) {
            requestAnimationFrame(frame);
        } else {
            _animTokens.delete(key);
            drawCell(c, col, row, cellState);
        }
    }
    requestAnimationFrame(frame);
}

export function drawBenchPathCell(ctx, col, row, color, glow) {
    const cs = state.activeCellSize;
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

export async function drawBenchOverlay(top3, allRanked) {
    if (top3.length === 0) return;

    // Reset grid1 to clean state (walls + start + goal only)
    for (let r = 0; r < state.ROWS1; r++)
        for (let c = 0; c < state.COLS1; c++)
            if (state.gridState1[r][c] !== CELL.WALL && state.gridState1[r][c] !== CELL.START && state.gridState1[r][c] !== CELL.GOAL)
                state.gridState1[r][c] = CELL.EMPTY;
    drawGrid(1);

    // Update legend
    renderOverlayLegend(top3, allRanked);

    // Draw each path sequentially, cell by cell, with unique color
    for (let i = 0; i < top3.length; i++) {
        const result = top3[i];
        const color  = BENCH_PATH_COLORS[i];

        for (const cell of result.pathCells) {
            if (state.gridState1[cell.row][cell.col] === CELL.START ||
                state.gridState1[cell.row][cell.col] === CELL.GOAL) continue;

            drawBenchPathCell(state.ctx1, cell.col, cell.row, color.stroke, color.glow);
            await sleep(40);
        }
        await sleep(180); // pause between paths
    }
}

export function renderOverlayLegend(top3, allRanked) {
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
