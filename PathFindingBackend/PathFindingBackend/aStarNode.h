#pragma once
#include  "Cell.h"

class aStarNode : public Cell {
public:
	int gCost; // Cost from start node to this node
	int hCost; // Heuristic cost from this node to goal node
	aStarNode(int _col, int _row, CellState _state = CellState::Empty) :
		Cell(_col, _row, _state),
		gCost(0),
		hCost(0)
	{
	};
	int fCost() const {
		return gCost + hCost;
	}
	bool operator>(const aStarNode& other) const {
		return this->fCost() > other.fCost();
	}
};
