/* ================= CANVAS SETUP ================= */
const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

const rows = 10;
const cols = 10;
const cellSize = canvas.width / cols;

/* ================= COLORS ================= */
const colors = {
    Empty: "#ffffff",
    Wall: "#000000",
    Start: "#007bff",
    Frontier: "#17a2b8",
    Visited: "#cccccc",
    Goal: "#28a745",
    Path: "#ffc107",
    Failure: "#ff0000"
};

/* ================= CELL ================= */
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = "Empty";
    }

    draw() {
        ctx.fillStyle = colors[this.state];
        ctx.fillRect(
            this.y * cellSize,
            this.x * cellSize,
            cellSize,
            cellSize
        );

        ctx.strokeStyle = "#999";
        ctx.strokeRect(
            this.y * cellSize,
            this.x * cellSize,
            cellSize,
            cellSize
        );
    }
}

/* ================= GRID ================= */
const cells = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => new Cell(i, j))
);

/* ================= DRAW ================= */
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            cells[i][j].draw();
        }
    }
}

/* ================= APPLY BACKEND STEP ================= */
function applyStep(step) {
    const { x, y, state } = step;
    if (x < 0 || y < 0) return;
    cells[x][y].state = state;
}

/* ================= WALLS ================= */
const walls = [
    {x:2,y:2},{x:2,y:3},{x:2,y:4},{x:2,y:5},
    {x:3,y:2},{x:4,y:2},{x:5,y:2}
];

walls.forEach(w => cells[w.x][w.y].state = "Wall");

/* ================= PAYLOAD ================= */
const payload = {
    algorithm: "BFS",
    rows,
    cols,
    start: { x: 0, y: 0 },
    end: { x: 8, y: 8 },
    walls
};

/* ================= INIT BACKEND ================= */
async function init() {
    cells[payload.start.x][payload.start.y].state = "Start";
    cells[payload.end.x][payload.end.y].state = "Goal";

    await fetch("http://localhost:8080/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

/* ================= RUN ALGORITHM ================= */
async function runSteps(delay = 200) {
    while (true) {
        const res = await fetch("http://localhost:8080/step");
        const step = await res.json();

        if (step.state === "done") break;

        applyStep(step);
        await new Promise(r => setTimeout(r, delay));
    }
}

/* ================= MAIN LOOP ================= */
function animate() {
    drawGrid();
    requestAnimationFrame(animate);
}

/* ================= START ================= */
animate();
init().then(() => runSteps());
