const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const cors = require('cors');

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

require('dotenv').config();
// const mongoURI = process.env.MONGO_URI;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://dolphin-chat.fly.dev", "*", process.env.ORIGIN],
  })
);

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
  timestamp: {
    type: Date,
    default: Date.now
}
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

// Create a Map to store client information
const connectedClients = new Map();

// Function to save messages to MongoDB using Mongoose
async function saveMessage(room, userId, message) {
  try {
    const chatMessage = new ChatMessage({ room, userId, message });
    const result = await chatMessage.save();
    // console.log('Insertion successful:', result);
  } catch (error) {
    console.error('Error saving message to MongoDB:', error);
    throw error;
  }
}

// Function to retrieve messages from MongoDB for a room using Mongoose
async function getRoomMessages(room) {
  try {
    // const messages = await ChatMessage.find({ room }).exec();
    const messages = await ChatMessage.find({ room }).sort({ timestamp: 1 }).exec();
    return messages;
  } catch (error) {
    console.error('Error retrieving messages from MongoDB:', error);
    throw error;
  }
}

// Function to leave a room
function leaveRoom(socket, room) {
  socket.leave(room);
  io.of(room).emit('user left', socket.id); // Broadcast user leaving to all clients in the room
}

// Function to join a room
async function joinRoom(socket, room, user) {
  // console.log(socket.id);
  //join the room
  socket.join(room);
  //socket.currentRoom = room; // Store the current room on the socket

  // Broadcast to all clients in the room except the newly joined user
  socket.broadcast.to(room).emit('new user joined', user);

    // Send an introduction and room prompt to the user
      const introduction = `Welcome to the ${room} room!`;
      const roomPrompt = 'What are your thoughts on this topic? Share your speculative ideas!';
      socket.emit('introduction', { introduction, roomPrompt });


  const history = await getRoomMessages(room);
  socket.emit('chat history', history);
}//join room

// Handle connections to specific rooms
io.on('connection', (socket) => {
  connectedClients.set(socket.id);
  console.log('User connected');
  socket.emit('room names', formattedQuestions);

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    socket.emit('room left ');
    console.log('User disconnected');
  }); 
  socket.on('client info', (userId) => {
    // console.log(`Received client info: ${userId}`);
    // Handle the client info as needed
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
}); //on conenctions

formattedQuestions.forEach(room => {
  const roomIndex = room.index;
   handleRoomConnection(roomIndex);
});

// Function to handle connections to a specific room
function handleRoomConnection(roomName) {
  io.of(`${roomName}`).on('connection', (socket) => {
    const room = roomName;
    const username = socket.id;
    joinRoom(socket, room, username);

    // emit user joined
   // io.of(room).broadcast('new user joined', socket.id);
    //socket.broadcast.emit('bang'); // send to all clients except the sender
    //

    socket.on('room joined', () => {
      //console.log("user joined room ", room);
    })

    //handling incoming chat messages, saving them and then emiting them to the room
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
