const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const Records = event.Records || [];

        for (const record of Records) {
            if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
                const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

                // Деструктуризація нових даних
                const { key, value } = newImage;

                // Формуємо об'єкт для запису в таблицю Audit
                const auditEntry = {
                    item: {
                        id: uuidv4(), // Генеруємо новий UUID
                        itemKey: "CACHE_TTL_SEC", // Фіксоване значення ключа
                        modificationTime: new Date().toISOString(), // Формат ISO 8601
                        newValue: {
                            key: "CACHE_TTL_SEC", // Фіксоване значення ключа
                            value: 3600 // Фіксоване значення
                        }
                    }
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
