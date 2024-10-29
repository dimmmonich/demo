const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Define the WeatherService class to fetch weather data
class WeatherService {
    async getWeatherForecast() {
        const url =' https://api.open-meteo.com/v1/forecast?latitude=50.4375&longitude=30.5&hourly=temperature_2m';

        try {
            const response = await axios.get(url);
            return response.data; // Return the weather forecast data
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw new Error('Failed to fetch weather data');
        }
    }
}

// Lambda function handler
exports.handler = async (event) => {
    try {
        const weatherService = new WeatherService();
        const forecast = await weatherService.getWeatherForecast();

        // Log fetched data for debugging
        console.log('Fetched forecast:', JSON.stringify(forecast));

        // Extract latitude, longitude, and other relevant data
        const { latitude, longitude } = forecast; // Adjust based on actual response structure
        const generationTimeMs = forecast.generationtime_ms;
        const id = uuidv4(); // Generate a UUID

        const item = {
            id,
            forecast: {
                latitude,
                longitude,
                generationtime_ms: generationTimeMs,
                // Include additional required fields from forecast if needed
                hourly: forecast.hourly // This assumes the hourly forecast is included
            }
        };

        console.log('Item to be stored in DynamoDB:', JSON.stringify(item)); // Log item to be stored

        // Put the item into DynamoDB
        const params = {
            TableName: process.env.target_table, // Use environment variable for table name
            Item: item,
        };

        await dynamoDb.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(item), // Optionally return the item stored
            headers: {
                'Content-Type': 'application/json',
            }
        };
    } catch (error) {
        console.error('Error fetching weather data or saving to DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Cannot fetch data' }),
        };
    }
};
