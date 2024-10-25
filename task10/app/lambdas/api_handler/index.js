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
 // Отримуємо tableId з параметрів шляху
 const tableId = event.pathParameters.id;
 console.log('Received Table ID:', tableId);

 // Перевіряємо чи передано tableId
 if (!tableId) {
  return {
   statusCode: 400,
   body: JSON.stringify({
    message: 'Bad Request: Invalid table ID format.',
   }),
  };
 }

 // Параметри для запиту до DynamoDB
 const params = {
  TableName: process.env.tables_table, // Ім'я таблиці з середовища виконання
  Key: {
   id: tableId, // Використовуємо tableId як ключ
  },
 };

 console.log('DynamoDB Query Parameters:', params);

 try {
  // Виконання запиту до DynamoDB
  const result = await docClient.get(params).promise();
  console.log('DynamoDB Result:', result);

  // Якщо стіл не знайдений
  if (!result.Item) {
   return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not Found' }),
   };
  }

  // Створюємо відповідь на основі отриманих даних
  const tableData = {
   id: parseInt(result.Item.id), // Конвертація id до числа
   number: parseInt(result.Item.number), // Конвертація number до числа
   places: parseInt(result.Item.places), // Конвертація places до числа
   isVip: result.Item.isVip, // Boolean значення
  };

  // Перевіряємо наявність minOrder
  if (result.Item.minOrder) {
   tableData.minOrder = parseInt(result.Item.minOrder); // Конвертація minOrder до числа
  }

  // Повертаємо успішну відповідь
  return {
   statusCode: 200,
   body: JSON.stringify(tableData),
  };

 } catch (error) {
  console.error('DynamoDB Error:', error);

  // У разі виникнення помилки повертаємо відповідь з кодом 500
  return {
   statusCode: 500,
   body: JSON.stringify({ message: 'Internal Server Error' }),
  };
 }
};


const getReservations = async () => {
 const reservations = await docClient
  .scan({ TableName: RESERVATIONS_TABLE })
  .promise();

 const formattedReservations = reservations.Items.map((reservation) => ({
  tableNumber: reservation.tableId,
  clientName: reservation.userId,
  phoneNumber: reservation.phoneNumber,
  date: reservation.dateTime.split('T')[0],
  slotTimeStart: reservation.dateTime.split('T')[1].slice(0, 5),
  slotTimeEnd: reservation.dateTime.split('T')[1].slice(0, 5),
 }));


return {
  statusCode: 200,
  body: JSON.stringify({ reservations: formattedReservations }),
 };
};

const createReservation = async (event) => {
 try {
  const {
   tableNumber,
   clientName,
   phoneNumber,
   date,
   slotTimeStart,
   slotTimeEnd,
  } = JSON.parse(event.body);

  if (
   !tableNumber ||
   !clientName ||
   !phoneNumber ||
   !date ||
   !slotTimeStart ||
   !slotTimeEnd
  ) {
   return {
    statusCode: 400,
    body: JSON.stringify({
     message: 'Invalid input. All fields are required.',
    }),
   };
  }

  const tableExists = await checkIfTableExists(tableNumber);
  if (!tableExists) {
   return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Table does not exist.' }),
   };
  }

  const overlappingReservations = await checkForOverlappingReservations(
   tableNumber,
   date,
   slotTimeStart,
   slotTimeEnd
  );
  if (overlappingReservations.length > 0) {
   return {
    statusCode: 400,
    body: JSON.stringify({
     message: 'There is an overlapping reservation.',
    }),
   };
  }

  // const reservationId = uuidv4();

  const params = {
   TableName: RESERVATIONS_TABLE,
   Item: {
    tableNumber: uuidv4().toString(),
    clientName,
    phoneNumber,
    date,
    slotTimeStart,
    slotTimeEnd,
   },
  };

  await docClient.put(params).promise();

  return {
   statusCode: 200,
   body: JSON.stringify({ reservationId: params.Item.tableNumber }),
  };
 } catch (error) {
  console.error('Error creating reservation:', error);
  return {
   statusCode: 400,
   body: JSON.stringify({ message: 'Error creating reservation.' }),
  };
 }
};

const checkIfTableExists = async (tableNumber) => {
 const result = await docClient
  .get({
   TableName: TABLES_TABLE,
   Key: { id: tableNumber },
  })
  .promise();

 return !!result.Item;
};

const checkForOverlappingReservations = async (
 tableNumber,
 date,
 slotTimeStart,
 slotTimeEnd
) => {
 const reservations = await docClient
  .scan({ TableName: RESERVATIONS_TABLE })
  .promise();

 const overlapping = reservations.Items.filter((reservation) => {
  const existingDate = reservation.dateTime.split('T')[0];
  const existingStartTime = reservation.dateTime.split('T')[1].slice(0, 5);
  const existingEndTime = reservation.dateTime.split('T')[1].slice(0, 5);

  return (
   existingDate === date &&
   ((slotTimeStart < existingEndTime && slotTimeEnd > existingStartTime) ||
    (existingStartTime < slotTimeEnd && existingEndTime > slotTimeStart))
  );
 });

 return overlapping;
};
