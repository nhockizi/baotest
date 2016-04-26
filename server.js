var http = require('http').createServer(handler),
  io = require('socket.io').listen(http),
  fs = require('fs'),
  mysql = require('mysql'),
  express = require('express'),
  connectionsArray = [],
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hoabinh',
    port: 3306
  }),
  POLLING_INTERVAL = 3000,
  pollingTimer;
// If there is an error connecting to the database
connection.connect(function(err) {
  // connected! (unless `err` is set)
  if (err) {
    console.log(err);
  }
});

// creating the server ( localhost:8000 )
http.listen(8000);
// on server started we can load our client.html page
function handler(req, res) {
  res.writeHead(200);
  res.end(data);
}

/*
 *
 * HERE IT IS THE COOL PART
 * This function loops on itself since there are sockets connected to the page
 * sending the result of the database query after a constant interval
 *
 */


var pollingLoop = function() {
  // Doing the database query
  var query = connection.query('SELECT * FROM notification'),
  data_notification = []; // this array will contain the result of our db query

  // setting the query listeners
  query
    .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      updateNotification(err);
    })
    .on('result', function(result) {
      // it fills our array looping on each user row inside the db
      data_notification.push(result);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {
        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

        updateNotification({
          data: data_notification
        });
      }
    });
};
var LoopUser = function() {
  // Doing the database query
  var query = connection.query('SELECT * FROM user'),
  data_user = []; // this array will contain the result of our db query

  // setting the query listeners
  query
    .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      updateUser(err);
    })
    .on('result', function(result) {
      // it fills our array looping on each user row inside the db
      data_user.push(result);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {
        // pollingTimer = setTimeout(LoopUser, POLLING_INTERVAL);
        updateUser({
          data: data_user
        });
      }
    });
};
// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {
  // user_id = socket.handshake.query.user_id;
  // console.log('Number of connections:' + connectionsArray.length);

  // starting the loop only if at least there is one user connected
  if (!connectionsArray.length) {
    pollingLoop();
  }
  socket.on('loopuser',function(){
    LoopUser();
  })
  socket.on('disconnect', function() {
    var socketIndex = connectionsArray.indexOf(socket);
    console.log('socketID = %s got disconnected', socketIndex);
    if (~socketIndex) {
      connectionsArray.splice(socketIndex, 1);
    }
  });

  // console.log('A new socket is connected!');
  connectionsArray.push(socket);

});

var updateNotification = function(data) {
  // adding the time of the last update
  data.time = new Date();
  // console.log('notification');
  // console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data.time);
  // sending new data to all the sockets connected
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('notification', data);
  });
};
var updateUser = function(data) {
  // adding the time of the last update
  data.time = new Date();
  // io.sockets.emit('user', data);
  // console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data.time);
  // sending new data to all the sockets connected
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('user', data);
  });
};
// console.log('Please use your browser to navigate to http://localhost:8000');
