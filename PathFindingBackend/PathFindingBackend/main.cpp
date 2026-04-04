#include <iostream>
#include <mutex>
#include <memory>
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
std::unique_ptr<Grid>       grid;
std::unique_ptr<PathFinder> pathFinder;
Cell* start = nullptr;   // non-owning alias into grid
Cell* goal  = nullptr;   // non-owning alias into grid

std::mutex stateMutex;

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

/* ---------- Helper: string → Algorithme ---------- */
Algorithme toAlgo(const std::string& a) {
    if (a == "BFS")      return Algorithme::BFS;
    if (a == "Dijkstra") return Algorithme::Dijkstra;
    if (a == "A*")       return Algorithme::Astart;
    throw std::invalid_argument("Unknown algorithm: " + a);
}


/* ---------- MAIN ---------- */
int main() {
    httplib::Server server;

    // CORS preflight handler
    server.Options(R"(/.*)", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 200;
    });

    /* ---------- /init ---------- */
    server.Post("/init", [](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(stateMutex);

        try {
            auto json = nlohmann::json::parse(req.body);

            std::string algoStr  = json["algorithm"];
            int rows             = json["rows"];
            int cols             = json["cols"];
            int startCol         = json["start"]["col"];
            int startRow         = json["start"]["row"];
            int goalCol          = json["end"]["col"];
            int goalRow          = json["end"]["row"];
            auto walls_json      = json["walls"];

            std::vector<Vector2> walls;
            for (const auto& w : walls_json)
                walls.push_back({ w["col"].get<int>(), w["row"].get<int>() });

            // Destroy old state — pathFinder first (holds Grid&), then grid
            pathFinder.reset();
            grid.reset();
            start = nullptr;
            goal  = nullptr;

            grid  = std::make_unique<Grid>(rows, cols, toAlgo(algoStr), walls);

            start = grid->getCell(startCol, startRow);
            start->setState(CellState::Start);

            goal = grid->getCell(goalCol, goalRow);
            goal->setState(CellState::Goal);

            bool        diagonal  = json.value("diagonal", true);
            std::string heuristic = json.value("heuristic", std::string("Manhattan"));

            pathFinder = std::unique_ptr<PathFinder>(
                PathFinder::createPathFinder(grid->algoType, *grid, start, goal, diagonal, heuristic)
            );

#ifdef DEBUG_PRINT
            for (int i = 0; i < grid->rows; i++) {
                for (int j = 0; j < grid->cols; j++)
                    std::cout << toString(grid->cells[i][j]->state)[0] << "  ";
                std::cout << "\n";
            }
#endif

            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_content("{\"status\":\"initialized\"}", "application/json");

        } catch (const std::exception& e) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.status = 400;
            res.set_content(
                std::string("{\"error\":\"") + e.what() + "\"}",
                "application/json"
            );
        }
    });

    /* ---------- /step ---------- */
    server.Get("/step", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(stateMutex);

        res.set_header("Access-Control-Allow-Origin", "*");

        if (!pathFinder) {
            res.set_content("{\"error\":\"not initialized\"}", "application/json");
            return;
        }

        if (pathFinder->finished()) {
            res.set_content("{\"state\":\"done\"}", "application/json");
            return;
        }

        Step s = pathFinder->step();

#ifdef DEBUG_PRINT
        std::cout << "Step: (" << s.col << ", " << s.row << ") State: " << toString(s.state) << "\n";
        for (int i = 0; i < grid->rows; i++) {
            for (int j = 0; j < grid->cols; j++)
                std::cout << toString(grid->cells[i][j]->state)[0] << "  ";
            std::cout << "\n";
        }
#endif

        std::string json = grid->toJson(s);
        res.set_content(json, "application/json");
    });

    /* ---------- /steps ---------- */
    server.Get("/steps", [](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(stateMutex);

        res.set_header("Access-Control-Allow-Origin", "*");

        if (!pathFinder) {
            res.set_content("{\"error\":\"not initialized\"}", "application/json");
            return;
        }

        int n = 1;
        if (req.has_param("n")) {
            try { n = std::stoi(req.get_param_value("n")); }
            catch (...) { n = 1; }
        }
        if (n < 1)    n = 1;
        if (n > 5000) n = 5000;

        std::ostringstream json;
        json << "{\"steps\":[";

        bool first = true;
        bool done  = false;

        for (int i = 0; i < n; i++) {
            if (pathFinder->finished()) { done = true; break; }

            Step s = pathFinder->step();
            std::string stepJson = grid->toJson(s);

            if (!first) json << ",";
            first = false;
            json << stepJson;

            if (s.state == CellState::Goal || s.state == CellState::Failure) {
                done = true;
                break;
            }
        }

        if (!done && pathFinder->finished()) done = true;

        json << "],\"done\":" << (done ? "true" : "false") << "}";

        res.set_content(json.str(), "application/json");
    });

    std::cout << "Server running on 0.0.0.0:8080\n";

    server.listen("0.0.0.0", 8080);

    return 0;
}
