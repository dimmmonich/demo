const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    for (const record of event.Records) {
        const { eventName, dynamodb } = record;

        if (eventName === 'INSERT' || eventName === 'MODIFY') {
            const newValue = dynamodb.NewImage;
            const key = newValue.key.S;
            const value = newValue.value.N;

            const auditEntry = {
                id: uuidv4(),
                itemKey: key,
                modificationTime: new Date().toISOString(),
                newValue: { key, value }
            };

            if (eventName === 'MODIFY') {
                const oldValue = dynamodb.OldImage.value.N;
                auditEntry.updatedAttribute = "value";
                auditEntry.oldValue = oldValue;
            }

            await dynamoDB.put({
                TableName: 'cmtr-d49b0e2c-Audit-test',
                Item: auditEntry
            }).promise();
        }
    }
};
