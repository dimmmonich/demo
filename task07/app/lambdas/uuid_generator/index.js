const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    const ids = Array.from({ length: 10 }, () => uuidv4());
    const timeStamp = new Date().toISOString();
    const fileName = `${timeStamp}.json`;
    const fileContent = JSON.stringify({ ids }, null, 2);

    const params = {
        Bucket: 'cmtr-d49b0e2c-uuid-storage-test', // Replace with your bucket name
        Key: fileName,
        Body: fileContent,
        ContentType: 'application/json'
    };

    try {
        await s3.putObject(params).promise();
        console.log(`File ${fileName} created successfully.`);
    } catch (error) {
        console.error(`Error creating file: ${error}`);
        throw error;
    }
};
