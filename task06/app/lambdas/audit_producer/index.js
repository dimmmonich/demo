const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    for (const record of event.Records) {
        const { eventName, dynamodb } = record;

        if (eventName === 'INSERT' || eventName === 'MODIFY') {
            const newValue = dynamodb.NewImage;
            const key = newValue.key.S;  // Ім'я ключа конфігураційного елемента
            const value = parseInt(newValue.value.N, 10);  // Нове значення

            const auditEntry = {
                id: uuidv4(),  // Генеруємо унікальний ID для аудиторського запису
                itemKey: key,
                modificationTime: new Date().toISOString(),  // Час модифікації
                newValue: { key, value }  // Нове значення
            };

            // Логіка для події MODIFY
            if (eventName === 'MODIFY') {
                const oldValue = parseInt(dynamodb.OldImage.value.N, 10);  // Старе значення
                auditEntry.updatedAttribute = "value";  // Поле, яке було змінене
                auditEntry.oldValue = oldValue;  // Старе значення
                auditEntry.newValue = value;  // Нове значення
            }

            // Записуємо аудиторський запис в таблицю Audit
            await dynamoDB.put({
                TableName: 'cmtr-d49b0e2c-Audit',  // Замінити на правильну назву таблиці
                Item: auditEntry
            }).promise();
        }
    }
};
