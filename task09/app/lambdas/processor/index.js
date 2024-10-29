const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Define the WeatherService class to fetch weather data
class WeatherService {
    async getWeatherForecast() {
        const url = 'https://api.open-meteo.com/v1/forecast';

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

        const id = uuidv4(); // Generate a UUID
        const item = {
            id,
            forecast: forecast // Ensure this matches your DynamoDB schema
        };

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
