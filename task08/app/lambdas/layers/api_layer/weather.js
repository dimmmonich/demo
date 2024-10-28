class WeatherService {
    constructor() {
        this.apiUrl = 'https://api.open-meteo.com/v1/forecast';
        this.latitude = 52.52;
        this.longitude = 13.41;
    }

    async getWeatherForecast() {
        try {
            const response = await fetch(`${this.apiUrl}?latitude=${this.latitude}&longitude=${this.longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`);

            if (!response.ok) {
                throw new Error(`Error fetching weather data: ${response.status}`);
            }

            const weatherData = await response.json();

            return {
                latitude: weatherData.latitude,
                longitude: weatherData.longitude,
                generationtime_ms: weatherData.generationtime_ms,
                utc_offset_seconds: weatherData.utc_offset_seconds,
                timezone: weatherData.timezone,
                timezone_abbreviation: weatherData.timezone_abbreviation,
                elevation: weatherData.elevation,
                hourly_units: {
                    time: "iso8601",
                    temperature_2m: "°C",
                    relative_humidity_2m: "%",
                    wind_speed_10m: "km/h"
                },
                hourly: {
                    time: weatherData.hourly.time,
                    temperature_2m: weatherData.hourly.temperature_2m,
                    relative_humidity_2m: weatherData.hourly.relative_humidity_2m,
                    wind_speed_10m: weatherData.hourly.wind_speed_10m
                },
                current_units: {
                    time: "iso8601",
                    interval: "seconds",
                    temperature_2m: "°C",
                    wind_speed_10m: "km/h"
                },
                current: {
                    time: weatherData.current_weather.time,
                    interval: 900,
                    temperature_2m: weatherData.current_weather.temperature,
                    wind_speed_10m: weatherData.current_weather.windspeed
                }
            };
        } catch (error) {
            console.error('Error fetching weather data:', error.message);
            throw new Error('Failed to fetch weather data');
        }
    }
}

module.exports = WeatherService;