const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

const rows = 10;
const cols = 10;
const cellSize = canvas.width / cols;

// =======================
// COLORS
// =======================
const colors = {
    Empty: "#ffffff",
    Wall: "#000000",
    Start: "#007bff",
    Visited: "#cccccc",
    Goal: "#28a745",
    Path: "#ffc107",
    Failure: "#ff0000"
};

// =======================
// GRID STATE
// =======================
let gridStates = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "Empty")
);

let parents = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
);

// =======================
// ANIMATED CELL
// =======================
class AnimatedCell {
    constructor(cx, cy, color) {
        this.cx = cx;
        this.cy = cy;
        this.color = color;
        this.size = 0;
        this.maxSize = cellSize;
    }

    draw() {
        if (this.size > this.maxSize) return;

        ctx.clearRect(
            this.cx - this.maxSize / 2 - 1,
            this.cy - this.maxSize / 2 - 1,
            this.maxSize + 2,
            this.maxSize + 2
        );

        const x = this.cx - this.size / 2;
        const y = this.cy - this.size / 2;

        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size, this.size);

        ctx.strokeStyle = "#999";
        ctx.strokeRect(
            this.cx - this.maxSize / 2,
            this.cy - this.maxSize / 2,
            this.maxSize,
            this.maxSize
        );

        this.size += 5;
        requestAnimationFrame(() => this.draw());
    }
}

// =======================
// HELPERS
// =======================
function cellCenter(x, y) {
    return {
        cx: y * cellSize + cellSize / 2,
        cy: x * cellSize + cellSize / 2
    };
}

function animateCell(x, y, state) {
    const { cx, cy } = cellCenter(x, y);
    const anim = new AnimatedCell(cx, cy, colors[state]);
    anim.draw();
}

// =======================
// DRAW STATIC GRID ONCE
// =======================
function drawInitialGrid() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            ctx.fillStyle = colors[gridStates[i][j]];
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            ctx.strokeStyle = "#999";
            ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
    }
}

// =======================
// APPLY STEP FROM BACKEND
// =======================
function applyStep(step) {
    const { x, y, state, parent } = step;

    if (parent) {
        parents[x][y] = parent;
    }

    if (gridStates[x][y] === "Goal") return;

    gridStates[x][y] = state;
    animateCell(x, y, state);
}

// =======================
// FIND PATH
// =======================
function drawPath(goal) {
    let { x, y } = goal;

    while (parents[x][y]) {
        const p = parents[x][y];
        if (gridStates[x][y] !== "Start" && gridStates[x][y] !== "Goal") {
            animateCell(x, y, "Path");
        }
        x = p.x;
        y = p.y;
    }
}

// =======================
// INIT (POST)
// =======================
const payload = {
    algorithm: "Dijkstra",
    rows,
    cols,
    start: { x: 0, y: 0 },
    end: { x: 8, y: 8 },
    walls: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 }
    ]
};

async function init() {
    // draw static grid
    drawInitialGrid();

    // local visualization
    animateCell(0, 0, "Start");
    animateCell(8, 8, "Goal");

    payload.walls.forEach(w => {
        gridStates[w.x][w.y] = "Wall";
        animateCell(w.x, w.y, "Wall");
    });

    // backend init
    await fetch("http://localhost:8080/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

// =======================
// STEP LOOP
// =======================
async function runSteps(delay = 50) {
    while (true) {
        const res = await fetch("http://localhost:8080/step");
        const step = await res.json();

        if (step.state === "done") break;

        applyStep(step);

        if (step.state === "Goal") {
            drawPath(step);
            break;
        }

        await new Promise(r => setTimeout(r, delay));
    }
}

// =======================
// START
// =======================
init().then(() => runSteps());
