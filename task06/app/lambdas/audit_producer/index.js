const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const Records = event.Records || [];

    for (const record of Records) {
        if (record.eventName === 'INSERT') {
            // Обробка нової конфігурації
            const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

            const auditEntry = {
                id: uuidv4(), // Генерація нового UUID
                itemKey: newImage.key, // Використання ключа конфігурації
                modificationTime: new Date().toISOString(), // Формат ISO 8601
                newValue: {
                    key: newImage.key, // Використання ключа конфігурації
                    value: newImage.value // Використання нового значення
                }
            };

            const params = {
                TableName: 'cmtr-d49b0e2c-Audit-test',
                Item: auditEntry
            };

            await dynamoDb.put(params).promise();
        }

        if (record.eventName === 'MODIFY') {
            // Обробка зміни конфігурації
            const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
            const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

            const auditEntry = {
                id: uuidv4(), // Генерація нового UUID
                itemKey: newImage.key, // Використання ключа конфігурації
                modificationTime: new Date().toISOString(), // Формат ISO 8601
                updatedAttribute: 'value', // Зазначення, що змінилося
                oldValue: oldImage.value, // Використання старого значення
                newValue: newImage.value // Використання нового значення
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
};
