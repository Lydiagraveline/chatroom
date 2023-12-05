const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

require('dotenv').config();
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(process.env.MONGO_URI)
  //  .then(x => console.log(`Connected the Database: "${x.connections[0].name}"`))
  // .catch(err => console.error('Error connecting to mongo', err));
  .then(() => console.log('Connected to database'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

  // Define a Mongoose schema for the chat message
const chatMessageSchema = new mongoose.Schema({
  room: String,
  userId: String,
  message: String,
});

// Create a Mongoose model using the schema
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

const firstQuestions = [
  "What name does your species call itself?",
  "What is the social structure of your pod? Of your general species?",
  "What species of Cetaceans are able to communicate with each other?",
  "Why do entire pods strand themselves?",
  "Are there environmental changes that are concerning to cetaceans?",
  "What are the most important things that we can do to help you?",
  "Do you have some way of preserving your knowledge, such as an oral tradition and mnemonic devices? If yes, what is the oldest memory or oral tradition that your species has?",
  "Does your species remember living on land?",
  "Do you perceive that your echolocation has an effect on human bodies?",
  "Do dolphins purposefully use their echolocation to affect humans physically, mentally or emotionally?",
  "Why do some dolphins save human lives?",
  "Do Cetaceans believe in a powerful entity that created the world?",
  "Do Cetaceans believe in an Afterlife?",
  "Is there important knowledge about the ocean which you think mankind is unaware of? Will you share that information with us?",
  "What would you like to know about humans that you have not been able to understand?",
  "Our evolutionary science/fossil records show that modern cetaceans evolved long before modern man. Some ancient human texts and several aboriginal creation legends claim that cetaceans have been observing mankind for a very long time and that you have played a role in our development. Is this true?",
  "Are cetaceans in communication with other animals on this planet?",
  "What ocean animals or organisms do you fear? ?",
  "Are cetaceans in communication with life forms beyond this planet?",
  "Does your species know what this planet looks like from space?",
  "Are you aware of any extraterrestrial life visiting Earth?",
  "Are we able to communicate with you without speaking?"
];

// Transform the array into an array of objects with index and question properties
const formattedQuestions = firstQuestions.map((question, index) => ({ index, question }));

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
    // Send room names to the client
  socket.emit('room names', formattedQuestions);

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

formattedQuestions.forEach(room => {
  const roomIndex = room.index;
   handleRoomConnection(roomIndex);
});

// Function to handle connections to a specific room
function handleRoomConnection(roomName) {
  io.of(`${roomName}`).on('connection', (socket) => {
    console.log(roomName);
    const room = roomName;
    const username = socket.id;
     joinRoom(socket, room, username);

    socket.on('chat message', async (msg) => {
      await saveMessage(room, username, msg.message);
      io.of(room).emit('chat message', { userId: username, message: msg.message });
    });
  });
}

// Redirect root URL to serve the 'index.html' file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
