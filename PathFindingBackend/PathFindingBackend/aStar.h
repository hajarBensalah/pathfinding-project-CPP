#pragma once
#include "PathFinder.h"
#include "aStarNode.h"
#include<unordered_set>

class aStar : public PathFinder {
private:
	Grid& grid;
	aStarNode* start;
	aStarNode* goal;
	std::priority_queue<aStarNode*, std::vector<aStarNode*>, NodeCompare<aStarNode>> openSet;
	std::unordered_set<aStarNode*> closedSet;

	int heuristic(aStarNode* a, aStarNode* b);
	bool done = false;
public:
	aStar(Grid& _grid, Cell* _start, Cell* _goal);
	Step step() override;
	bool finished() const override;
};


