const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
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

exports.handler = async (event) => {
 try {
  // if (['/tables', '/reservations'].includes(event.path)) {
  //  const isAuth = await isAuthenticated(event);
  //  if (!isAuth) {
  //   return {
  //    statusCode: 401,
  //    body: JSON.stringify({ message: 'Unauthorized' }),
  //   };
  //  }
  // }

  switch (event.path) {
   case '/signin':
    if (event.httpMethod === 'POST') {
     return await handleSignIn(event);
    }
    break;

   case '/signup':
    if (event.httpMethod === 'POST') {
     return await handleSignUp(event);
    }
    break;

   case '/tables':
    if (event.httpMethod === 'GET') {
     return await getTables();
    }
    if (event.httpMethod === 'POST') {
     return await createTable(event);
    }
    break;

   case '/tables/{tableId}':
    if (event.httpMethod === 'GET') {
     return await getTableById(event);
    }
    break;

   case '/reservations':
    if (event.httpMethod === 'GET') {
     return await getReservations();
    }
    if (event.httpMethod === 'POST') {
     return await createReservation(event);
    }
    break;

   default:
    return {
     statusCode: 404,
     body: JSON.stringify({ message: 'Not Found' }),
    };
  }
 } catch (error) {
  console.error(error);
  return {
   statusCode: 500,
   body: JSON.stringify({ message: 'Internal Server Error' }),
  };
 }
};

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
 const tables = await docClient.scan({ TableName: TABLES_TABLE }).promise();

 return {
  statusCode: 200,
  body: JSON.stringify({
   tables: tables.Items.map((table) => ({
    ...table,
    id: parseInt(table.id), // Перетворення ID на числовий формат
   })),
  }),
 };
};

const createTable = async (event) => {
 const { id, number, places, isVip, minOrder } = JSON.parse(event.body);

 // Перевірка, чи вже існує таблиця з даним ID
 const checkParams = {
  TableName: TABLES_TABLE,
  Key: {
   id: id.toString(),
  },
 };

 const existingTable = await docClient.get(checkParams).promise();

 if (existingTable.Item) {
  return {
   statusCode: 400,
   body: JSON.stringify({ error: 'Table ID already exists.' }),
  };
 }

 const params = {
  TableName: TABLES_TABLE,
  Item: {
   id: id.toString(),
   number,
   places,
   isVip,
   minOrder,
  },
 };

 await docClient.put(params).promise();

 console.log('New Table Created with ID:', id);

 return {
  statusCode: 200,
  body: JSON.stringify({ id: id }),
 };
};
const getTableById = async (event) => {
 // Extract tableId from the path parameters
 const tableId = event.pathParameters.id;
 console.log('Received Table ID:', tableId);

 // Check if tableId is valid
 if (!tableId) {
  return {
   statusCode: 400,
   body: JSON.stringify({
    message: 'Bad Request: Invalid table ID format.',
   }),
  };
 }

 // Parameters for DynamoDB query
 const params = {
  TableName: TABLES_TABLE,  // DynamoDB table name from environment variables
  Key: { id: tableId },  // Use tableId as the key
 };

 console.log('DynamoDB Query Parameters:', params);

 try {
  // Execute the getItem query to DynamoDB
  const result = await docClient.get(params).promise();
  console.log('DynamoDB Result:', result);

  // If the table is not found
  if (!result.Item) {
   return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Table not found' }),
   };
  }

  // Build the response data based on the DynamoDB result
  const tableData = {
   id: parseInt(result.Item.id),             // Convert id to integer
   number: parseInt(result.Item.number),     // Convert number to integer
   places: parseInt(result.Item.places),     // Convert places to integer
   isVip: result.Item.isVip,                 // Boolean value
  };

  // Check if minOrder exists and add it to the response if present
  if (result.Item.minOrder) {
   tableData.minOrder = parseInt(result.Item.minOrder);  // Convert minOrder to integer
  }

  // Return a successful response
  return {
   statusCode: 200,
   body: JSON.stringify(tableData),
  };

 } catch (error) {
  console.error('DynamoDB Error:', error);

  // Return a 500 response in case of an error
  return {
   statusCode: 500,
   body: JSON.stringify({ message: 'Internal Server Error' }),
  };
 }
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