var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var mongodb = require('mongodb');

users = [];
connections = [];
var load = false;

server.listen(process.env.PORT || 3000);
console.log('Server running...');

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


io.sockets.on('connection', function (socket) {
  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);

  socket.on('disconnect', function(data){
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
    // load = false;
  });

  socket.on('load log', function(){
    if (!load) {
      load = true;
        console.log('loading chat '+socket.username);

        var MongoClient = mongodb.MongoClient;
          var url = 'mongodb://localhost:27017/demo';
          // Chat log
          MongoClient.connect(url, function (err, db) {
            if (err) {
              console.log(err);
            } else {
              var collection = db.collection('chatlog');
              collection.find().toArray(function(err, items) {
                 io.sockets.emit('upload log', items);
             });
            }
          });
    }
  });

  socket.on('send message', function(data) {
    console.log(socket.username+": "+data);
    io.sockets.emit('new message', {msg: data, user: socket.username});
  });

  socket.on('validate user', function(data, callback) {
    console.log('socket.on validate user: '+data);
    socket.username = data;
    var acc = {"user":socket.username};
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://localhost:27017/demo';

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('user');
        collection.findOne(acc, function (err, result) {
          console.log('Account: '+result);
          if (result != null) {
            users.push(socket.username);
            updateUsernames();
              callback({'status': true, 'msg': 'Login successfully'});
          } else {
              callback({'status': false, 'msg': 'Please check your account again.\nIf you do not have an account, please fill up \'Username\' and \'Password\' then click on \'Signup\''});
          }
        });
      }
    });
  });

  socket.on('new user', function(data, callback) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://localhost:27017/demo';

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('user');

        collection.findOne(data, function (err, result) {
          console.log("Account: "+result);
          if (result == null) {
            collection.insert([data], function (err, result){
              if (err) {
                console.log(err);
                callback({'status': false, 'msg': 'Register failed'});
              } else {
                callback({'status': true, 'msg': 'Register successfully'});
              }
              db.close();
            });
          } else {
            callback({'status': false, 'msg': 'This account has already existed'});
          }
        });
      }
    });
  });

  socket.on('insert chatlog',function(data) {
    console.log('Writing chatlog: '+data.msg);
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://localhost:27017/demo';
    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('chatlog');
          collection.insert([data], function (err, result){
        if (err) {
          console.log(err);
        }
        db.close();
      });
      }
    });
  });

  function updateUsernames(){
    io.sockets.emit('get users', users);
  };
});
