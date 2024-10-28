const path = require('path');

// Перевіряємо, чи виконується код в Lambda середовищі
const OpenMeteoClient = require(
    process.env.LAMBDA_TASK_ROOT
        ? '/opt/nodejs/open-meteo-sdk/OpenMeteoClient'
        : path.join(__dirname, '..', '..', 'nodejs', 'open-meteo-sdk', 'OpenMeteoClient')
);

exports.handler = async (event) => {
    const api = new OpenMeteoClient();
    const forecast = await api.getForecast(50.4375, 30.5);

    return {
        statusCode: 200,
        body: JSON.stringify(forecast)
    };
};
