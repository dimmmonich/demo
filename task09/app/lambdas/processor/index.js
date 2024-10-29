const axios = require('axios');
const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new DynamoDB.DocumentClient();
const WEATHER_TABLE = process.env.WEATHER_TABLE; // Name of DynamoDB table set via environment variable

exports.handler = async (event) => {
    try {
        // Fetch weather data from Open-Meteo API
        const response = await axios.get('https://api.open-meteo.com/v1/forecast');
        const data = response.data;

        // Construct item to be stored in DynamoDB
        const item = {
            id: uuidv4(),
            forecast: {
                elevation: data.elevation,
                generationtime_ms: data.generationtime_ms,
                hourly: {
                    temperature_2m: data.hourly.temperature_2m,
                    time: data.hourly.time
                },
                hourly_units: {
                    temperature_2m: data.hourly_units.temperature_2m,
                    time: data.hourly_units.time
                },
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                timezone_abbreviation: data.timezone_abbreviation,
                utc_offset_seconds: data.utc_offset_seconds
            }
        };

        // Put item into DynamoDB table
        await dynamoDb.put({
            TableName: WEATHER_TABLE,
            Item: item
        }).promise();

        // Successful response
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Weather data stored successfully!' })
        };

    } catch (error) {
        console.error('Error storing weather data:', error);

        // Error response
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to store weather data', error: error.message })
        };
    }
};
