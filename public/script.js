let userId;
// Initialize the socket object
let socket = io();

  // Preload each audio file and add it to the audioArray
  const whistleArray = [
    preloadAudio("sounds/088_whistle.wav"),
     preloadAudio("sounds/089_whistle.wav"),
     preloadAudio("sounds/076_whistle.wav"),
     preloadAudio("sounds/078_whistle.mp3"),
     preloadAudio("sounds/097_whistle.wav"),
     preloadAudio("sounds/096_whistle.wav"),
  ];
  

  // id is not random, its the socket.id generated when the user connects to the server (which is different then the socket.id generated each time the user enters a new room)
  function generateRandomUserId() {
    
  // userId = Math.random().toString(36).substr(2, 10);
  // localStorage.setItem('userId', userId);
  socket.on("assign id", function(globalSocketId ) {
    console.log("assigned id");
    userId = globalSocketId; 
    }
  )
  console.log(userId);
  // console.log(whistleArray);
  
  }

  function createRoomButtons(roomNames) {
    const container = $('#room-selection');
    roomNames.forEach((room) => {
     const { index, question } = room;
      const button = `<button class="roomBtn" onclick="joinRoom('${index}','${question}')">${question}</button>`;
      container.append(button);
    });
  }

  function playSequence(sequence){
    console.log("playing ", sequence);
        // Play the audio files in the randomized sequence
        sequence.forEach((audioIndex, index) => {
          setTimeout(() => {
            playSingleAudio(audioIndex);
          }, index * 150); // Adjust the delay between audio files as needed
        });
  }


  function joinRoom(selectedRoom, question) {
    // socket.disconnect();  // Disconnect from the previous room
    socket = io(`/${selectedRoom}`);
    // console.log(socket);
    $('#room-selection').hide();
    $('#chat-container').show();
    const titleElement = document.getElementById('roomName');
    titleElement.innerText = `${question}`; // Update the room title header

    // Send the user ID to the server
    socket.emit('set userId', userId);

    // Request chat history when joining a room
    socket.on('connect', function () {
      socket.emit('request history');
      socket.emit('room joined', userId);
  });

  // Handle chat history
  socket.on('chat history', function (history) {
    $('#messages').empty(); // Clear existing messages
    for (const msg of history) {
      // Check if the message has valid properties before displaying
      if (msg && msg.userId !== undefined && msg.message !== undefined) {
        $('#messages').append($('<li>').text(`${msg.userId}: ${msg.message}`));
      }
    }
  });

   // Handle sending new messages
   $('form').submit(function () {
    const message = $('#m').val();
    if (message.trim() !== '') {
      socket.emit('sent message', { userId, message });
      $('#m').val('');
    }
    return false;
  });

  // Handle receiving and displaying new messages
  socket.on('emit message', function (msg) {
    // Assuming msg is an object with properties userId and message
    if (msg && msg.userId !== undefined && msg.message !== undefined) {
      $('#messages').append($('<li>').text(`${msg.userId}: ${msg.message}`));
    }
  });

    // Handle the 'new user joined' event
    socket.on('new user joined', function (newUser) {
      console.log(`A new user joined the room: ${newUser}`);
      
    });

    socket.on('play sequence', function (sequence) {
     
      playSequence(sequence);
    });

} // join room



  // Handle leaving a room
  function leaveRoom() {
    console.log("left room");
    socket.emit('leave room', userId);

    socket.disconnect(); // disconnect from the room socket

    $('#chat-container').hide();
    $('#room-selection').show();
  }


  document.addEventListener('DOMContentLoaded', function () {
    socket.emit('request room names');
    socket.on('room names', function (formattedQuestions) {
        createRoomButtons(formattedQuestions);
        // generateRandomUserId();
        // socket.emit("bang");
    });

    socket.on("assign id", function(globalSocketId ) {
      console.log("assigned id");
      userId = globalSocketId; 
      console.log(userId);

      socket.emit("client info", { userId, whistleArray });
      })
    
  });


  // // // // // // // // // // // // // // 
  // WELCOME SCREEN AND INITIALIZE AUDIO //
  // // // // // // // // // // // // // // 
  function showRoomSelection() {
    $('#welcomeContainer').hide();
    $('#room-selection').show();
    //document.getElementById("welcomeContainer").style.display = "none";
  }
  

function preloadAudio(url) {
  const audio = new Audio();
  audio.src = url;
  audio.preload = "auto";
  // Add event listener to handle loadeddata event
  audio.addEventListener('loadeddata', () => {
    // console.log(`Audio ${url} preloaded successfully`);
  });
  return audio;
}

// Function to create an audio buffer
async function createAudioBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

// Create an audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
// request whistle siganture
async function initAudio() {
  console.log("Requesting randomized audio sequence from the server...");
  socket.emit('request audio signature'); // Send a request to the server to get a randomized audio sequence

  socket.on('assign audio signature', async function (sequence) {
    console.log("Received randomized audio sequence:", sequence);
    // show the room selection menu
    showRoomSelection();
     // Create an array of audio buffers
     const audioBuffers = await Promise.all(sequence.map(index => createAudioBuffer(whistleArray[index].src)));

     // Play the audio files in the randomized sequence
     audioBuffers.forEach((buffer, index) => {
       const source = audioContext.createBufferSource();
       source.buffer = buffer;
       source.connect(audioContext.destination);
       source.start(audioContext.currentTime + index * 0.15); // Adjust the delay between audio files as needed
     });
  });
}

// Add a check for iOS devices
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function playSingleAudio(audioIndex) {
  const selectedAudio = whistleArray[audioIndex];

  // Check if the audio is already playing, if yes, pause and reset
  if (!selectedAudio.paused) {
    selectedAudio.pause();
    selectedAudio.currentTime = 0;
  }

  // console.log("Playing audio at index", audioIndex);
  // Play the selected audio
  selectedAudio.play();
}

const preloadAudioBtn = document.querySelector("#preloadAudioBtn");

preloadAudioBtn.addEventListener('touchstart', async (event) => {
  event.preventDefault();
  // Wrap the code in a try-catch block to handle the Promise rejection
  try {
    // Play audio only if the user is on an iOS device
    if (isIOS()) {
      await initAudio();
    }
  } catch (error) {
    console.error('Error playing audio:', error);
    // Handle the error, e.g., show a message to the user
  }
});

preloadAudioBtn.addEventListener('click', async () => {
  // Wrap the code in a try-catch block to handle the Promise rejection
  try {
    // Play audio if the user is not on an iOS device
    if (!isIOS()) {
      await initAudio();
    }
  } catch (error) {
    console.error('Error playing audio:', error);
    // Handle the error, e.g., show a message to the user
  }
});