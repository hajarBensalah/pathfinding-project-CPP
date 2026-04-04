#include "aStar.h"

aStar::aStar(Grid& _grid, Cell* _start, Cell* _goal, bool diagonal, Heuristic hType) :
    grid(_grid),
    start(static_cast<aStarNode*>(_start)),
    goal(static_cast<aStarNode*>(_goal)),
    diagonalMovement(diagonal),
    heuristicType(hType)
{
    openSet.push(start);
    grid.addFrontier(start);
}

bool aStar::finished() const {
    return this->done == true;
}

double aStar::heuristic(aStarNode* a, aStarNode* b) {
    int dx = abs(a->col - b->col);
    int dy = abs(a->row - b->row);

    switch (heuristicType) {
    case Heuristic::Euclidean:
        return std::sqrt((double)(dx * dx + dy * dy));
    case Heuristic::Chebyshev:
        return std::max(dx, dy);
    case Heuristic::Manhattan:
    default:
        return dx + dy;
    }
}

std::vector<Cell*> aStar::getNeighbors(int c, int r) {
    std::vector<Cell*> neighbors = grid.getNeighbors(c, r);
    if (!diagonalMovement) {
        return neighbors;
    }

    auto free = [&](int x, int y) {
        return grid.inRange(x, y) && grid.getCell(x, y)->isWalkable();
    };

    // ↖ top-left
    if (free(c, r - 1) && free(c - 1, r))
        neighbors.push_back(grid.getCell(c - 1, r - 1));
    // ↗ top-right
    if (free(c, r - 1) && free(c + 1, r))
        neighbors.push_back(grid.getCell(c + 1, r - 1));
    // ↘ bottom-right
    if (free(c, r + 1) && free(c + 1, r))
        neighbors.push_back(grid.getCell(c + 1, r + 1));
    // ↙ bottom-left
    if (free(c, r + 1) && free(c - 1, r))
        neighbors.push_back(grid.getCell(c - 1, r + 1));

    return neighbors;
}

Step aStar::step() {
    if (done) {
        return Step(-1, -1, CellState::Failure);
    }

    aStarNode* current = nullptr;
    while (!openSet.empty()) {
        current = openSet.top();
        openSet.pop();
        if (current->getState() == CellState::Visited)
            continue;
        break;
    }

    if (!current) {
        done = true;
        return Step(-1, -1, CellState::Failure);
    }

    // Current leaves the frontier
    grid.removeFrontier(current);

    if (*current == *start)
        current->gCost = 0;

    Step step(current->col, current->row, CellState::Visited);
    step.parent.col = current->parent ? current->parent->col : -1;
    step.parent.row = current->parent ? current->parent->row : -1;

    if (*current == *goal) {
        done = true;
        step.state = CellState::Goal;
        return step;
    }

    closedSet.insert(current);

    std::vector<Cell*> neighbors = getNeighbors(current->col, current->row);

    for (Cell* n : neighbors) {
        aStarNode* neighbor = static_cast<aStarNode*>(n);
        if (!neighbor->isWalkable()) continue;
        if (closedSet.count(neighbor)) continue;

        double tentativeG = current->gCost;
        if (neighbor->isDiagonalTo(*current))
            tentativeG += std::sqrt(2);
        else
            tentativeG++;

        if (tentativeG < neighbor->gCost) {
            bool wasInFrontier = (neighbor->getState() == CellState::Frontier);
            neighbor->parent = current;
            neighbor->gCost  = tentativeG;
            neighbor->hCost  = heuristic(neighbor, goal);
            neighbor->setState(CellState::Frontier);
            if (inOpenSet.count(neighbor) == 0) {
                openSet.push(neighbor);
                inOpenSet.insert(neighbor);
            }
            if (!wasInFrontier)
                grid.addFrontier(neighbor);
        }
    }

    if (*current == *start)
        step.state = CellState::Start;

    return step;
}
