#include "aStar.h"


aStar::aStar(Grid& _grid, Cell* _start, Cell* _goal) :
	grid(_grid),
	start(dynamic_cast<aStarNode*>(_start)),
	goal(dynamic_cast<aStarNode*>(_goal))
{
	openSet.push(start);
}

bool aStar::finished() const {
	return this->done == true;
}

int aStar::heuristic(aStarNode* a, aStarNode* b) {
	return abs(a->col - b->col) + abs(a->row - b->row); // Manhattan distance
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
		cout << "get out from !current step("<< endl;
		return Step(-1, -1, CellState::Failure);
	}

	Step step(current->col, current->row, CellState::Visited);

	step.parent.col = current->parent ? current->parent->col : -1;
	step.parent.row = current->parent ? current->parent->row : -1;

	if (*current == *goal) {
		done = true;
		step.state = CellState::Goal;
		return step;
	}

	closedSet.insert(current);

	vector<Cell*> neighbors = grid.getNeighbors(current->col, current->row);

    for (Cell* n : neighbors) {
        aStarNode* neighbor = dynamic_cast<aStarNode*>(n);
        if (!neighbor) continue;

        if (!neighbor->isWalkable()) continue;
        if (closedSet.count(neighbor)) continue;

        int tentativeG = current->gCost + 1;

        if (tentativeG < neighbor->gCost) {
            neighbor->parent = current;
            neighbor->gCost = tentativeG;
            neighbor->hCost = heuristic(neighbor, goal);
            neighbor->setState(CellState::Frontier);

            if (inOpenSet.count(neighbor) == 0) {
                openSet.push(neighbor);
                inOpenSet.insert(neighbor);
            }
        }
    }

    if (*current == *start) {
        step.state = CellState::Start;
    }
	return step;
}