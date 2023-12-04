
   let socket;
  let userId;

  function generateRandomUserId() {
  userId = Math.random().toString(36).substr(2, 10);
  localStorage.setItem('userId', userId);
  console.log(userId);
  }

function joinRoom(room) {
    console.log("join room");
    socket = io(`/${room}`);
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
