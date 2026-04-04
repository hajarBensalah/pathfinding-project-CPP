#pragma once

#include "PathFinder.h"
#include <queue>
#include "DijkstraNode.h"



class Dijkstra : public PathFinder {
private:
	Grid& grid;
	Cell* start;
	Cell* goal;
	// Add additional members needed for Dijkstra's algorithm
	bool done = false;
	std::priority_queue<DijkstraNode*, std::vector<DijkstraNode*>, NodeCompare<DijkstraNode>> inWait;

public:
	Dijkstra(Grid& _grid, Cell* _start, Cell* _goal);
	Step step() override;
	bool finished() const override;
};