const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const requestBody = JSON.parse(event.body);
    const { principalId, content } = requestBody;

    const newEvent = {
        id: uuidv4(),
        principalId: principalId,
        createdAt: new Date().toISOString(),
        body: content
    };

    const params = {
        TableName: 'Events',
        Item: newEvent
    };

    try {
        await dynamo.put(params).promise();
        return {
            statusCode: 201,
            event: newEvent
        };
    } catch (error) {
        return {
            statusCode: 500,
            error: 'Could not create event'
        };
    }
};
