#include "Grid.h"
#include "DijkstraNode.h"
#include "aStarNode.h"
#include <unordered_set>


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
    // Build wall lookup in O(walls) instead of O(cells * walls)
    std::unordered_set<int> wallSet;
    wallSet.reserve(walls.size() * 2);
    for (const auto& w : walls)
        wallSet.insert(w.row * _cols + w.col);

    cells.resize(rows);
    for (int r = 0; r < rows; ++r) {
        cells[r].resize(cols);
        for (int c = 0; c < cols; ++c) {
            CellState state = wallSet.count(r * cols + c) ? CellState::Wall : CellState::Empty;
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


std::vector<Cell*> Grid::getNeighbors(int col, int row) {
    if (!inRange(col, row))
        throw std::out_of_range("Cell coordinates out of range");

    std::vector<Cell*> neighbors;

    if (inRange(col, row - 1))  neighbors.push_back(getCell(col, row - 1));
    if (inRange(col + 1, row))  neighbors.push_back(getCell(col + 1, row));
    if (inRange(col, row + 1))  neighbors.push_back(getCell(col, row + 1));
    if (inRange(col - 1, row))  neighbors.push_back(getCell(col - 1, row));

    return neighbors;
}

void Grid::setCellState(int col, int row, CellState state) {
    if (!inRange(col, row))
        throw std::out_of_range("Cell coordinates out of range");
    cells[row][col]->setState(state);
}

/* ---------- Helper: CellState → string ---------- */
std::string toString(CellState state);

std::string Grid::toJson(const Step& stepCell) const {
    std::ostringstream json;

    json << "{";

    // -------- step object --------
    json << "\"step\": {"
        << "\"col\": " << stepCell.col << ", "
        << "\"row\": " << stepCell.row << ", "
        << "\"state\": \"" << toString(stepCell.state) << "\", "
        << "\"parent\": ";

    if (stepCell.parent.col != -1 && stepCell.parent.row != -1) {
        json << "{ \"col\": " << stepCell.parent.col
            << ", \"row\": " << stepCell.parent.row << " }";
    } else {
        json << "null";
    }

    json << "},";

    // -------- frontier cells (only those in the incremental set) --------
    json << "\"cells\": [";

    bool first = true;
    for (Cell* cell : frontierCells) {
        if (!cell) continue;
        if (!first) json << ",";
        first = false;

        json << "{"
            << "\"col\": " << cell->col << ", "
            << "\"row\": " << cell->row << ", "
            << "\"state\": \"" << toString(cell->state) << "\""
            << "}";
    }

    json << "]";
    json << "}";

    return json.str();
}

void Grid::addFrontier(Cell* cell) {
    frontierCells.insert(cell);
}

void Grid::removeFrontier(Cell* cell) {
    frontierCells.erase(cell);
}
