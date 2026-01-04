#include "PathFinder.h"
#include "BFS.h"
#include "Dijkstra.h"
#include "aStar.h"

PathFinder* PathFinder::createPathFinder(Algorithme algorithme, Grid& grid, Cell* start, Cell* goal) {
	switch (algorithme) {
	case Algorithme::BFS:
		return new BFS(grid, start, goal);
	case Algorithme::Dijkstra:
		return new Dijkstra(grid, start, goal);
	case Algorithme::Astart:
		return new aStar(grid, start, goal);
	default:
		throw std::invalid_argument("Unknown algorithm");
	}
}