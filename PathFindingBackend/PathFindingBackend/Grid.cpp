#include "Grid.h"
#include "DijkstraNode.h"
#include "aStarNode.h"

bool inWalls(int x, int y, const std::vector<Vector2>& walls) {
    for (const auto& wall : walls) {
        if (wall.x == x && wall.y == y) {
            return true;
        }
    }
    return false;
}


Cell* Grid::algoToCell(Algorithme algorithme, int x, int y, CellState state) {
    switch (algorithme) {
        case Algorithme::BFS:
            return new Cell(x, y, state);
        case Algorithme::Dijkstra:
            return new DijkstraNode(x, y, state);
        case Algorithme::Astart:
            return new aStarNode(x, y, state);
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

    for (int i = 0; i < rows; ++i) {
        // Resize inner vector
        cells[i].resize(cols);

        for (int j = 0; j < cols; ++j) {
            // Allocate new Cell and store pointer
			CellState state = inWalls(i, j, walls) ? CellState::Wall : CellState::Empty;
			cells[i][j] = algoToCell(algorithme, i, j, state);
        }
    }
}

Grid::~Grid() {
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            delete cells[i][j];
}



bool Grid::inRange(int i, int j) {
    return (i >= 0 && i < rows) && (j >= 0 && j < cols);
}

Cell*& Grid::getCell(int x, int y) {
    if (!inRange(x, y))
        throw std::out_of_range("Cell coordinates out of range");
    return cells[x][y];
}


vector<Cell*> Grid::getNeighbors(int i, int j) {
    if (!inRange(i, j))
        throw std::out_of_range("Cell coordinates out of range");

    vector<Cell*> neighbors;

    if (inRange(i - 1, j))
        neighbors.push_back(getCell(i - 1, j));
    if (inRange(i + 1, j))
        neighbors.push_back(getCell(i + 1, j));
    if (inRange(i, j - 1))
        neighbors.push_back(getCell(i, j - 1));
    if (inRange(i, j + 1))
        neighbors.push_back(getCell(i, j + 1));
    return neighbors;
}

void Grid::setCellState(int x, int y, CellState state) {
    if (!inRange(x, y))
        throw std::out_of_range("Cell coordinates out of range");
	cells[x][y]->setState(state);
}
