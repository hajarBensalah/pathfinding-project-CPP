#include "BFS.h"

BFS::BFS(Grid& _grid, Cell* _start, Cell* _goal) :
    grid(_grid),
    start(_start),
    goal(_goal)
{
    inWait.push(_start);
}

bool BFS::finished() const {
    return done == true;
}

void BFS::addToFrontier(Cell* neighbor) {
    if (inFrontier.find(neighbor) == inFrontier.end()) {
        inWait.push(neighbor);
        inFrontier.insert(neighbor);
    }
}

Step BFS::step() {
    if (inWait.empty()) {
        done = true;
        return Step(-1, -1, CellState::Failure);
    }
    Cell* current = inWait.front();
    inWait.pop();
    if (*current == *goal) {
        done = true;
		Step step(current->col, current->row, CellState::Goal);
		step.parent.col = current->parent ? current->parent->col : -1;
		step.parent.row = current->parent ? current->parent->row : -1;
        return step;
    }
    current->setState(CellState::Visited);
    
    Step step(current->col, current->row, CellState::Visited);
	step.parent.col = current->parent ? current->parent->col : -1;
	step.parent.row = current->parent ? current->parent->row : -1;

    vector<Cell*> neighbors = grid.getNeighbors(current->col, current->row);

    for (Cell* n : neighbors) {
        if (n->state != CellState::Visited && n->isWalkable()) {
            if (!n->parent) {
                n->parent = current;
            }
            n->setState(CellState::Frontier);
            addToFrontier(n);
        }
    }
    return step;
}