#pragma once
#ifndef GRID_H
#define GRID_H

#include "Cell.h"




class Grid {
public:
    int rows;
    int cols;
    vector<vector<Cell*>> cells;
    Algorithme algoType;

    Grid(int _rows, int _cols, Algorithme algorithme, std::vector<Vector2> walls);
    ~Grid();
    Cell*& getCell(int x, int y);
    bool inRange(int i, int j);
    vector<Cell*> getNeighbors(int i, int j);
    void setCellState(int x, int y, CellState state);
	Cell* algoToCell(Algorithme algorithme, int x, int y, CellState state);
};
#endif