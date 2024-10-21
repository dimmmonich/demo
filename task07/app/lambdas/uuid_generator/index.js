const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const currentTime = new Date();

    // Format the timestamp to avoid invalid characters
    const formattedTimestamp = currentTime.toISOString().replace(/:/g, '-');
    const uuids = [];

    for (let i = 0; i < 10; i++) {
        uuids.push(uuidv4());
    }

    const fileContent = JSON.stringify({ ids: uuids }, null, 2);

    const params = {
        Bucket: process.env.BUCKET_NAME, // Ensure this environment variable is set
        Key: `uuids-${formattedTimestamp}.json`, // Use formatted timestamp as filename
        Body: fileContent,
        ContentType: 'application/json'
    };

    try {
        await S3.putObject(params).promise();
        console.log(`File successfully uploaded to S3: ${params.Key}`);
    } catch (error) {
        console.error('Error uploading file to S3:', error);
    }
};
