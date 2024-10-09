exports.handler = async (event) => {
    // Отримуємо шлях та метод з об'єкта event
    const requestPath = event.rawPath;
    const httpMethod = event.requestContext.http.method;

    // Перевіряємо, чи є шлях '/hello'
    if (requestPath === '/hello' && httpMethod === 'GET') {
        // Повертаємо успішну відповідь
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Hello from Lambda!'
            }),
        };
    } else {
        // Повертаємо помилку 400 Bad Request для будь-якого іншого шляху або методу
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: `Bad request syntax or unsupported method. Request path: ${requestPath}. HTTP method: ${httpMethod}`,
            }),
        };
    }
};

