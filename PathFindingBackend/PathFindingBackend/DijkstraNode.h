#pragma once

#include <climits>
#include "Cell.h"


class DijkstraNode : public Cell {
	public:
	int cost;
	DijkstraNode(int _col, int _row, CellState _state = CellState::Empty) :
		Cell(_col, _row, _state),
		cost(INT_MAX)
	{
	};

	bool operator>(const DijkstraNode& other) const {
		return this->cost > other.cost;
	}
};