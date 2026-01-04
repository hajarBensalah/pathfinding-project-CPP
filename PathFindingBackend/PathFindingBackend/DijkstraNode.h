#pragma once

#include "Cell.h"


class DijkstraNode : public Cell {
	public:
	int cost;
	DijkstraNode(int _x, int _y, CellState _state = CellState::Empty) :
		Cell(_x, _y, _state),
		cost(INT_MAX)
	{
	};

	bool operator>(const DijkstraNode& other) const {
		return this->cost > other.cost;
	}
};