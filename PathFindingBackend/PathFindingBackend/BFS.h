#pragma once
#ifndef BFS_H
#define BFS_H

#include "PathFinder.h"
#include <unordered_set>

class BFS : public PathFinder {
private:
    Grid& grid;
    Cell* start;
    Cell* goal;
    std::queue<Cell*> inWait;
    bool done = false;
    std::unordered_set<Cell*> inFrontier;

public:
    BFS(Grid& _grid, Cell* _start, Cell* _goal);

    Step step() override;
    bool finished() const override;
    void addToFrontier(Cell* neighbor);
};


#endif