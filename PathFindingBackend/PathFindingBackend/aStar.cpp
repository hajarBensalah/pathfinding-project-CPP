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
	return abs(a->x - b->x) + abs(a->y - b->y); // Manhattan distance
}

Step aStar::step() {
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
	Step step(current->x, current->y, CellState::Visited);
	step.parent.x = current->parent ? current->parent->x : -1;
	step.parent.y = current->parent ? current->parent->y : -1;
	if (*current == *goal) {
		done = true;
		step.state = CellState::Goal;
		return step;
	}

	closedSet.insert(current);

	vector<Cell*> neighbors = grid.getNeighbors(current->x, current->y);

	for (auto n : neighbors) {
		if (n->isWalkable()) {
			aStarNode* neighborNode = dynamic_cast<aStarNode*>(n);
			int tentativeGCost = current->gCost + 1; // Assuming uniform cost for each step
			if (tentativeGCost < neighborNode->gCost) {
				neighborNode->gCost = tentativeGCost;
				neighborNode->hCost = heuristic(neighborNode, goal);
				neighborNode->parent = current;
				neighborNode->setState(CellState::Frontier);
				openSet.push(neighborNode);
			}
		}
	}
	return step;
}