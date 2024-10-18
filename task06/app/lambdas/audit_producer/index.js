const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const auditTableName = process.env.target_table || 'Audit';

exports.handler = async (event) => {
    const records = event.Records;

    for (let record of records) {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
            const oldImage = record.eventName === 'MODIFY' ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) : null;

            const auditEntry = {
                id: uuidv4(),
                itemKey: newImage.key,
                modificationTime: new Date().toISOString(),
                newValue: newImage
            };

            if (oldImage) {
                auditEntry.updatedAttribute = "value";
                auditEntry.oldValue = oldImage.value;
                auditEntry.newValue = newImage.value;
            }

            const params = {
                TableName: auditTableName,
                Item: auditEntry
            };

            await dynamo.put(params).promise();
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Audit entries created successfully' })
    };
};
