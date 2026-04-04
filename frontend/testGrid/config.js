// Runtime configuration — served by nginx in Docker, loaded before script.js
// In local development this file is not strictly needed; script.js falls back to localhost:8080.
window.APP_CONFIG = {
    API_BASE: "http://localhost:8080",
    CELL_SIZE: 18,
};
