/************************************************
* ===============================================
* #	Name: Jukebox								#
* #	Author: Bruno Cascio						#
* ===============================================
************************************************/

/*
* --------------------------------------------
*	DEPENDENCES
* --------------------------------------------
*/
var express 	   = require('express');
var server       = express()
var http         = require('http').Server(server);
var io           = require('socket.io')(http);
var mongoose     = require('mongoose');
var randomstring = require("randomstring");
var crypto       = require('crypto');
var Youtube      = require("youtube-api");
//var config 			 = require('config');

/*
* --------------------------------------------
*	CONNECT TO MONGODB
* --------------------------------------------
*/
mongoose.connect('localhost', 'jukebox');

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

mongoose.connection.once('open', function callback () {
  console.log('Connected to MongoDB')
});

/*
* --------------------------------------------
*	MODELS
* --------------------------------------------
*/
var Schema   = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

/* ===> User Model */
var UserSchema = new Schema({
  username: String,
  password: String
});

/* ===> Tokens Model */
var TokenSchema = new Schema({
  client_id: { type: ObjectId, ref: 'UserSchema'},
  authToken: { type: String, default: ''},
  createdAt: { type: Date, expires: '1h' }
});

/* ===> List Model */
var TrackSchema = new Schema({
  yid: { type: String },
  name:{ type: String },
  artist:{ type: String },
  duration:{ type: String },
  owner_id: { type: ObjectId, ref: 'UserSchema'},
});

/* ===> List Model */
var ListSchema = new Schema({
  title:   { type: String },
  user_id: { type: ObjectId, ref: 'UserSchema' },
  tracks:  [TrackSchema]
});

// schema => model => collection
var Token = mongoose.model('Token', TokenSchema, 'tokens')
var User  = mongoose.model('User', UserSchema, 'users')
var List  = mongoose.model('List', ListSchema, 'lists')

/*
* --------------------------------------------
* SERVER CONFIGURATIONS
* --------------------------------------------
*/
server.use(express.static(__dirname + '/client'));

Youtube.authenticate({
  type: "key",
  key: "AIzaSyCQO41dm3o8BJvElifx77mCcG5hrbsMZ18"
});

/*
* --------------------------------------------
* SOCKET.IO
* --------------------------------------------
*/

var total = 0 // total user connected

io.on('connection', function(socket) {

  total += 1
  console.log("connected: " + total + " users")

  socket.on('login', function(credentials, fn){
    User.findOne({'username':credentials.username, 'password':credentials.password},
      function(err, user) {
        if ( err ){
          var err = {error: {msg: "Server Error", code:500}};
          fn(err);
        } else if( !user ){
          var err = {error: {msg: "Invalid Credentials", code:404}};
          fn(err);
        } else{
          var t = {token: randomstring.generate(50)};
          fn(t);
        }
      });
  });

  socket.on('queueVideos', function(fn){
    List.find({}, function(err,list){
      fn(list)
    })
  })

  socket.on('search', function(search, fn) {

    var options = {
      'part': 'id,snippet',
      'q': search,
      'maxResults': "5",
      'order': 'rating'
    };
    
    Youtube.search.list(options, function(err, response){
      if (err)
        fn(err)
      else
        fn(response)
    });
  });

  socket.on('addVideo', function(video) {
    console.log('server: '+ video.snippet.title)
    io.sockets.emit('newVideo', video)
  });

  socket.on('loadNewVideo', function(video) {
    console.log('Reload video: '+ video.videoId)
    io.sockets.emit('playNewSong', video.videoId)
  });

  socket.on('disconnect', function(socket) {
    total -= 1
    console.log("disconnected, now: " + total + " users")
  });
});

/*
* --------------------------------------------
*	ROUTES
* --------------------------------------------
*/
server.get('/', function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});

/*
* --------------------------------------------
*	SERVER RUN
* --------------------------------------------
*/
http.listen(3000, function(){
  console.log('listening on *:3000');
});