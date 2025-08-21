
# Weather App- Pre hackathon

A sleek, animated, and user-friendly weather app. The Node.js backend securely proxies requests to the OpenWeatherMap API and adds caching. The frontend is vanilla HTML/CSS/JS with glassmorphism, animated gradients, and delightful micro-interactions.

## Features![Uploading Screenshot 2025-08-21 185721.png…]()

- Search any city or use current location (Geolocation).
- Real-time current weather + 5-day / 3‑hour forecast.
- Metric / Imperial units toggle with persistence.
- Favorites (bookmarked cities) stored locally.
- Fast responses via server-side caching.
- Modern UI with animated gradient background, glass cards, smooth transitions.

- 
- Progressive enhancement: works without geolocation permissions by using a default city.

## Quick Start
1. **Clone / Download** this project.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Create `.env`** based on `.env.example` and set your OpenWeatherMap key:
   ```ini
   OWM_API_KEY=your_openweathermap_api_key_here
   PORT=3000
   ```
   - Get a free API key at https://openweathermap.org/
4. **Run the app**:
   ```bash
   npm run dev
   ```
5. Open **http://localhost:3000** in your browser.

## Project Structure
```
cloudctrl-weather/
   server.js          # Express server + API proxy + caching
   package.json
   .env.example
   public/
      index.html
      styles.css
      app.js
   README.md
```

## Notes
- This app uses the stable OpenWeatherMap endpoints: `/data/2.5/weather` and `/data/2.5/forecast`.
- For production, consider HTTPS, longer cache TTLs, and a CDN for static assets.
