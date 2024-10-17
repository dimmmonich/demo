exports.handler = async (event) => {
    event.Records.forEach(record => {
        console.log('SNS Message:', record.Sns.Message);
    });
};
