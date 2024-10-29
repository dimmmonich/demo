const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'cmtr-d49b0e2c-Weather-test';

exports.handler = async (event) => {
    const weatherApiUrl =
        'https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&hourly=temperature_2m';

    try {
        const response = await axios.get(weatherApiUrl);
        const weatherData = response.data;

        const item = {
            id: uuidv4(),
            forecast: {
                elevation: weatherData.elevation,
                generationtime_ms: weatherData.generationtime_ms,
                hourly: {
                    temperature_2m: weatherData.hourly.temperature_2m,
                    time: weatherData.hourly.time,
                },
                hourly_units: {
                    temperature_2m: weatherData.hourly_units.temperature_2m,
                    time: weatherData.hourly_units.time,
                },
                latitude: weatherData.latitude,
                longitude: weatherData.longitude,
                timezone: weatherData.timezone,
                timezone_abbreviation: weatherData.timezone_abbreviation,
                utc_offset_seconds: weatherData.utc_offset_seconds,
            },
        };

        const params = {
            TableName: tableName,
            Item: item,
        };

        await docClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Weather data stored successfully!',
                item,
            }),
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to fetch weather data.',
                error: error.message,
            }),
        };
    }
};