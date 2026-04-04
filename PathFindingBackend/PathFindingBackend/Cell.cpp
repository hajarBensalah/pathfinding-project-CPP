#include "Cell.h"

void Cell::setState(CellState _state) {
    state = _state;
}

CellState Cell::getState() const {
    return state;
}

bool Cell::isWalkable() const {
    return state != CellState::Wall;
}

bool Cell::operator==(const Cell& c) const {
    return col == c.col && row == c.row;
}

bool Cell::operator!=(const Cell& c) const {
    return !(*this == c);
}

bool Cell::isDiagonalTo(const Cell& c) const {
    return std::abs(c.col - col) == 1 &&
        std::abs(c.row - row) == 1;
}

