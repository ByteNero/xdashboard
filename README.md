# Ultrawide Modular Dashboard

A Corsair Xeneon Edge-style dashboard for ultrawide displays (1920x550), featuring modular panels with horizontal scroll-snap navigation.

## Features

- 🖥️ **Display Mode** (`/display`) - Fullscreen, touch-friendly dashboard
- ⚙️ **Setup Mode** (`/setup`) - Configure panels from any device
- 📱 **Touch Optimized** - Large touch targets, swipe navigation
- 🎨 **Corsair-style Dark Theme** - Cyan accents, gaming aesthetic
- 💾 **Persistent Storage** - Settings saved to localStorage
- 🔄 **Auto-scroll** - Optional automatic panel cycling

## Panels Included

1. **Home Assistant** - Smart home control grid
2. **Weather** - Current conditions & forecast
3. **Uptime Kuma** - Service monitoring status
4. **Media** - Now playing with controls
5. **Clock** - Time, date & upcoming events

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm run preview
```

## URLs

- `/display` - Dashboard view (for the ultrawide screen)
- `/setup` - Configuration UI (for phone/laptop)

## Hardware Setup

1. Connect your ultrawide display via HDMI
2. Connect touch via USB
3. Open Chrome/Edge in kiosk mode:

```bash
# Windows
chrome.exe --kiosk --app=http://localhost:5173/display

# Linux
chromium-browser --kiosk --app=http://localhost:5173/display
```

## Configuration

Panels can be:
- Enabled/disabled via toggle
- Reordered via drag-and-drop
- Settings persist automatically

## Tech Stack

- **React 18** + Vite
- **Zustand** - State management
- **React Router** - Routing
- **Lucide React** - Icons
- **CSS Variables** - Theming

## Project Structure

```
src/
├── components/
│   └── panels/
│       ├── HomeAssistantPanel.jsx
│       ├── WeatherPanel.jsx
│       ├── UptimeKumaPanel.jsx
│       ├── MediaPanel.jsx
│       └── ClockPanel.jsx
├── pages/
│   ├── Display.jsx      # Fullscreen dashboard
│   └── Setup.jsx        # Configuration UI
├── store/
│   └── dashboardStore.js # Zustand state
├── App.jsx
├── main.jsx
└── index.css            # All styles
```

## Future Integrations

- Home Assistant WebSocket API
- Uptime Kuma API
- Spotify Web API
- OpenWeatherMap API
- Google Calendar API

## Customization

### Panel Width
Default is 384px (1920/5 panels). Adjust in `index.css`:
```css
:root {
  --panel-width: 384px;
}
```

### Colors
```css
:root {
  --accent-primary: #00d4ff;  /* Main accent */
  --bg-primary: #0a0a0c;      /* Background */
}
```

## License

MIT
