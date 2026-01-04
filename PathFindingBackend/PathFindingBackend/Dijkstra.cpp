#include "Dijkstra.h"

Dijkstra::Dijkstra(Grid& _grid, Cell* _start, Cell* _goal) :
	grid(_grid),
	start(_start),
	goal(_goal)
{
	DijkstraNode* startNode = dynamic_cast<DijkstraNode*>(start);
	startNode->cost = 0;
	inWait.push(startNode);
}

bool Dijkstra::finished() const {
	return this->done == true;
}


Step Dijkstra::step() {
	DijkstraNode* current = nullptr;
	while (!inWait.empty()) {
		current = inWait.top();
		inWait.pop();

		if (current->getState() == CellState::Visited)
			continue; // outdated entry

		// process current
		break;
	}
	if (!current) {
		done = true;
		return Step(-1, -1, CellState::Failure);
	}

	if (*current == *goal) {
		done = true;
		Step step(current->x, current->y, CellState::Goal);
		step.parent.x = current->parent ? current->parent->x : -1;
		step.parent.y = current->parent ? current->parent->y : -1;
		return step;
	}
	current->setState(CellState::Visited);
	Step step(current->x, current->y, CellState::Visited);
	step.parent.x = current->parent ? current->parent->x : -1;
	step.parent.y = current->parent ? current->parent->y : -1;

	vector<Cell*> neighbors = grid.getNeighbors(current->x, current->y);

	for (auto n : neighbors) {
		if(n->isWalkable() && n->getState() != CellState::Visited) {
			DijkstraNode* neighborNode = dynamic_cast<DijkstraNode*>(n);
			int newCost = current->cost + 1; // Assuming uniform cost for each step
			if (newCost < neighborNode->cost) {
				neighborNode->cost = newCost;
				neighborNode->parent = current;
				neighborNode->setState(CellState::Frontier);
				inWait.push(neighborNode);
			}
		}
	}
	return step;
}