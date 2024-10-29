const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
// const jwt = require('jsonwebtoken');
const cognito = new AWS.CognitoIdentityServiceProvider();
const docClient = new AWS.DynamoDB.DocumentClient();

const USER_POOL_ID = process.env.cup_id;
const TABLES_TABLE = 'cmtr-d49b0e2c-Tables-test';
const RESERVATIONS_TABLE = 'cmtr-d49b0e2c-Reservations-test';
const CLIENT_ID = process.env.cup_client_id;

// const isAuthenticated = async (event) => {
//  const token = event.headers.Authorization;
//  if (!token) return false;

//  try {
//   const decoded = jwt.verify(token, process.env.cup_id);
//   return decoded;
//  } catch (error) {
//   console.error('Token verification failed:', error);
//   return false;
//  }
// };

const validatePassword = (password) => {
 const passwordRegex =
     /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$%^*-_.])[A-Za-z\d$%^*-_.]{12,}$/;
 return passwordRegex.test(password);
};

const corsHeaders = {
 "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Methods": "*",
 "Accept-Version": "*"
};

// Route handlers
const routeHandlers = {
 'POST /signup': async (event, context) =>
     handleSignUp(event, context, cognito),
 'POST /signin': async (event, context) =>
     handleSignIn(event, context, cognito),
 'GET /tables': async (event, context) => getTables(event, context),
 'POST /tables': async (event, context) => createTable(event, context),
 'GET /tables/{tableId}': async (event, context) =>
     getTableById(event, context),
 'GET /reservations': async (event, context) =>
     getReservations(event, context),
 'POST /reservations': async (event, context) =>
     createReservation(event, context),
};

// Main handler
exports.handler = async (event, context) => {
 try {
  const routeKey = `${event.httpMethod} ${event.resource}`;

  const handler =
      routeHandlers[routeKey] || routeHandlers[`GET /tables/{tableId}`];
  if (handler) {
   const response = await handler(event, context);
   return {
    ...response,
    headers: { ...response.headers, ...corsHeaders },
   };
  }

  // Fallback response if route not found
  return {
   statusCode: 404,
   headers: corsHeaders,
   body: JSON.stringify({ error: 'Route not found' }),
  };
 } catch (error) {
  console.error('Error handling request:', error);
  return {
   statusCode: 500,
   headers: corsHeaders,
   body: JSON.stringify({ error: 'Internal Server Error' }),
  };
 }
};

const initCognitoClient = () => {
 return new AWS.CognitoIdentityServiceProvider({
  region: REGION,
  credentials: AWS.config.credentials,
 });
};

// exports.handler = async (event) => {
//  try {
//   // if (['/tables', '/reservations'].includes(event.path)) {
//   //  const isAuth = await isAuthenticated(event);
//   //  if (!isAuth) {
//   //   return {
//   //    statusCode: 401,
//   //    body: JSON.stringify({ message: 'Unauthorized' }),
//   //   };
//   //  }
//   // }

//   switch (event.path) {
//    case '/signin':
//     if (event.httpMethod === 'POST') {
//      return await handleSignIn(event);
//     }
//     break;

//    case '/signup':
//     if (event.httpMethod === 'POST') {
//      return await handleSignUp(event);
//     }
//     break;

//    case '/tables':
//     if (event.httpMethod === 'GET') {
//      return await getTables();
//     }
//     if (event.httpMethod === 'POST') {
//      return await createTable(event);
//     }
//     break;

//    case '/tables/{tableId}':
//     if (event.httpMethod === 'GET') {
//      return await getTableById(event);
//     }
//     break;

//    case '/reservations':
//     if (event.httpMethod === 'GET') {
//      return await getReservations();
//     }
//     if (event.httpMethod === 'POST') {
//      return await createReservation(event);
//     }
//     break;


//    default:
//     return {
//      statusCode: 404,
//      body: JSON.stringify({ message: 'Not Found' }),
//     };
//   }
//  } catch (error) {
//   console.error(error);
//   return {
//    statusCode: 500,
//    body: JSON.stringify({ message: 'Internal Server Error' }),
//   };
//  }
// };

const handleSignIn = async (event) => {
 const { username, password, email } = JSON.parse(event.body);
 const params = {
  AuthFlow: 'ADMIN_NO_SRP_AUTH',
  ClientId: CLIENT_ID,
  UserPoolId: USER_POOL_ID,
  AuthParameters: {
   USERNAME: email,
   PASSWORD: password,
  },
 };

 try {
  const authResult = await cognito.adminInitiateAuth(params).promise();
  const idToken = authResult.AuthenticationResult.IdToken;
  return {
   statusCode: 200,
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({ accessToken: idToken }),
  };
 } catch (error) {
  console.error(error);
  return {
   statusCode: 400,
   body: JSON.stringify({ message: error.message }),
  };
 }
};

const handleSignUp = async (event) => {
 const { username, password, email } = JSON.parse(event.body);

 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(email)) {
  return {
   statusCode: 400,
   body: JSON.stringify({ message: 'Invalid email format' }),
  };
 }

 if (!validatePassword(password)) {
  return {
   statusCode: 400,
   body: JSON.stringify({ message: 'Invalid password format' }),
  };
 }

 const params = {
  ClientId: CLIENT_ID,
  Username: email,
  Password: password,
  UserAttributes: [
   {
    Name: 'email',
    Value: email,
   },
  ],
 };

 try {
  await cognito.signUp(params).promise();
  const confirmParams = {
   Username: email,
   UserPoolId: USER_POOL_ID,
  };
  await cognito.adminConfirmSignUp(confirmParams).promise();

  return {
   statusCode: 200,
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({ message: 'User registered successfully' }),
  };
 } catch (error) {
  if (error.code === 'UsernameExistsException') {
   return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Username already exists' }),
   };
  } else {
   console.error('SignUp Error:', error);
   return {
    statusCode: 500,
    body: JSON.stringify({
     error: 'Signing up failed',
     details: error.message,
    }),
   };
  }
 }
};

const getTables = async () => {
 const response = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '',
 };

 try {
  const params = {
   TableName: TABLES_TABLE,
  };
  const scanResult = await docClient.scan(params).promise();

  const tables = scanResult.Items.map((item) => {
   const tableData = {
    id: parseInt(item.id, 10),
    number: parseInt(item.number, 10),
    places: parseInt(item.places, 10),
    isVip: item.isVip,
   };

   if (item.minOrder !== undefined && item.minOrder !== null) {
    tableData.minOrder = parseInt(item.minOrder, 10);
   }

   return tableData;
  });

  response.body = JSON.stringify({ tables });
 } catch (error) {
  console.error('Error scanning DynamoDB table:', error);
  response.statusCode = 400;
  response.body = JSON.stringify({ error: 'Error creating response' });
 }

 return response;
 // const tables = await docClient.scan({ TableName: TABLES_TABLE }).promise();
 // const formattedTables = tables.Items.map((item) => ({
 //  ...item,
 //  id: Number(item.id),
 // }));

 // return {
 //  statusCode: 200,
 //  body: JSON.stringify({
 //   tables: tables.Items.map((table) => ({
 //    ...table,
 //    id: parseInt(table.id),
 //   })),
 //  }),
 // };
};

const createTable = async (event) => {
 const response = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '',
 };

 try {
  const body = JSON.parse(event.body);

  const item = {
   id: String(body.id),
   number: parseInt(body.number, 10),
   places: parseInt(body.places, 10),
   isVip: Boolean(body.isVip),
  };

  if (body.minOrder !== undefined && body.minOrder !== null) {
   item.minOrder = parseInt(body.minOrder, 10);
  }

  const params = {
   TableName: TABLES_TABLE,
   Item: item,
  };

  await docClient.put(params).promise();

  response.body = JSON.stringify({ id: body.id });
 } catch (error) {
  console.error('Error inserting item into DynamoDB:', error);
  response.statusCode = 400;
  response.body = JSON.stringify({ error: 'Internal Server Error' });
 }

 return response;
 // const { id, number, places, isVip, minOrder } = JSON.parse(event.body);

 // const existingTables = await docClient
 //  .scan({ TableName: TABLES_TABLE })
 //  .promise();
 // const existingIds = existingTables.Items.map((item) => parseInt(item.id, 10));

 // console.log('Existing IDs:', existingIds);

 // if (existingIds.includes(id)) {
 //  return {
 //   statusCode: 400,
 //   body: JSON.stringify({ error: 'Table ID already exists.' }),
 //  };
 // }

 // const params = {
 //  TableName: TABLES_TABLE,
 //  Item: {
 //   id: id.toString(),
 //   number,
 //   places,
 //   isVip,
 //   minOrder,
 //  },
 // };

 // await docClient.put(params).promise();

 // console.log('Existing IDs:', existingIds);
 // console.log('New Table ID to be assigned:', id);

 // return {
 //  statusCode: 200,
 //  body: JSON.stringify({ id: id }),
 // };
};

const getTableById = async (event) => {
 const response = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '',
 };

 try {
  const tableId = event.pathParameters.tableId;

  const getParams = {
   TableName: TABLES_TABLE,
   Key: {
    id: tableId,
   },
  };

  const result = await docClient.get(getParams).promise();

  if (!result.Item) {
   response.statusCode = 404;
   response.body = JSON.stringify({ error: 'Table not found' });
   return response;
  }

  const tableData = {
   id: parseInt(result.Item.id, 10),
   number: parseInt(result.Item.number, 10),
   places: parseInt(result.Item.places, 10),
   isVip: result.Item.isVip,
  };

  if (result.Item.minOrder) {
   tableData.minOrder = parseInt(result.Item.minOrder, 10);
  }

  response.body = JSON.stringify(tableData);
 } catch (error) {
  console.error('Error retrieving table:', error);
  response.statusCode = 500;
  response.body = JSON.stringify({ error: 'Internal Server Error' });
 }

 return response;
 // console.log('Received Event:', JSON.stringify(event, null, 2));
 // if (!event.pathParameters || !event.pathParameters.id) {
 //  console.log('Missing table ID in pathParameters.');
 //  return {
 //   statusCode: 400,
 //   body: JSON.stringify({
 //    message: 'Bad Request: Missing or invalid table ID.',
 //   }),
 //  };
 // }
 // const tableId = event.pathParameters.id;
 // console.log('Table ID extracted:', tableId);
 // if (!/^\d+$/.test(tableId)) {
 //  console.log('Invalid table ID format:', tableId);
 //  return {
 //   statusCode: 400,
 //   body: JSON.stringify({
 //    message: 'Bad Request: Invalid table ID format.',
 //   }),
 //  };
 // }
 // const params = {
 //  TableName: TABLES_TABLE,
 //  Key: {
 //   id: tableId,
 //  },
 // };
 // console.log('DynamoDB Query Parameters:', JSON.stringify(params, null, 2));
 // try {
 //  console.log('Making request to DynamoDB...');
 //  const result = await docClient.get(params).promise();
 //  console.log('DynamoDB Result:', JSON.stringify(result, null, 2));
 //  if (!result.Item) {
 //   console.log('No table found with ID:', tableId);
 //   return {
 //    statusCode: 404,
 //    body: JSON.stringify({ message: 'Not Found' }),
 //   };
 //  }
 //  console.log('Table found, returning result.');
 //  return {
 //   statusCode: 200,
 //   body: JSON.stringify(result.Item),
 //  };
 // } catch (error) {
 //  console.error('DynamoDB Error:', error);
 //  return {
 //   statusCode: 500,
 //   body: JSON.stringify({ message: 'Internal Server Error' }),
 //  };
 // }
};

const getReservations = async () => {
 const response = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '',
 };

 try {
  const scanParams = {
   TableName: RESERVATIONS_TABLE,
  };

  const data = await docClient.scan(scanParams).promise();
  const reservations = data.Items.map((item) => ({
   tableNumber: item.tableNumber,
   clientName: item.clientName,
   phoneNumber: item.phoneNumber,
   date: item.date,
   slotTimeStart: item.slotTimeStart,
   slotTimeEnd: item.slotTimeEnd,
  }));

  response.body = JSON.stringify({ reservations });
 } catch (error) {
  console.error('Error retrieving reservations:', error);
  response.statusCode = 500;
  response.body = JSON.stringify({ error: 'Internal Server Error' });
 }

 return response;
 // const reservations = await docClient
 //  .scan({ TableName: RESERVATIONS_TABLE })
 //  .promise();

 // const formattedReservations = reservations.Items.map((reservation) => ({
 //  tableNumber: reservation.tableId,
 //  clientName: reservation.userId,
 //  phoneNumber: reservation.phoneNumber,
 //  date: reservation.dateTime.split('T')[0],
 //  slotTimeStart:
 //   reservation.slotTimeStart ||
 //   reservation.dateTime.split('T')[1].slice(0, 5),
 //  slotTimeEnd: reservation.slotTimeEnd || '15:00',
 // }));

 // return {
 //  statusCode: 200,
 //  body: JSON.stringify({ reservations: formattedReservations }),
 // };
};

const createReservation = async (event) => {
 const response = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: '',
 };

 try {
  const requestBody = JSON.parse(event.body);
  const tableNumber = requestBody.tableNumber;
  const date = requestBody.date;
  const slotTimeStart = moment(requestBody.slotTimeStart, 'HH:mm');
  const slotTimeEnd = moment(requestBody.slotTimeEnd, 'HH:mm');

  const tableCheckParams = {
   TableName: TABLES_TABLE,
   FilterExpression: '#number = :numberValue',
   ExpressionAttributeNames: { '#number': 'number' },
   ExpressionAttributeValues: { ':numberValue': tableNumber },
  };

  const tableScanResult = await docClient.scan(tableCheckParams).promise();
  if (tableScanResult.Count < 1) {
   response.statusCode = 400;
   response.body = JSON.stringify({ error: 'Table not found' });
   return response;
  }

  const reservationCheckParams = {
   TableName: RESERVATIONS_TABLE,
   FilterExpression: '#tableNumber = :tableNumberValue',
   ExpressionAttributeNames: { '#tableNumber': 'tableNumber' },
   ExpressionAttributeValues: { ':tableNumberValue': tableNumber },
  };

  const reservationsScanResult = await docClient
      .scan(reservationCheckParams)
      .promise();
  for (const reservation of reservationsScanResult.Items) {
   const reservationDate = reservation.date;
   const reservationStart = moment(reservation.slotTimeStart, 'HH:mm');
   const reservationEnd = moment(reservation.slotTimeEnd, 'HH:mm');

   if (
       reservationDate === date &&
       (slotTimeStart.isBetween(
               reservationStart,
               reservationEnd,
               null,
               '[]'
           ) ||
           slotTimeEnd.isBetween(reservationStart, reservationEnd, null, '[]'))
   ) {
    response.statusCode = 400;
    response.body = JSON.stringify({
     error: 'Time slot is already reserved',
    });
    return response;
   }
  }

  const reservationId = uuidv4();
  const putParams = {
   TableName: RESERVATIONS_TABLE,
   Item: {
    id: reservationId,
    tableNumber: tableNumber,
    clientName: requestBody.clientName,
    phoneNumber: requestBody.phoneNumber,
    date: date,
    slotTimeStart: requestBody.slotTimeStart,
    slotTimeEnd: requestBody.slotTimeEnd,
   },
  };

  await docClient.put(putParams).promise();

  response.statusCode = 200;
  response.body = JSON.stringify({ reservationId: reservationId });
 } catch (error) {
  console.error('Error processing reservation:', error);
  response.statusCode = 500;
  response.body = JSON.stringify({
   error: 'Internal Server Error',
   message: error.message,
  });
 }

 return response;
 // try {
 //  const {
 //   tableNumber,
 //   clientName,
 //   phoneNumber,
 //   date,
 //   slotTimeStart,
 //   slotTimeEnd,
 //  } = JSON.parse(event.body);


//  const existingReservations = await docClient
 //   .query({
 //    TableName: RESERVATIONS_TABLE,
 //    KeyConditionExpression:
 //     '#tableId = :tableId and begins_with(#dateTime, :date)',
 //    ExpressionAttributeNames: {
 //     '#tableId': 'tableId',
 //     '#dateTime': 'dateTime',
 //    },
 //    ExpressionAttributeValues: {
 //     ':tableId': tableNumber,
 //     ':date': date,
 //    },
 //   })
 //   .promise();

 //  const isConflict = existingReservations.Items.some((reservation) => {
 //   const existingStart = reservation.slotTimeStart;
 //   const existingEnd = reservation.slotTimeEnd;
 //   return (
 //    (slotTimeStart < existingEnd && slotTimeStart >= existingStart) ||
 //    (slotTimeEnd > existingStart && slotTimeEnd <= existingEnd) ||
 //    (slotTimeStart <= existingStart && slotTimeEnd >= existingEnd)
 //   );
 //  });

 //  if (isConflict) {
 //   return {
 //    statusCode: 400,
 //    body: JSON.stringify({
 //     message:
 //      'Conflict: The requested reservation overlaps with an existing one.',
 //    }),
 //   };
 //  }

 //  const reservationId = uuidv4();

 //  const params = {
 //   TableName: RESERVATIONS_TABLE,
 //   Item: {
 //    id: reservationId,
 //    tableId: tableNumber,
 //    userId: clientName,
 //    phoneNumber,
 //    dateTime: ${date}T${slotTimeStart},
 //   },
 //  };

 //  await docClient.put(params).promise();

 //  return {
 //   statusCode: 200,
 //   body: JSON.stringify({ reservationId: params.Item.id }),
 //  };
 // } catch (error) {
 //  console.error('Error creating reservation:', error);
 //  return {
 //   statusCode: 400,
 //   body: JSON.stringify({ message: 'Error creating reservation.' }),
 //  };
 // }
};