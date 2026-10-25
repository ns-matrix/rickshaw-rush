# Rickshaw Rush — Real City Drive

A browser-based auto-rickshaw driving simulation built with Three.js and MapLibre GL JS.

## Current map and simulation
- OpenFreeMap street tiles with OpenStreetMap road geography
- OSRM driving routes following routable roads
- 3D map camera and road-following vehicle motion
- Lane-offset steering bounded around the route centerline
- Keyboard and touch controls, passenger pickup/drop-off missions and fare scoring
- GLB vehicle loader

## Run locally
Serve the project over HTTP because it uses ES modules and loads a GLB asset:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Required 3D asset
Place `auto-rickshaw-2024.glb` beside `index.html`. The current repository HTML references this path, but the model must be present in the deployed files for the 3D vehicle to render. The map can still load without the model.

Map tiles and routing require internet access. OSRM's public demo endpoint is best-effort and has no production SLA.

## Google Maps / Street View
The live version currently uses OpenStreetMap-derived road data, not Google Maps data. Switching to Google Routes/Maps requires a Google Maps Platform project, enabled APIs, a restricted API key, and any applicable billing. Street View imagery coverage/API access is a separate dependency. Do not commit a key into this public repository; use a restricted browser key or server-side secret as appropriate.

## CI/CD to Vercel
The GitHub Actions workflow at `.github/workflows/ci-cd.yml` deploys on pushes to `main`. Add these repository Actions secrets in GitHub Settings → Secrets and variables → Actions:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The workflow cannot deploy until these secrets are configured. If Vercel's native Git integration is already connected to this repository, it may also deploy commits automatically.

## Deployment
Static site; repository root is the project root and no application build step is required.
