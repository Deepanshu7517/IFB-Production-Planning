import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;

    // ADD THIS: Join a personal room named after the userId
    socket.join(userId);

    console.log(`✅ User ${userId} connected and joined personal room`);
  }
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`✅ User ${userId} mapped to socket ${socket.id}`);
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Join group rooms
  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User ${userId} joined group ${groupId}`);
  });

  // Leave group room
  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User ${userId} left group ${groupId}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      console.log(`❌ User ${userId} removed from socket map`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };