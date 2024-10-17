exports.handler = async (event) => {
    event.Records.forEach(record => {
        console.log('SQS Message:', record.body);
    });
};
