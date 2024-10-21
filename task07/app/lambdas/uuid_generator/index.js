const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: 'eu-central-1' }); // Set your region

exports.handler = async (event) => {
    const startTime = new Date().toISOString(); // Get the current execution start time
    const bucketName = 'cmtr-d49b0e2c-uuid-storage-test'; // Replace with your bucket name
    const fileName = `uuids_${startTime}.txt`; // Generate file name with execution time

    // Generate 10 random UUIDs
    const uuids = Array.from({ length: 10 }, () => uuidv4());

    // Prepare the content for the S3 object
    const content = uuids.join('\n');

    // Create S3 PutObject command
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: content,
        ContentType: "text/plain"
    });

    try {
        // Upload the file to S3
        await s3Client.send(command);
        console.log(`Successfully uploaded ${fileName} to ${bucketName}`);
    } catch (error) {
        console.error(`Error uploading file: ${error}`);
        throw new Error(`File upload failed: ${error.message}`);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'UUIDs generated and stored successfully!', uuids }),
    };
};
