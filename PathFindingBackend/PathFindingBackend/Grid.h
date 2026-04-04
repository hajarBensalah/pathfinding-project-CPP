#pragma once
#ifndef GRID_H
#define GRID_H

#include "Cell.h"
#include <sstream>
#include <unordered_set>
#include "Step.h"



class Grid {
public:
    int rows;
    int cols;
    std::vector<std::vector<Cell*>> cells;
    Algorithme algoType;

    // Incremental frontier set — updated by algorithms, read by toJson()
    std::unordered_set<Cell*> frontierCells;

    Grid(int _rows, int _cols, Algorithme algorithme, std::vector<Vector2> walls);
    ~Grid();
    Cell*& getCell(int col, int row);
    bool inRange(const int& col, const int& row) const;
    std::vector<Cell*> getNeighbors(int c, int r);
    void setCellState(int col, int row, CellState state);
    Cell* algoToCell(Algorithme algorithme, int col, int row, CellState state);
    std::string toJson(const Step& stepCell) const;

    void addFrontier(Cell* cell);
    void removeFrontier(Cell* cell);
};
#endif
