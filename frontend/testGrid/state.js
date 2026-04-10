import { CELL_SIZE } from './constants.js';

export const state = {
    mode:          'single',
    selectedAlgo1: 'BFS',
    selectedAlgo2: 'Dijkstra',
    selectedHeur1: 'Manhattan',
    selectedHeur2: 'Manhattan',
    selectedSpeed: 20,
    selectedTool:  'wall',
    isRunning:     false,
    stopRequested: false,
    drawingWalls:  false,

    canvas1: null, ctx1: null, COLS1: 0, ROWS1: 0, gridState1: null, parents1: null,
    canvas2: null, ctx2: null, COLS2: 0, ROWS2: 0, gridState2: null, parents2: null,

    activeCellSize: CELL_SIZE,
    startPos:       null,
    goalPos:        null,
    draggingWhat:   null,
    timerInterval:  null,
    startTime:      null,
};
