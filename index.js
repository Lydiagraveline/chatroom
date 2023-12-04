const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// app.use(
//   cors({
//     origin: ["http://localhost:3000", process.env.ORIGIN],
//   })
// );


require('dotenv').config();
// const { MongoClient } = require('mongodb');
const mongoURI = process.env.MONGO_URI;
// Initialize MongoDB client
// const client = new MongoClient(mongoURI, {});

// const dbName = 'dolphin-communication';
// const collectionName = 'chatlog';

mongoose
  .connect(process.env.MONGO_URI)
   .then(x => console.log(`Connected the Database: "${x.connections[0].name}"`))
  // .catch(err => console.error('Error connecting to mongo', err));
  // /.then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

  // Define a Mongoose schema for the chat message
const chatMessageSchema = new mongoose.Schema({
  room: String,
  userId: String,
  message: String,
});

// Create a Mongoose model using the schema
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Function to save messages to MongoDB using Mongoose
async function saveMessage(room, userId, message) {
  try {
    const chatMessage = new ChatMessage({ room, userId, message });
    const result = await chatMessage.save();
    console.log('Insertion successful:', result);
  } catch (error) {
    console.error('Error saving message to MongoDB:', error);
    throw error;
  }
}

// Function to retrieve messages from MongoDB for a room using Mongoose
async function getRoomMessages(room) {
  try {
    const messages = await ChatMessage.find({ room }).exec();
    console.log('Retrieved Messages:', messages);
    return messages;
  } catch (error) {
    console.error('Error retrieving messages from MongoDB:', error);
    throw error;
  }
}

// Function to connect to MongoDB and return the messages collection
// async function connectToDatabase() {
//   //previous method using mongodb
//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     return db.collection(collectionName);
//   } catch (error) {
//     console.error('Error connecting to MongoDB:', error);
//     throw error;
//   }
// }

// // Function to save messages to MongoDB
// async function saveMessage(room, userId, message) {
//   try {
//     const messagesCollection = await connectToDatabase();
//     const result =  await messagesCollection.insertOne({ room, userId, message });
//     console.log('Insertion successful:', result);
//   } catch (error) {
//     console.error('Error saving message to MongoDB:', error);
//     throw error;
//   }
// }

// // Function to retrieve messages from MongoDB for a room
// async function getRoomMessages(room) {
//   const messagesCollection = await connectToDatabase();
//   const messages = await messagesCollection.find({ room }).toArray();
//   console.log('Retrieved Messages:', messages);
//   return messages;
// }

// Function to leave a room
function leaveRoom(socket, room) {
  socket.leave(room);
}

// Function to join a room
async function joinRoom(socket, room) {
  socket.join(room);
  const history = await getRoomMessages(room);
  socket.emit('chat history', history);
}

// Handle connections to different rooms
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Handle leaving a room
  socket.on('leave room', () => {
    const rooms = Object.keys(socket.rooms).filter(item => item !== socket.id);
    rooms.forEach(room => {
      leaveRoom(socket, room);
      socket.emit('room left');
    });
  });

  // Request chat history when joining a room
  socket.on('request history', async () => {
    const room = Object.keys(socket.rooms).find(item => item !== socket.id);
    if (room) {
      const history = await getRoomMessages(room);
      socket.emit('chat history', history);
    }
  });
});


// Handle chat messages in specific rooms
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Handle leaving a room
  socket.on('leave room', () => {
    const rooms = Object.keys(socket.rooms).filter(item => item !== socket.id);
    rooms.forEach(room => {
      leaveRoom(socket, room);
      socket.emit('room left');
    });
  });
});

// Handle chat messages in specific rooms
io.of('/room1').on('connection', (socket) => {
  const room = '/room1';
  const username = socket.id;
  joinRoom(socket, room, username);

  socket.on('chat message', async (msg) => {
    await saveMessage(room, username, msg.message); // Extract the message from the object
    io.of(room).emit('chat message', { userId: username, message: msg.message });
  });
});

io.of('/room2').on('connection', (socket) => {
  const room = '/room2';
  const username = socket.id;
  joinRoom(socket, room, username);

  socket.on('chat message', async (msg) => {
    await saveMessage(room, username, msg.message); // Extract the message from the object
    io.of(room).emit('chat message', { userId: username, message: msg.message });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
