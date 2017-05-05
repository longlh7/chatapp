var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var mongodb = require('mongodb');

users = [];
connections = [];

var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/demo';

server.listen(process.env.PORT || 3000);
console.log('Server running...');

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

io.sockets.on('connection', function (socket) {

  connections.push(socket);
  console.log('\nConnected:    %s sockets connected', connections.length);

  socket.on('disconnect', function(data){
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    connections.splice(connections.indexOf(socket), 1);
    console.log('\nDisconnected: %s sockets connected', connections.length);
  });

  socket.on('get chatlog', function(callback){
    console.log('\n--[socket.on] get all chat log: ',socket.username);
      // Chat log
      MongoClient.connect(url, function (err, db) {
        if (err) {
          console.log(err);
        } else {
          var collection = db.collection('chatlog');
          collection.find().toArray(function(err, items) {
            callback({'socketname': socket.username, 'dataList': items});
         });
        }
      });
  });

  socket.on('send message', function(data) {
    console.log('\n--[socket.on] "send message"\n'+JSON.stringify(data));
    callback({'socketName':socket.username, 'item':data});
  });

  socket.on('validate user', function(data, callback) {
    console.log('\n--[socket.on] validate user\n'+JSON.stringify(data));
    socket.username = data.user;

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('user');
        collection.findOne(data, function (err, result) {
          if (result != null) {
            users.push(socket.username);
            updateUsernames();
            io.sockets.emit('get users', users);
            callback({'status': true, 'msg': 'Login successfully'});
            console.log('Data: '+JSON.stringify(result));
          } else {
            callback({'status': false, 'msg': 'Please check your account again.\nIf you do not have an account, please fill up \'Username\' and \'Password\' then click on \'Signup\''});
            console.log('Not found');
          }
        });
      }
    });
  });

  socket.on('new user', function(data, callback) {
    console.log('\n--[socket.on] new user\n'+JSON.stringify(data));

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('user');
        collection.findOne({'user': data.user}, function (err, result) {
          if (result == null) {
            collection.insert([data], function (err, result){
              if (err) {
                console.log(err);
                console.log('Register failed');
                callback({'status': false, 'msg': 'Register failed'});
              } else {
                console.log("Inserted new account: "+JSON.stringify(result));
                callback({'status': true, 'msg': 'Register successfully'});
              }
              db.close();
            });
          } else {
            console.log('This username has already existed');
            callback({'status': false, 'msg': 'This username has already existed'});
          }
        });
      }
    });
  });

  socket.on('insert chatlog',function(msg, callback) {
    console.log('\n--[socket.on] insert chatlog');
    console.log(socket.username+': '+msg);

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('chatlog');
          collection.insert([{'user': socket.username, 'msg': msg, 'type': 'button'}], function (err, result){
        if (err) {
          console.log(err);
        }
        console.log(result.ops[0]);
        io.sockets.emit('append message', {'socketName': socket.username, 'data': result.ops[0]});
        db.close();
      });
      }
    });
  });

  socket.on('delete all', function(){
    console.log('\n--[socket.on] delete all log');
    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('chatlog');
        collection.remove();
        io.sockets.emit('reload all chat', {'socketName': socket.username, 'items': []});
      }
    });
  });

  socket.on('delete', function(record) {
    console.log('\n--[socket.on] "delete"\n'+JSON.stringify(record));
    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var collection = db.collection('chatlog');
        collection.update({_id: new mongodb.ObjectId(record)}, {$set: {msg: "<i>(This message has been deleted)</i>", type: "hidden"}}, function(result) {
          if (err) {
            console.log(err);
          } else {
            io.sockets.emit('reload chat', {'id': record,'msg': '<i>(This message has been deleted)</i>'});
          }
        });
      }
    });
  });

  function updateUsernames(){
    console.log('\n--[sockets.emit] get users');
    console.log(users);
    io.sockets.emit('get users', users);
  };

});
