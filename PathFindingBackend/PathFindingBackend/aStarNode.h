#pragma once
#include <climits>
#include "Cell.h"

class aStarNode : public Cell {
public:
	double gCost; // Cost from start node to this node
	double hCost; // Heuristic cost from this node to goal node
	aStarNode(int _col, int _row, CellState _state = CellState::Empty) :
		Cell(_col, _row, _state),
		gCost(INT_MAX),
		hCost(0)
	{
	};
	double fCost() const {
		return gCost + hCost;
	}
	bool operator>(const aStarNode& other) const {
		return this->fCost() > other.fCost();
	}
	friend std::ostream& operator<<(std::ostream& os, const aStarNode& n) {
		os << "Node("
			<< "col=" << n.col
			<< ", row=" << n.row
			<< ", g=" << n.gCost
			<< ", h=" << n.hCost
			<< ", f=" << n.fCost()
			<< ")";
		return os;
	}
};
