# Rickshaw Rush 3D (Python)

A desktop 3D auto-rickshaw prototype using **Ursina**, real road centerlines from **OpenStreetMap Overpass**, and road routing from **OSRM**. Default map area: Powai, Mumbai.

## Run on Windows
Install Python 3.10–3.12, extract/download this folder, then run in PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python main.py
```

## Controls
- W / Up: accelerate
- S / Down / Space: brake
- A / Left and D / Right: steer
- Esc: quit

## Notes
This is a desktop Python game, not a browser game; Vercel cannot run the Ursina 3D window. The hosted page provides source and setup instructions. Internet is required to fetch map data and route geometry. Public Overpass and OSRM services are best-effort and may rate-limit. Map attribution: © OpenStreetMap contributors (https://www.openstreetmap.org/copyright). Roads are real OSM geometry rendered as flat 3D strips; the vehicle is procedural low-poly geometry.
