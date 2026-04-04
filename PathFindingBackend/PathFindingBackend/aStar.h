#pragma once
#include "PathFinder.h"
#include "aStarNode.h"
#include <unordered_set>
#include <cmath>

enum class Heuristic {
    Manhattan,
    Euclidean,
    Chebyshev
};

inline Heuristic toHeuristic(const std::string& s) {
    if (s == "Euclidean") return Heuristic::Euclidean;
    if (s == "Chebyshev") return Heuristic::Chebyshev;
    return Heuristic::Manhattan; // default
}

class aStar : public PathFinder {
private:
    Grid& grid;
    aStarNode* start;
    aStarNode* goal;
    bool diagonalMovement;
    Heuristic heuristicType;

    std::priority_queue<aStarNode*, std::vector<aStarNode*>, NodeCompare<aStarNode>> openSet;
    std::unordered_set<aStarNode*> closedSet;
    std::unordered_set<aStarNode*> inOpenSet;

    double heuristic(aStarNode* a, aStarNode* b);
    bool done = false;

public:
    aStar(Grid& _grid, Cell* _start, Cell* _goal,
        bool diagonal = true,
        Heuristic hType = Heuristic::Manhattan);

    Step step() override;
    bool finished() const override;
    vector<Cell*> getNeighbors(int c, int r);
};