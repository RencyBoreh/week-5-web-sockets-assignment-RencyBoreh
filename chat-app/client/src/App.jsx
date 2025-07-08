import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './styles.css';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [joined, setJoined] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [users, setUsers] = useState(new Set());
  const [privateRecipient, setPrivateRecipient] = useState('');

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setChat((prev) => [...prev, { ...data, type: 'public' }]);
    });

    socket.on('receive_private_message', (data) => {
      setChat((prev) => [...prev, { ...data, type: 'private' }]);
    });

    socket.on('user_joined', (msg) => {
      setChat((prev) => [...prev, { system: true, message: msg }]);
    });

    socket.on('user_left', (msg) => {
      setChat((prev) => [...prev, { system: true, message: msg }]);
    });

    socket.on('user_typing', (user) => {
      if (user !== username) {
        setTypingUser(user);
        setTimeout(() => setTypingUser(''), 2000);
      }
    });

    socket.on('user_list', (userArray) => {
      setUsers(new Set(userArray));
    });

    return () => {
      socket.off('receive_message');
      socket.off('receive_private_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('user_list');
    };
  }, [username]);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit('join', username);
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      if (privateRecipient) {
        socket.emit('private_message', { to: privateRecipient, message });
      } else {
        socket.emit('send_message', { message });
      }
      setMessage('');
    }
  };

  const handleTyping = () => {
    socket.emit('typing');
  };

  const handlePrivateSelect = (name) => {
    setPrivateRecipient(name === privateRecipient ? '' : name);
  };

  return (
    <div className="chat-container">
      {!joined ? (
        <div className="login">
          <h2>Enter your name</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
          />
          <button onClick={handleJoin}>Join Chat</button>
        </div>
      ) : (
        <div className="chat-box">
          <h2>Welcome, {username}</h2>

          <div className="user-list">
            <strong>Users:</strong>
            {[...users].map((user, i) => (
              <button
                key={i}
                className={privateRecipient === user ? 'active' : ''}
                onClick={() => handlePrivateSelect(user)}
                disabled={user === username}
              >
                {user}
              </button>
            ))}
            {privateRecipient && (
              <button className="clear" onClick={() => setPrivateRecipient('')}>
                Clear Private
              </button>
            )}
          </div>

          <div className="messages">
            {chat.map((msg, i) =>
              msg.system ? (
                <div key={i} className="system">{msg.message}</div>
              ) : (
                <div
                  key={i}
                  className={`message ${msg.type === 'private' ? 'private' : ''}`}
                >
                  <strong>{msg.username || msg.from}</strong> [{msg.time}]: {msg.message}
                </div>
              )
            )}
          </div>

          {typingUser && <div className="typing">{typingUser} is typing...</div>}

          <div className="input-area">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                handleTyping();
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder={
                privateRecipient
                  ? `Message privately to ${privateRecipient}...`
                  : 'Type a message...'
              }
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
