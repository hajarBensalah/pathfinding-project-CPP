#pragma once
#include "Grid.h"
#include "Step.h"
#include <string>

class PathFinder {
public:
    virtual Step step() = 0;
    virtual bool finished() const = 0;
    virtual ~PathFinder() = default;

    // diagonal and heuristic only used by A*
    static PathFinder* createPathFinder(
        Algorithme algorithme,
        Grid& grid,
        Cell* start,
        Cell* goal,
        bool diagonal = true,
        const std::string& heuristic = "Manhattan"
    );
};