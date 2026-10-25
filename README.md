# Rickshaw Rush — Real City Drive

A browser-based auto-rickshaw driving simulation built with Three.js and MapLibre GL JS.

## Features
- Interactive street map with a 3D camera
- Keyboard and touch driving controls
- Passenger pickup/drop-off missions and fare scoring
- Route guidance via the public OSRM routing service
- GLB vehicle model support

## Run locally
Because the game uses ES modules and loads a GLB asset, serve the project over HTTP rather than opening the HTML file directly.

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Required asset
Place `auto-rickshaw-2024.glb` beside `index.html`. The original game package includes this model.
Map tiles and route guidance require an internet connection.

## Deployment
This project is intended for static hosting such as Vercel. Set the project root to the repository root; no build command is required.
