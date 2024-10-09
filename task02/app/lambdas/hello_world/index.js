exports.handler = async (event) => {

    const requestPath = event.rawPath;
    const httpMethod = event.requestContext.http.method;


    if (requestPath === '/hello' && httpMethod === 'GET') {

        return {
            statusCode: 200,
            body: {
                statusCode: 200,
                message: 'Hello from Lambda'
            },
        };
    } else {

        return {
            statusCode: 400,
            body: {
                statusCode: 400,
                message: `Bad request syntax or unsupported method. Request path: ${requestPath}. HTTP method: ${httpMethod}`,
            },
        };
    }
};

