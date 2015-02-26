var jukebox = {
  init: function(cb) {
    
    // initialize client with app credentials
    SC.initialize({
      client_id: 'da2c9944b293a284f483e3d598da60b5',
      redirect_uri: 'http://localhost:8000/callback.html',
    });

    cb();
  },
  app: {
    connect: function(cb) {
      SC.connect(cb);
    },
    search: function(value, cb) {
      SC.get('/tracks', {
        q: value, 
        type:'original'
     }, function(tracks) {
        cb(tracks)
      });
    },
    stream: function(trackId, options, cb) {
      SC.stream('/tracks/'+trackId, options, cb);
    }
  }
};