const WeatherService = require('/opt/nodejs/node_modules/OpenMeteoClient');


exports.handler = async (event) => {
    try {
        const weatherService = new WeatherService();
        const forecast = await weatherService.getWeatherForecast();

        return {
            statusCode: 200,
            body: JSON.stringify(forecast),
            headers: {
                'Content-Type': 'application/json',
            }
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Can not fetch data' }),
        };
    }
};
