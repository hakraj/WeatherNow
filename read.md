# WeatherNow 🌤️
A fast, lightweight weather dashboard built with **vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools.

**Live demo:** https://hakraj.github.io/WeatherNow/

---

## Features

- Current weather for your **location**
- Detailed current conditions:
    - Temperature & feels-like
    - Wind speed & direction
    - Humidity, pressure, visibility
    - Sunrise & sunset
    - UV index with severity gauge
- **7-day forecast**
- **Multi-city dashboard**
    - Cities persisted in `localStorage`
    - Parallel API fetching
- **Wind sparkline**
    - 2-hour bins (12 bars)
    - Tooltips with time & speed
    - Highlights current time bucket
- **Dark / Light theme toggle**
- Accessibility-first design

---

## Tech Stack

- HTML
- CSS (CSS Variables)
- Vanilla JavaScript (ES6+)
- Open-Meteo API (forecast + geocoding)
- GitHub Pages

---

## Architecture Overview

- Single API request per city
- Data normalization layer separate from rendering logic
- Concurrent data loading using `Promise.all`
- UI derived from one source of truth

---

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Visible focus indicators
- `aria-live="polite"` for dynamic updates
- Accessible SVG graphics
- WCAG-compliant color contrast

---

## Local Development

```bash
git clone https://github.com/hakraj/WeatherNow.git
cd WeatherNow
```

Open `index.html` directly in your browser or serve with a simple local server.

---

## Future Improvements

- Enhanced offline-first support
- Severe weather alerts
- Localization (languages & units)

---

## Links

- **Demo:** https://hakraj.github.io/WeatherNow/
- **Repository:** https://github.com/hakraj/WeatherNow/

Contributions and feature ideas are welcome!