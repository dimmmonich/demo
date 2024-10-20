const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        // Переконайтеся, що це вставка або зміна
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            // Отримуємо новий образ
            const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
            // Формуємо об'єкт для запису в таблицю Audit
            const auditEntry = {
                id: uuidv4(), // Генеруємо UUID
                itemKey: newImage.key, // Витягуємо ключ
                modificationTime: new Date().toISOString(), // Поточний час в ISO форматі
                newValue: {
                    key: newImage.key, // Той самий ключ
                    value: newImage.value // Значення, що потрібно зберегти
                }
            };

            // Додати оновлене значення, якщо подія це зміна
            if (record.eventName === 'MODIFY') {
                const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
                auditEntry.updatedAttribute = "value";
                auditEntry.oldValue = oldImage.value;
                auditEntry.newValue = newImage.value;
            }

            // Логування для перевірки
            console.log("Audit entry constructed:", JSON.stringify(auditEntry, null, 2));
            // Записуємо в таблицю Audit
            const params = {
                TableName: 'cmtr-d49b0e2c-Audit-test',
                Item: auditEntry,
            };

            try {
                await dynamoDb.put(params).promise();
                console.log("Audit entry created:", JSON.stringify(auditEntry, null, 2));
            } catch (error) {
                console.error("Failed to write to Audit table:", error);
            }
        }
    }
};
