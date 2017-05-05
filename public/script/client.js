var socket = io.connect();

$('#usernameLbl').click(function() {
  $('#usernameLbl').val('');
  $('#err').val('');
});

$('#passwordLbl').click(function() {
  $('#passwordLbl').val('');
  $('#err').val('');
});

$('#signupBtn').click(function(){
  if ($('#usernameLbl').val() == '' || $('#passwordLbl').val() == '') {
    alert('Username and Password cannot be null');
  } else {
    // Log
    var acc = {'user': $('#usernameLbl').val(), 'pass': $('#passwordLbl').val()};
   // emit new user
   socket.emit('new user', acc, function(data) {
     if(data.status){
       $('#loginBtn').click();
     } else {
       $('#err').val(data.msg);
     }
   });
  }
});

$('#loginForm').submit(function(e) {

  if ($('#usernameLbl').val() == '' || $('#passwordLbl').val() == '') {
    alert('Username and Password cannot be null');
  } else {
    var acc = {'user': $('#usernameLbl').val(), 'pass': $('#passwordLbl').val()};
    console.log('Login account: ', acc);
    e.preventDefault();
    socket.emit('validate user', acc, function(data) {
      // If validate successfully
      if(data.status){
        $('#loginFormArea').hide();
        $('#messageArea').show();
        // Load log chat data
        socket.emit('get chatlog',function(obj) {
          reloadChat(obj.dataList, obj.socketname);
          $('#textname').val(obj.socketname);
        });
      // If validate failed
      } else {
        $('#err').val(data.msg);
      }
      });
    $('#message').val('');
  }




});

function reloadChat(data, socketName) {
  var html = '';
  for (var i = data.length - 1; i >= 0 ; i--) {
    if (data[i].user == socketName) {
      html += '<div align="right" id="div'+data[i]._id+'" class="well well-sm"><input id="'+data[i]._id+'" type="'+data[i].type+'" value="Delete" class="btn deleteBtn" name="deleteMsg"/><p><strong>['+data[i].user+']</strong></p><p id="chat'+data[i]._id+'">'+data[i].msg+'</p></div>';
    } else {
      html += '<div id="div'+data[i]._id+'" class="well well-sm"><p><i><strong>['+data[i].user+']</strong></i></p><p id="chat'+data[i]._id+'">'+data[i].msg+'</p></div>';
    }
  }
  $('#chat').html(html);
};

$('#messageForm').submit(function(e){
  e.preventDefault();
  if ($('#message').val() == '') {
    alert('Please enter new message');
  } else {
    socket.emit('insert chatlog',$('#message').val());
    $('#message').val('');
  }
});

socket.on('append message', function(obj){
  var socketName = $('#textname').val();
  var data = obj.data;
  if (socketName == data.user) {
    $('#chat').prepend('<div align="right" class="well well-sm"><input type="'+data.type+'" id="'+data._id+'" value="Delete" class="btn deleteBtn" name="deleteMsg"/><p><i><strong>['+data.user+']</strong></i></p><p id="chat'+data._id+'">'+ data.msg+ '</p></div>');
  } else {
    $('#chat').prepend('<div align="left"  class="well well-sm"><p><i><strong>['+data.user+']</strong></i></p><p id="chat'+data._id+'">'+ data.msg+ '</p></div>');
  }
});﻿

socket.on('get users', function functionName(data) {
  var html = '';
  for (i=0;i< data.length;i++){
    html += '<li class="list-group-item">'+data[i]+'</li>';
  }
  $('#users').html(html);
});

socket.on('reload all chat', function(obj){
  var socketName = $('#textname').val();
  var data = obj.items;
  reloadChat(data, socketName);
});﻿

socket.on('reload chat', function(data) {
  $('#'+data.id).hide();
  $('#chat'+data.id).html(data.msg);
});

$('#deleteLog').click(function() {
  var decision = confirm("Are you sure to delete all the chat log?");
  if (decision) {
     socket.emit('delete all');
  } else {
    return false;
  }
});

$('#chat').on('click', '.deleteBtn' ,function() {
  socket.emit('delete', $(this).attr('id'));
});
