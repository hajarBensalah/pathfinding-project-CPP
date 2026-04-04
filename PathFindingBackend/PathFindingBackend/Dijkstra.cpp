#include "Dijkstra.h"

Dijkstra::Dijkstra(Grid& _grid, Cell* _start, Cell* _goal) :
	grid(_grid),
	start(_start),
	goal(_goal)
{
	DijkstraNode* startNode = static_cast<DijkstraNode*>(start);
	startNode->cost = 0;
	inWait.push(startNode);
	grid.addFrontier(startNode);
}

bool Dijkstra::finished() const {
	return this->done == true;
}


Step Dijkstra::step() {
	if (done) {
		return Step(-1, -1, CellState::Done);
	}

	DijkstraNode* current = nullptr;

	while (!inWait.empty()) {
		current = inWait.top();
		inWait.pop();

		if (current->getState() == CellState::Visited)
			continue; // outdated entry

		break;
	}

	if (!current) {
		done = true;
		return Step(-1, -1, CellState::Failure);
	}

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

	for (auto n : neighbors) {
		if (n->isWalkable() && n->getState() != CellState::Visited) {
			DijkstraNode* neighborNode = static_cast<DijkstraNode*>(n);

			int newCost = current->cost + 1;

			if (newCost < neighborNode->cost) {
				bool wasInFrontier = (neighborNode->getState() == CellState::Frontier);
				neighborNode->cost = newCost;
				neighborNode->parent = current;
				neighborNode->setState(CellState::Frontier);
				inWait.push(neighborNode);
				if (!wasInFrontier)
					grid.addFrontier(neighborNode);
			}
		}
	}

	if (*current == *start) {
		step.state = CellState::Start;
	}

	return step;
}
