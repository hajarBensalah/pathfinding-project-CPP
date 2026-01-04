#pragma once
#ifndef STEP_H
#define STEP_H

#include "Cell.h"

class Step {
public:
    int x;
    int y;
    CellState state;
	Vector2 parent = { -1, -1 };

    Step(int _x, int _y, CellState _state) :x(_x), y(_y), state(_state)
    {
    }
};

#endif