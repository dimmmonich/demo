exports.handler = async (event) => {
    // Extract the request path and HTTP method from the event object
    const requestPath = event.path;
    const httpMethod = event.httpMethod;

    // Check if the request path is '/hello'
    if (requestPath === '/hello' && httpMethod === 'GET') {
        // Return the success response
        return {
            statusCode: 200,
            message: 'Hello from Lambda',
        };
    } else {
        // Return the 400 Bad Request response for any other path or method
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: `Bad request syntax or unsupported method. Request path: ${requestPath}. HTTP method: ${httpMethod}`,
            }),
        };
    }
};
