// Weather Service - supports multiple locations and custom endpoints

class WeatherService {
  constructor() {
    this.locations = []; // Array of location configs with their weather data
    this.subscribers = new Set();
    this.pollInterval = null;
    this.connected = false;
    this._visibilityHandler = null;
  }

  // Connect with legacy single-location config or new multi-location
  async connect(apiKeyOrConfig, options = {}) {
    // Support legacy single location mode
    if (typeof apiKeyOrConfig === 'string') {
      return this.connectSingleLocation(apiKeyOrConfig, options);
    }

    // New multi-location mode
    const configs = Array.isArray(apiKeyOrConfig) ? apiKeyOrConfig : [apiKeyOrConfig];
    return this.connectMultipleLocations(configs);
  }

  async connectSingleLocation(apiKey, options = {}) {
    const config = {
      id: 'default',
      name: options.city || 'Weather',
      provider: 'openweathermap',
      apiKey: apiKey,
      units: options.units || 'metric',
      lat: options.lat,
      lon: options.lon,
      city: options.city,
      enabled: true
    };

    return this.connectMultipleLocations([config]);
  }

  async connectMultipleLocations(configs) {
    this.locations = [];

    for (const config of configs) {
      if (!config.enabled) continue;

      const location = {
        id: config.id || Date.now().toString(),
        name: config.name || 'Weather',
        provider: config.provider || 'openweathermap',
        apiKey: config.apiKey,
        apiUrl: config.apiUrl, // Custom endpoint
        units: config.units || 'metric',
        lat: config.lat,
        lon: config.lon,
        city: config.city,
        weather: null,
        forecast: null,
        error: null
      };

      // Get coordinates if needed
      try {
        if (!location.lat || !location.lon) {
          if (location.city) {
            await this.geocodeCity(location);
          } else {
            await this.getGeolocation(location);
          }
        }

        // Fetch initial weather
        await this.fetchWeatherForLocation(location);
        this.locations.push(location);
      } catch (error) {
        console.error(`[Weather] Failed to connect location ${location.name}:`, error);
        location.error = error.message;
        this.locations.push(location); // Still add it so user sees the error
      }
    }

    if (this.locations.length > 0) {
      this.connected = true;
      this.startPolling();
    }

    return {
      success: this.locations.some(l => !l.error),
      location: this.locations[0]?.name,
      locations: this.locations.map(l => l.name)
    };
  }

  async geocodeCity(location) {
    // OpenWeatherMap geocoding
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location.city)}&limit=1&appid=${location.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      throw new Error(`City not found: ${location.city}`);
    }

    location.lat = data[0].lat;
    location.lon = data[0].lon;
    location.name = location.name || `${data[0].name}, ${data[0].country}`;
  }

  getGeolocation(location) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          location.lat = position.coords.latitude;
          location.lon = position.coords.longitude;
          location.name = location.name || 'Current Location';
          resolve();
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        }
      );
    });
  }

  async fetchWeatherForLocation(location) {
    if (!location.lat || !location.lon) {
      throw new Error('Location coordinates not set');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let weatherData;

      if (location.provider === 'custom' && location.apiUrl) {
        // Custom API endpoint
        weatherData = await this.fetchFromCustomEndpoint(location, controller.signal);
      } else {
        // OpenWeatherMap (default)
        weatherData = await this.fetchFromOpenWeatherMap(location, controller.signal);
      }

      clearTimeout(timeout);

      location.weather = weatherData.current;
      location.forecast = weatherData.forecast;
      location.error = null;
      location.weather.location = location.name;

      this.notifySubscribers();
    } catch (error) {
      console.error(`[Weather] Fetch failed for ${location.name}:`, error);
      // Keep stale data if we have it
      if (!location.weather) {
        location.error = error.message;
      }
    }
  }

  async fetchFromOpenWeatherMap(location, signal) {
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=${location.units}&appid=${location.apiKey}`,
      { signal }
    );

    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.statusText}`);
    }

    const currentData = await currentResponse.json();

    const current = {
      temp: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      pressure: currentData.main.pressure,
      windSpeed: Math.round(currentData.wind.speed),
      windDeg: currentData.wind.deg,
      condition: currentData.weather[0].main.toLowerCase(),
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      high: Math.round(currentData.main.temp_max),
      low: Math.round(currentData.main.temp_min),
      sunrise: currentData.sys.sunrise * 1000,
      sunset: currentData.sys.sunset * 1000,
      visibility: currentData.visibility,
      clouds: currentData.clouds.all,
      // Rain data (mm in last 1h and 3h if available)
      rain1h: currentData.rain?.['1h'] || 0,
      rain3h: currentData.rain?.['3h'] || 0,
      // Snow data (mm in last 1h and 3h if available)
      snow1h: currentData.snow?.['1h'] || 0,
      snow3h: currentData.snow?.['3h'] || 0,
      updatedAt: Date.now()
    };

    // Fetch forecast (non-critical)
    let forecast = null;
    try {
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=${location.units}&appid=${location.apiKey}`
      );

      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        forecast = this.processForecast(forecastData);
      }
    } catch (e) {
      console.warn('[Weather] Forecast fetch failed:', e.message);
    }

    return { current, forecast };
  }

  async fetchFromCustomEndpoint(location, signal) {
    // Custom endpoint - expects JSON in a specific format
    // Users can transform their API response to match this format
    let url = location.apiUrl
      .replace('{lat}', location.lat)
      .replace('{lon}', location.lon)
      .replace('{units}', location.units)
      .replace('{apiKey}', location.apiKey || '');

    // Always use proxy to avoid CORS issues
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, { signal });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Support multiple response formats
    // Format 1: Direct { temp, humidity, ... }
    // Format 2: { current: { temp, ... }, forecast: [...] }
    // Format 3: OpenWeatherMap-like { main: { temp }, weather: [...] }

    let current;

    if (data.main && data.weather) {
      // OpenWeatherMap format
      current = {
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        condition: data.weather[0]?.main?.toLowerCase() || 'unknown',
        description: data.weather[0]?.description || '',
        icon: data.weather[0]?.icon || '01d',
        high: Math.round(data.main.temp_max || data.main.temp),
        low: Math.round(data.main.temp_min || data.main.temp),
        windSpeed: Math.round(data.wind?.speed || 0),
        updatedAt: Date.now()
      };
    } else if (data.current) {
      // Wrapped format
      current = { ...data.current, updatedAt: Date.now() };
    } else {
      // Direct format
      current = { ...data, updatedAt: Date.now() };
    }

    return { current, forecast: data.forecast || null };
  }

  processForecast(data) {
    const daily = {};

    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();

      if (!daily[date]) {
        daily[date] = {
          date: item.dt * 1000,
          temps: [],
          conditions: [],
          icons: []
        };
      }

      daily[date].temps.push(item.main.temp);
      daily[date].conditions.push(item.weather[0].main);
      daily[date].icons.push(item.weather[0].icon);
    });

    return Object.values(daily).slice(0, 5).map(day => ({
      date: day.date,
      high: Math.round(Math.max(...day.temps)),
      low: Math.round(Math.min(...day.temps)),
      condition: this.mostCommon(day.conditions),
      icon: this.mostCommon(day.icons)
    }));
  }

  mostCommon(arr) {
    return arr.sort((a, b) =>
      arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
  }

  async _pollAll() {
    for (const location of this.locations) {
      try {
        await this.fetchWeatherForLocation(location);
      } catch (error) {
        console.warn(`[Weather] Poll failed for ${location.name}:`, error.message);
      }
    }
  }

  startPolling(interval = 600000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => this._pollAll(), interval);

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Weather] Tab visible — refreshing data');
        this._pollAll();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);

    // Send current data immediately
    if (this.locations.length > 0) {
      callback(this.getWeather());
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifySubscribers() {
    const data = this.getWeather();
    this.subscribers.forEach(callback => callback(data));
  }

  getWeather() {
    // Return first location's weather for backward compatibility
    const primary = this.locations[0];
    return {
      current: primary?.weather,
      forecast: primary?.forecast,
      locations: this.locations.map(l => ({
        id: l.id,
        name: l.name,
        weather: l.weather,
        forecast: l.forecast,
        error: l.error
      }))
    };
  }

  // Get weather for a specific location
  getLocationWeather(locationId) {
    const location = this.locations.find(l => l.id === locationId);
    return location ? { current: location.weather, forecast: location.forecast } : null;
  }

  static getWeatherIcon(iconCode) {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '☁️';
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.locations = [];
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const weather = new WeatherService();
export default weather;
