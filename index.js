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

function getSocketIdByUserId(userId) {
  for (const [socketId, clientInfo] of connectedClients.entries()) {
    if (clientInfo.userId === userId) {
      return socketId; // Return the socket.id if the userId matches
    }
  }
  return null; // Return null if the userId is not found
}



// Function to leave a room
function leaveRoom(socket, room) {
  socket.leave(room);
  io.of(room).emit('user left', socket.id); // Broadcast user leaving to all clients in the room
}

// Function to join a room
async function joinRoom(socket, room, user) {
  //join the room
  socket.join(room);
  console.log(user + " joined room " +  room);
  // Broadcast to all clients in the room except the newly joined user
  socket.broadcast.to(room).emit('new user joined', user);

// Get user info from connectedClients Map using socket.id
let userInfo = connectedClients.get(user);

if (userInfo && userInfo.randomizedSequence) {
  const whistleSignature = userInfo.randomizedSequence; 
  console.log("sequence", whistleSignature);
  socket.to(room).emit('play sequence', whistleSignature);
} else {
  console.error("userInfo or randomizedSequence not available.");
}
  const history = await getRoomMessages(room);
  socket.emit('chat history', history);
}//join room

// Handle connections to the server
io.on('connection', (socket) => {
  // connectedClients.set(socket.id);
  //const globalSocketId = socket.id;
  socket.emit('assign id', socket.id);
  console.log('User connected');
  
  socket.emit('room names', formattedQuestions);

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    socket.emit('room left');
    console.log('User disconnected');
  }); 

  // Handle the client info including the whistleArray
  socket.on('client info', ({ userId, whistleArray }) => {
    connectedClients.set(socket.id, { userId, whistleArray });
    //console.log(connectedClients);
   // console.log(connectedClients)
  });

  // Handle the request for a randomized audio sequence
  socket.on('request audio signature', () => {
  // Get the client information, including whistleArray
  const clientInfo = connectedClients.get(socket.id);

  if (clientInfo && clientInfo.whistleArray) {
    const { whistleArray } = clientInfo;
    // console.log("Generating randomized audio sequence...");

    // Define the array of audio indices (corresponding to whistleArray)
    const audioIndices = [...Array(whistleArray.length).keys()];

    // Shuffle the array of audio indices to get a randomized sequence
    const shuffledIndices = audioIndices.sort(() => Math.random() - 0.5);
    console.log(shuffledIndices);
    // console.log(shuffledIndices)

    // Take the first 3 indices from the shuffled sequence
    const selectedIndices = shuffledIndices.slice(0, 3);
    // console.log(selectedIndices);

    // Save the randomized audio sequence in the connectedClients array
    connectedClients.set(socket.id, { ...clientInfo, randomizedSequence: selectedIndices });
    //  console.log(connectedClients)

    // Send the selected audio indices back to the client
    socket.emit('assign audio signature', selectedIndices);
  } else {
    console.error("Client information or whistleArray not available.");
  }
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
    const roomSpecificSocketId = `${socket.id}_${room}`;
    //console.log(socket.id);
    
   

    // emit user joined
   // io.of(room).broadcast('new user joined', socket.id);
    //socket.broadcast.emit('bang'); // send to all clients except the sender
    //
    socket.on('room joined', (userId) => {
      joinRoom(socket, room, userId);
      // console.log("user joined room ", room);
      //console.log(userId);
      //console.log(connectedClients);
    })

    //handling incoming chat messages, saving them and then emiting them to the room
    socket.on('sent message', async ( msg) => {
      await saveMessage(room, msg.userId, msg.message);
      io.of(room).emit('emit message', { userId: msg.userId, message: msg.message });
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
