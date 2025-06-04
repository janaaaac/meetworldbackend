const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.rooms = new Map(); // Store active rooms
    this.waitingUsers = []; // Users waiting for matches
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
        }
        next();
      } catch (err) {
        next();
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id, 'UserId:', socket.userId);

      // Video chat events
      socket.on('join-video-chat', (data) => {
        console.log('User joining video chat:', socket.id, data.userInfo);
        this.handleVideoChat(socket, data);
      });

      socket.on('signal', (data) => {
        socket.to(data.roomId).emit('signal', data.signal);
      });

      socket.on('chat-message', (message) => {
        const rooms = Array.from(socket.rooms);
        const chatRoom = rooms.find(room => room.startsWith('video_'));
        if (chatRoom) {
          socket.to(chatRoom).emit('chat-message', message);
        }
      });

      // Legacy WebRTC signaling events
      socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', {
          offer: data.offer,
          senderId: socket.id
        });
      });

      socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', {
          answer: data.answer,
          senderId: socket.id
        });
      });

      socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', {
          candidate: data.candidate,
          senderId: socket.id
        });
      });

      // Room management
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
      });

      socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left');
        this.cleanupRoom(roomId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        this.handleDisconnection(socket);
      });

      // End call
      socket.on('end-call', (data) => {
        socket.to(data.roomId).emit('call-ended');
        if (data.roomId) {
          this.cleanupRoom(data.roomId);
        }
      });

      // Next match
      socket.on('next-match', (data) => {
        if (data.roomId) {
          socket.to(data.roomId).emit('user-left');
          this.cleanupRoom(data.roomId);
        }
        this.handleVideoChat(socket, { 
          userInfo: data.userInfo,
          filters: data.filters 
        });
      });
    });
  }

  handleVideoChat(socket, data) {
    // Remove user from any existing room and waiting list
    this.removeFromWaiting(socket.id);
    this.removeFromRooms(socket.id);

    const { userInfo, filters = {} } = data;
    
    // Find matching user based on filters
    const matchedUserIndex = this.findMatchingUser(userInfo, filters);
    
    if (matchedUserIndex !== -1) {
      const matchedUser = this.waitingUsers.splice(matchedUserIndex, 1)[0];
      const roomId = `video_${socket.id}_${matchedUser.socketId}_${Date.now()}`;

      // Create room
      socket.join(roomId);
      const matchedSocket = this.io.sockets.sockets.get(matchedUser.socketId);
      if (matchedSocket) {
        matchedSocket.join(roomId);

        // Store room info
        this.rooms.set(roomId, {
          users: [
            { socketId: socket.id, userInfo: userInfo },
            { socketId: matchedUser.socketId, userInfo: matchedUser.userInfo }
          ],
          createdAt: new Date(),
          type: 'video-chat'
        });

        // Notify both users that they're matched with roomId
        socket.emit('matched', { partnerInfo: matchedUser.userInfo, roomId, initiator: true });
        matchedSocket.emit('matched', { partnerInfo: userInfo, roomId, initiator: false });

        console.log(`Video chat match: ${socket.id} <-> ${matchedUser.socketId} in room ${roomId}`);
      }
    } else {
      // Add to waiting list with filters
      this.waitingUsers.push({
        socketId: socket.id,
        userInfo: userInfo,
        filters: filters,
        joinedAt: new Date()
      });

      socket.emit('waiting-for-match');
      console.log(`User ${socket.id} added to video chat waiting list`);
    }
  }

  findMatchingUser(currentUser, currentFilters) {
    // Find a compatible user in the waiting list
    for (let i = 0; i < this.waitingUsers.length; i++) {
      const waitingUser = this.waitingUsers[i];
      const waitingUserInfo = waitingUser.userInfo;
      const waitingUserFilters = waitingUser.filters || {};

      // Check if users are compatible based on both users' filters
      if (this.areUsersCompatible(currentUser, currentFilters, waitingUserInfo, waitingUserFilters)) {
        return i;
      }
    }
    return -1;
  }

  areUsersCompatible(user1, filters1, user2, filters2) {
    // Check gender compatibility
    const genderCompatible = this.checkGenderCompatibility(user1, filters1, user2, filters2);
    if (!genderCompatible) return false;

    // Check location compatibility
    const locationCompatible = this.checkLocationCompatibility(user1, filters1, user2, filters2);
    if (!locationCompatible) return false;

    return true;
  }

  checkGenderCompatibility(user1, filters1, user2, filters2) {
    // Check if user1's filter allows user2's gender
    const user1WantsUser2 = filters1.gender === 'Anyone' || filters1.gender === user2.gender;
    
    // Check if user2's filter allows user1's gender
    const user2WantsUser1 = filters2.gender === 'Anyone' || filters2.gender === user1.gender;
    
    return user1WantsUser2 && user2WantsUser1;
  }

  checkLocationCompatibility(user1, filters1, user2, filters2) {
    // If user1 wants same country only, check if user2 is from same country
    if (filters1.sameCountryOnly && user1.location !== user2.location) {
      return false;
    }
    
    // If user2 wants same country only, check if user1 is from same country
    if (filters2.sameCountryOnly && user2.location !== user1.location) {
      return false;
    }
    
    return true;
  }

  handleFindMatch(socket, userInfo) {
    // Remove user from any existing room
    this.removeFromWaiting(socket.id);

    // Simple random matching for now
    if (this.waitingUsers.length > 0) {
      const matchedUser = this.waitingUsers.shift();
      const roomId = `room_${socket.id}_${matchedUser.socketId}_${Date.now()}`;

      // Create room
      socket.join(roomId);
      this.io.sockets.sockets.get(matchedUser.socketId)?.join(roomId);

      // Store room info
      this.rooms.set(roomId, {
        users: [socket.id, matchedUser.socketId],
        createdAt: new Date()
      });

      // Notify both users
      socket.emit('match-found', {
        roomId,
        matchedUser: matchedUser.userInfo
      });

      this.io.to(matchedUser.socketId).emit('match-found', {
        roomId,
        matchedUser: userInfo
      });

      console.log(`Match found: ${socket.id} <-> ${matchedUser.socketId} in room ${roomId}`);
    } else {
      // Add to waiting list
      this.waitingUsers.push({
        socketId: socket.id,
        userInfo,
        joinedAt: new Date()
      });

      socket.emit('waiting-for-match');
      console.log(`User ${socket.id} added to waiting list`);
    }
  }

  handleDisconnection(socket) {
    // Remove from waiting list
    this.removeFromWaiting(socket.id);

    // Handle room cleanup
    this.removeFromRooms(socket.id);
  }

  removeFromWaiting(socketId) {
    this.waitingUsers = this.waitingUsers.filter(user => user.socketId !== socketId);
  }

  removeFromRooms(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const userInRoom = room.users.find(user => 
        (typeof user === 'string' ? user : user.socketId) === socketId
      );
      
      if (userInRoom) {
        // Notify other users in the room
        const otherUsers = room.users.filter(user => 
          (typeof user === 'string' ? user : user.socketId) !== socketId
        );
        
        otherUsers.forEach(user => {
          const otherSocketId = typeof user === 'string' ? user : user.socketId;
          this.io.to(otherSocketId).emit('partner-disconnected');
        });
        
        this.cleanupRoom(roomId);
        break;
      }
    }
  }

  cleanupRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all users from the room
      room.users.forEach(user => {
        const userId = typeof user === 'string' ? user : user.socketId;
        const userSocket = this.io.sockets.sockets.get(userId);
        if (userSocket) {
          userSocket.leave(roomId);
        }
      });
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} cleaned up`);
    }
  }

  // Get stats for monitoring
  getStats() {
    return {
      connectedUsers: this.io.sockets.sockets.size,
      waitingUsers: this.waitingUsers.length,
      activeRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([id, room]) => ({
        id,
        userCount: room.users.length,
        createdAt: room.createdAt,
        type: room.type || 'legacy'
      }))
    };
  }
}

module.exports = SocketHandler;
