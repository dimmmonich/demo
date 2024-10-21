const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { key, value } = event.item;
        const eventId = uuidv4();
        const modificationTime = new Date().toISOString();

        const auditItem = {
            id: eventId,
            itemKey: key,
            modificationTime: modificationTime,
            newValue: {
                key: key,
                value: value,
            },
        };

        const params = {
            TableName: 'cmtr-d49b0e2c-Audit-test',
            Item: auditItem,
        };
        await dynamoDb.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                statusCode: 201,
                auditItem: auditItem,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to create audit item',
                error: error.message,
            }),
        };
    }
};
