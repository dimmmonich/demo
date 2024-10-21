const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const bucketName = 'cmtr-d49b0e2c-uuid-storage-test';
    const fileName = `uuids-${Date.now()}.txt`;

    let uuids = '';
    for (let i = 0; i < 10; i++) {
        uuids += uuidv4() + '\n';
    }

    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: uuids,
    };

    try {
        await s3.putObject(params).promise();
        console.log(`File ${fileName} successfully saved to ${bucketName}`);
    } catch (error) {
        console.error('Error writing to S3:', error);
        throw new Error('Failed to write file to S3');
    }
};
