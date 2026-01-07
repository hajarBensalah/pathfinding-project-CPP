#include "Grid.h"
#include "DijkstraNode.h"
#include "aStarNode.h"

bool inWalls(int col, int row, const std::vector<Vector2>& walls) {
    for (const auto& wall : walls) {
        if (wall.col == col && wall.row == row) {
            return true;
        }
    }
    return false;
}


Cell* Grid::algoToCell(Algorithme algorithme, int col, int row, CellState state) {
    switch (algorithme) {
        case Algorithme::BFS:
            return new Cell(col, row, state);
        case Algorithme::Dijkstra:
            return new DijkstraNode(col, row, state);
        case Algorithme::Astart:
            return new aStarNode(col, row, state);
        default:
            throw std::invalid_argument("Unknown algorithm");
    }
}

Grid::Grid(int _rows, int _cols, Algorithme algorithme, std::vector<Vector2> walls) : 
    rows(_rows),
    cols(_cols),
    algoType(algorithme) 
{
    // Resize outer vector
    cells.resize(rows);

    for (int r = 0; r < rows; ++r) {
        // Resize inner vector
        cells[r].resize(cols);

        for (int c = 0; c < cols; ++c) {
            // Allocate new Cell and store pointer
			CellState state = inWalls(c, r, walls) ? CellState::Wall : CellState::Empty;
			cells[r][c] = algoToCell(algorithme, c, r, state);
        }
    }
}

Grid::~Grid() {
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            delete cells[i][j];
}



bool Grid::inRange(const int& col, const int& row) const {
    return (row >= 0 && row < rows) && (col >= 0 && col < cols);
}

Cell*& Grid::getCell(int col, int row) {
    if (!inRange(col, row))
        throw std::out_of_range("Cell coordinates out of range");
    return cells[row][col];
}


vector<Cell*> Grid::getNeighbors(int col, int row) {
    if (!inRange(col, row))
        throw std::out_of_range("Cell coordinates out of range");

    vector<Cell*> neighbors;

    if (inRange(col, row - 1)){
        neighbors.push_back(getCell(col, row - 1));
        cout << "adding neighbor :("<<col<<", "<< row - 1<<")" << endl;
    }
    if (inRange(col, row + 1)) {
        neighbors.push_back(getCell(col, row + 1));
        cout << "adding neighbor :(" << col << ", " << row + 1 << ")" << endl;
    }
    if (inRange(col - 1, row)) {
        neighbors.push_back(getCell(col - 1, row));
        cout << "adding neighbor :(" << col - 1 << ", " << row << ")" << endl;
    }
    if (inRange(col + 1, row)) {
        neighbors.push_back(getCell(col + 1, row));
        cout << "adding neighbor :(" << col + 1 << ", " << row << ")" << endl;
    }
    return neighbors;
}

void Grid::setCellState(int col, int row, CellState state) {
    if (!inRange(col, row))
        throw std::out_of_range("Cell coordinates out of range");
	cells[row][col]->setState(state);
}
