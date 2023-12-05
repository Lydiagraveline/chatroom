let userId;
// Initialize the socket object
let socket = io();

  function generateRandomUserId() {
  userId = Math.random().toString(36).substr(2, 10);
  localStorage.setItem('userId', userId);
  console.log(userId);
  }

  function createRoomButtons(roomNames) {
    const container = $('#room-selection');
    roomNames.forEach((room) => {
     const { index, question } = room;
      const button = `<button class="roomBtn" onclick="joinRoom('${index}')">${question}</button>`;
      container.append(button);
    });
  }

  function joinRoom(selectedRoom) {
    socket = io(`/${selectedRoom}`);
    console.log(socket);
    $('#room-selection').hide();
    $('#chat-container').show();

    // Send the user ID to the server
    socket.emit('set userId', userId);

    // Request chat history when joining a room
    socket.on('connect', function () {
      socket.emit('request history');
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
      socket.emit('chat message', { userId, message });
      $('#m').val('');
    }
    return false;
  });

  // Handle receiving and displaying new messages
  socket.on('chat message', function (msg) {
    // Assuming msg is an object with properties userId and message
    if (msg && msg.userId !== undefined && msg.message !== undefined) {
      $('#messages').append($('<li>').text(`${msg.userId}: ${msg.message}`));
    }
  });
}

  // Handle leaving a room
  function leaveRoom() {
    socket.emit('leave room');
    $('#chat-container').hide();
    $('#room-selection').show();
  }


  document.addEventListener('DOMContentLoaded', function () {
    socket.emit('request room names');
    socket.on('room names', function (formattedQuestions) {
        createRoomButtons(formattedQuestions);
        generateRandomUserId();
    });
  });