const OpenMeteoClient = require('/opt/nodejs/open-meteo-sdk/OpenMeteoClient'); // /opt is the path for layers

exports.handler = async (event) => {
    const api = new OpenMeteoClient();
    const forecast = await api.getForecast(50.4375, 30.5);

    return {
        statusCode: 200,
        body: JSON.stringify(forecast)
    };
};
