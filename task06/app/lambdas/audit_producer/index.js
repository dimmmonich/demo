const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log("Received DynamoDB event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        // Check if the event is an INSERT or MODIFY event
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            // Extract new image from the record
            const newImage = record.dynamodb.NewImage;

            const auditEntry = {
                id: uuidv4(), // Generate a UUID for the audit entry
                itemKey: newImage.key.S, // Assuming 'key' is the primary key in Configuration
                modificationTime: new Date().toISOString(), // Current time in ISO format
                newValue: {
                    key: newImage.key.S,
                    value: parseInt(newImage.value.N, 10) // Convert string to int
                }
            };

            // If the event is an UPDATE, include the old value
            if (record.eventName === 'MODIFY') {
                const oldImage = record.dynamodb.OldImage;
                auditEntry.oldValue = parseInt(oldImage.value.N, 10);
                auditEntry.updatedAttribute = 'value'; // Indicate what attribute was updated
            }

            // Write the audit entry to the Audit table
            try {
                await dynamoDB.put({
                    TableName: "cmtr-d49b0e2c-Audit",
                    Item: {
                        // Ensure the structure matches the expected format
                        id: auditEntry.id,
                        itemKey: auditEntry.itemKey,
                        modificationTime: auditEntry.modificationTime,
                        newValue: auditEntry.newValue,
                    }
                }).promise();
                console.log("Audit entry created:", JSON.stringify(auditEntry, null, 2));
            } catch (error) {
                console.error("Failed to write to Audit table:", error);
            }
        }
    }
};
