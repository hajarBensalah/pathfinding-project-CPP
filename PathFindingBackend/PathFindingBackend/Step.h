#pragma once
#ifndef STEP_H
#define STEP_H

#include "Cell.h"

class Step {
public:
    int col;
    int row;
    CellState state;
	Vector2 parent = { -1, -1 };

    Step(int _col, int _row, CellState _state) :col(_col), row(_row), state(_state)
    {
    }
};

#endif