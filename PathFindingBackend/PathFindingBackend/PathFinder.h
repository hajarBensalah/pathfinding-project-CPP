#pragma once
#include "Grid.h"
#include "Step.h"

class PathFinder {
public:
    virtual Step step() = 0;
    virtual bool finished() const = 0;
    virtual ~PathFinder() = default;
    /* ----------Algorithme → PathFinder---------- */
	static PathFinder* createPathFinder(Algorithme algorithme, Grid& grid, Cell* start, Cell* goal);
};

