const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = new Map(); // socket.id => username
const userSockets = new Map(); // username => socket.id

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('join', (username) => {
    socket.username = username;
    users.set(socket.id, username);
    userSockets.set(username, socket.id);
    console.log(`👤 ${username} joined`);
    io.emit('user_joined', `${username} joined the chat`);
    io.emit('user_list', Array.from(userSockets.keys()));
  });

  socket.on('send_message', (data) => {
    const messageData = {
      username: socket.username || 'Anonymous',
      message: data.message,
      time: new Date().toLocaleTimeString(),
    };
    io.emit('receive_message', messageData);
  });

  socket.on('typing', () => {
    socket.broadcast.emit('user_typing', socket.username);
  });

  socket.on('private_message', ({ to, message }) => {
    const toSocketId = userSockets.get(to);
    if (toSocketId) {
      const messageData = {
        from: socket.username,
        to,
        message,
        time: new Date().toLocaleTimeString(),
      };
      io.to(toSocketId).emit('receive_private_message', messageData);
      socket.emit('receive_private_message', messageData);
    }
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      console.log(`❌ ${username} disconnected`);
      io.emit('user_left', `${username} left the chat`);
      users.delete(socket.id);
      userSockets.delete(username);
      io.emit('user_list', Array.from(userSockets.keys()));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
