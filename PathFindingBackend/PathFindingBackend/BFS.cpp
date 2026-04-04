#include "BFS.h"

BFS::BFS(Grid& _grid, Cell* _start, Cell* _goal) :
    grid(_grid),
    start(_start),
    goal(_goal)
{
    inWait.push(_start);
    grid.addFrontier(_start);
}

bool BFS::finished() const {
    return done == true;
}

void BFS::addToFrontier(Cell* neighbor) {
    if (inFrontier.find(neighbor) == inFrontier.end()) {
        inWait.push(neighbor);
        inFrontier.insert(neighbor);
        grid.addFrontier(neighbor);
    }
}

Step BFS::step() {
    if (inWait.empty()) {
        done = true;
        return Step(-1, -1, CellState::Failure);
    }

    Cell* current = inWait.front();
    inWait.pop();

    // Current leaves the frontier
    grid.removeFrontier(current);

    Step step(current->col, current->row, CellState::Visited);
    step.parent.col = current->parent ? current->parent->col : -1;
    step.parent.row = current->parent ? current->parent->row : -1;

    if (*current == *goal) {
        done = true;
        step.state = CellState::Goal;
        return step;
    }

    current->setState(CellState::Visited);

    std::vector<Cell*> neighbors = grid.getNeighbors(current->col, current->row);

    for (Cell* n : neighbors) {
        if (n->state != CellState::Visited && n->isWalkable()) {
            if (!n->parent) {
                n->parent = current;
            }
            n->setState(CellState::Frontier);
            addToFrontier(n);
        }
    }

    if (*current == *start) {
        step.state = CellState::Start;
    }

    return step;
}
