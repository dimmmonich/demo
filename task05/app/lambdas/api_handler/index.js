
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { principalId, content } = event;
        const eventId = uuidv4();
        const createdAt = new Date().toISOString();

        const eventItem = {
            id: eventId,
            principalId: principalId,
            createdAt: createdAt,
            body: content,
        };

        const params = {
            TableName: 'cmtr-d49b0e2c-Events-test',
            Item: eventItem,
        };
        await dynamoDb.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                statusCode: 201,
                event: eventItem,
            }),
        };
    } catch (error) {
        console.error('Error saving event:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to create event',
                error: error.message,
            }),
        };
    }
};