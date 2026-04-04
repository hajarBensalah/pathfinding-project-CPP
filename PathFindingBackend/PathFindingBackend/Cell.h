#pragma once

#include <iostream>
#include "Vector2.h"
#include <vector>
#include <stdexcept>
#include <queue>

enum class CellState{
    Empty,
    Wall,
    Start,
    Goal,
    Frontier,
    Visited,
    Failure,
    Path,
    Done
};





enum class Algorithme {
    BFS,
    Dijkstra,
    Astart
};

template<class T>
struct NodeCompare {
    bool operator()(T* a, T* b) const {
        return *a > *b; // min-heap
    }
};


class Cell {
public:
    int col;
    int row;
    CellState state;
    Cell* parent;

    Cell(int _col, int _row, CellState _state = CellState::Empty) :
        col(_col),
        row(_row),
        state(_state),
        parent(nullptr)
    {
    };
    virtual ~Cell() = default;

    void setState(CellState _state);
    CellState getState() const;
    bool isWalkable() const;
    bool isDiagonalTo(const Cell& c) const;
    bool operator==(const Cell& c) const;
    bool operator!=(const Cell& c) const;
};
