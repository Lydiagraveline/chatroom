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
  
  
  const preloadAudioBtn = document.querySelector("#preloadAudioBtn");

  // Function to preload audio
function preloadAudio(url) {
  const audio = new Audio();
  audio.src = url;
  audio.preload = "auto";
  
  // Optionally, you can attach an event listener to handle the 'loadeddata' event
  // audio.addEventListener('loadeddata', () => {
  //     console.log(`Audio ${url} preloaded successfully`);
  // });
  
  return audio;
}
  
// request whistle siganture
function playAudio() {
  console.log("Requesting randomized audio sequence from the server...");
  
  // Send a request to the server to get a randomized audio sequence
  socket.emit('request audio signature');

  socket.on('assign audio signature', function (sequence) {
    console.log("Received randomized audio sequence:", sequence);
    // show the room selection menu
    showRoomSelection();

    // Play the audio files in the randomized sequence
    // sequence.forEach((audioIndex, index) => {
    //   setTimeout(() => {
    //     playSingleAudio(audioIndex);
    //   }, index * 150); // Adjust the delay between audio files as needed
    // });

    playSequence(sequence);
  });
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

  preloadAudioBtn.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevents the default touch behavior, as we're handling it manually
    playAudio();
  });
  
  preloadAudioBtn.addEventListener('click', () => {
    playAudio();
  });