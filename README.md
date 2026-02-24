# Ultrawide Dashboard

A modular home server dashboard built for ultrawide displays. Designed to run 24/7 on a dedicated screen — configure from any device, display on your ultrawide.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![Docker](https://img.shields.io/badge/Docker-Ready-green)

## Features

- **17+ Modular Panels** — Enable, disable, and reorder panels to build your layout
- **Dual-Mode Interface** — `/display` for your ultrawide, `/setup` for configuration from any device
- **Live Camera Feeds** — RTSP streaming via go2rtc (MSE/WebRTC)
- **Standby / Screensaver** — Idle-activated overlay with clock, weather, countdowns, service status, and more
- **Server Sync** — Settings saved server-side, synced across all devices in real-time
- **Docker Deployment** — Single `docker compose up` with persistent storage

## Panels

| Panel | Description |
|-------|-------------|
| Home Assistant | Smart home device control & status |
| Uptime Kuma | Service monitoring with status indicators |
| Clock & Weather | Time, date, and OpenWeatherMap integration |
| Tautulli | Plex activity, history, and stats |
| Cameras | Live RTSP/MJPEG feeds via go2rtc |
| Calendar | Events from iCal/ICS feeds |
| ARR Stack | Overseerr, Radarr, Sonarr, Readarr |
| Downloads | qBittorrent, Deluge, SABnzbd, Transmission |
| Docker | Container management via Portainer |
| UniFi | Network device monitoring |
| Markets | Crypto & stock tickers |
| Poster | Movie/TV discovery via TMDB & Trakt |
| RSS | Feed reader |
| Quick Links | Custom bookmarks with icons |
| Notes | Simple note-taking |
| System | CPU, RAM, disk stats |
| Media | Now playing |

## Quick Start

### Docker (Recommended)

```bash
docker compose up -d
```

Dashboard available at `http://your-server:3000`

### Manual

```bash
npm install
npm run build
node server/index.js
```

## Docker Compose

```yaml
services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - GO2RTC_URL=http://go2rtc:1984
    restart: unless-stopped

  go2rtc:
    image: alexxit/go2rtc
    ports:
      - "1984:1984"
    restart: unless-stopped
```

## URLs

| Route | Purpose |
|-------|---------|
| `/display` | Fullscreen dashboard (for your ultrawide) |
| `/setup` | Configuration UI (use from phone/laptop) |

## Standby Mode

Activates after a configurable idle period. Configurable from `/setup`:

- **Background** — Upload an image, paste a URL, or pick a gradient preset
- **Overlays** — Toggle: clock, date, weather, lights on (HA), services down (Uptime Kuma), Plex activity, countdowns, world clocks
- **Position** — Bottom-left, bottom-right, top-left, top-right, or center
- **Dim opacity** — Adjustable overlay dimming

## Integrations

| Service | Connection |
|---------|-----------|
| Home Assistant | URL + Long-lived access token |
| Uptime Kuma | URL + Status page slug or API key |
| Tautulli | URL + API key |
| OpenWeatherMap | API key + City |
| UniFi | Controller URL + Credentials or API key |
| TMDB | API key |
| Trakt | Client ID |
| go2rtc | Auto-configured via Docker network |

## Hardware Setup

1. Connect your ultrawide display
2. Open a browser in kiosk mode:

```bash
# Linux
chromium-browser --kiosk --app=http://your-server:3000/display

# Windows
chrome.exe --kiosk --app=http://your-server:3000/display

# macOS
open -a "Google Chrome" --args --kiosk --app=http://your-server:3000/display
```

## Tech Stack

- **React 18** + **Vite 7** — Frontend
- **Zustand** — State management with persist middleware
- **Express** — API server with CORS proxy
- **go2rtc** — RTSP camera streaming
- **Docker** — Multi-stage Alpine build

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATA_DIR` | `/data` | Persistent storage path |
| `GO2RTC_URL` | `http://go2rtc:1984` | go2rtc service URL |

## License

MIT
