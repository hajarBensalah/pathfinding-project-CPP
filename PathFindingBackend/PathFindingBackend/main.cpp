#include <iostream>
#include "httplib.h"
#include <nlohmann/json.hpp>

#include "Grid.h"
#include "Cell.h"
#include "Step.h"

#include "BFS.h"
#include "Dijkstra.h"
#include "aStar.h"
#include "PathFinder.h"

/* ---------- Global backend state ---------- */
Grid* grid = nullptr;
Cell* start = nullptr;
Cell* goal = nullptr;
PathFinder* pathFinder = nullptr;

/* ---------- Helper: CellState → string ---------- */
std::string toString(CellState state) {
    switch (state) {
    case CellState::Empty:    return "Empty";
    case CellState::Wall:     return "Wall";
    case CellState::Start:    return "Start";
    case CellState::Goal:     return "Goal";
    case CellState::Frontier: return "Frontier";
    case CellState::Visited:  return "Visited";
    case CellState::Failure:  return "Failure";
    case CellState::Path:     return "Path";
    default:                  return "Unknown";
    }
}

/* ---------- Helper: string → Algorithme---------- */
Algorithme toAlgo(const string& algorithme) {
    if (algorithme == "BFS") return Algorithme::BFS;
    if (algorithme == "Dijkstra") return Algorithme::Dijkstra;
    if (algorithme == "A*") return Algorithme::Astart;
}


/* ---------- MAIN ---------- */
int main() {
    httplib::Server server;

    
    /*server.Get("/init", [](const httplib::Request&, httplib::Response& res) {
        delete bfs;
        delete grid;

        grid = new Grid(5, 5);
        start = grid->getCell(0, 0);
        goal = grid->getCell(4, 4);
        bfs = new BFS(*grid, start, goal);

        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_content("{\"status\":\"initialized\"}", "application/json");

        });*/

        // CORS preflight handler – put this first
    server.Options(R"(/.*)", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 200;
        });
    /* ---------- /init ---------- */
    server.Post("/init", [](const httplib::Request& req, httplib::Response& res) {
        delete pathFinder;
        delete grid;

        std::cout << "Request body: " << req.body << "\n\n\n";

        auto json = nlohmann::json::parse(req.body);

		string algoStr = json["algorithm"];

        int rows = json["rows"];
		int cols = json["cols"];

		int startX = json["start"]["x"];
		int startY = json["start"]["y"];

		int goalX = json["end"]["x"];
		int goalY = json["end"]["y"];

		auto walls_json = json["walls"];

        std::vector<Vector2> walls;

        for (const auto& w : walls_json) {
			cout << "Wall at: (" << w["x"] << ", " << w["y"] << ")\n";
            walls.push_back({ w["x"].get<int>(), w["y"].get<int>() });
        }

        if (walls.size() == 0) {
            cout << "No walls\n";
        }

        grid = new Grid(rows, cols, toAlgo(algoStr), walls);

        start = grid->getCell(startX, startY);
        start->setState(CellState::Start);

        goal = grid->getCell(goalX, goalY);
		goal->setState(CellState::Goal);

		pathFinder = PathFinder::createPathFinder(grid->algoType, *grid, start, goal);

        for(int i = 0; i < grid->rows; i++) {
            for(int j = 0; j < grid->cols; j++) {
				cout << toString(grid->cells[i][j]->state) << "     ";
            }
            cout << endl;
		}

        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_content("{\"status\":\"initialized\"}", "application/json");
        });

    /* ---------- /step ---------- */
    server.Get("/step", [](const httplib::Request&, httplib::Response& res) {
        if (!pathFinder) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_content("{\"error\":\"not initialized\"}", "application/json");
            return;
        }

        if (pathFinder->finished()) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_content("{\"state\":\"done\"}", "application/json");
            return;
        }

        /*Step s = bfs->step();*/
        Step s = pathFinder->step();

		cout << "Step: (" << s.x << ", " << s.y << ") State: " << toString(s.state) << "\n";

        std::string json =
            "{ \"x\": " + std::to_string(s.x) +
            ", \"y\": " + std::to_string(s.y) +
            ", \"state\": \"" + toString(s.state) + "\"" +
            ", \"parent\": " +
			(s.parent.x != -1 && s.parent.y != -1
                ? "{ \"x\": " + std::to_string(s.parent.x) +
                ", \"y\": " + std::to_string(s.parent.y) + " }"
                : "null") +
            " }";

        cout << endl;
        for (int i = 0; i < grid->rows; i++) {
            for (int j = 0; j < grid->cols; j++) {
                cout << toString(grid->cells[i][j]->state) << "     ";
            }
            cout << endl;
        }
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_content(json, "application/json");
        });

    std::cout << "Backend running on http://localhost:8080\n";
    std::cout << "GET /init\n";
    std::cout << "GET /step\n";

    server.listen("localhost", 8080);

    delete pathFinder;
    delete grid;

    return 0;
}
