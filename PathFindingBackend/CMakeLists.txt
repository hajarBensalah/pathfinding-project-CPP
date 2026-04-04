cmake_minimum_required(VERSION 3.20)
project(PathFindingBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SOURCES
    PathFindingBackend/main.cpp
    PathFindingBackend/Cell.cpp
    PathFindingBackend/Grid.cpp
    PathFindingBackend/BFS.cpp
    PathFindingBackend/Dijkstra.cpp
    PathFindingBackend/aStar.cpp
    PathFindingBackend/PathFinder.cpp
)

add_executable(pathfinding_backend ${SOURCES})

target_include_directories(pathfinding_backend PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/PathFindingBackend
)

find_package(Threads REQUIRED)
target_link_libraries(pathfinding_backend PRIVATE Threads::Threads)

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_options(pathfinding_backend PRIVATE -O2)
endif()
