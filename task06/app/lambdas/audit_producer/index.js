const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const Records = event.Records || [];

        for (const record of Records) {
            if (record.eventName === 'INSERT') {
                const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

                const auditEntry = {
                    id: uuidv4(),
                    itemKey: newImage.key,
                    modificationTime: new Date().toISOString(),
                    newValue: {
                        key: newImage.key,
                        value: newImage.value
                    }
                };

                const params = {
                    TableName: 'cmtr-d49b0e2c-Audit-test',
                    Item: auditEntry
                };

                await dynamoDb.put(params).promise();
            }

            if (record.eventName === 'MODIFY') {
                const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
                const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

                const auditEntry = {
                    id: uuidv4(),
                    itemKey: newImage.key,
                    modificationTime: new Date().toISOString(),
                    updatedAttribute: 'value',
                    oldValue: oldImage.value,
                    newValue: newImage.value
                };

                const params = {
                    TableName: 'cmtr-d49b0e2c-Audit-test',
                    Item: auditEntry
                };

                await dynamoDb.put(params).promise();
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Audit entries created successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to create audit entry',
                error: error.message,
            }),
        };
    }
};
