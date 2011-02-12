$(function(){
  $(window).bind( 'hashchange', hashchange);
  hashchange();
});


function hashchange(e) {
  // supper silly routing
  fragment = $.param.fragment();
  var routes = [[/genres\/\w*\/\w*/, fluffy.player.play],
                [/genres\/\w*/, fluffy.genres.show],
                [/genres/, fluffy.genres.index]];

  var match = false;
  for(i in routes) {
    var regex = routes[i][0];
    var method = routes[i][1];
    match = fragment.match(regex);
    if (match) {
      method(fragment);
      break;
    }
  }

  if(!match) {
    fluffy.genres.index();
  }
}

var Config = {
  soundcloud: {
    consumer_key: 'f9yIR0Wr4cwZewZquRr1g'
  }
}

// base track object
var Fluffy = function(options) {
  var that = options;

  that.genres = GenreController({});
  that.genres.load();

  that.player = PlayerController({});

  that.push_state = function(state) {
    var new_url = $(document.location).attr( 'href' ).replace( /#.*/, '' ) 
    new_url += '#' + state;
    document.location = new_url;
  };

  return that;
};

var GenreController = function(options) {
  var that = options;

  that.index = function() {
    $('#content').html('');    
    
    for(i in that._genres) {
      var g = that._genres[i];
      $('#content').append('<a href="#genres/'+ g +'">' + g + '</a> ');
    }
  };

  that.show = function(fragment) {
    fluffy.current_genre = fragment.split('/')[1];
    $('#content').html('');
 
    that.load_tracks(function() {
      fluffy.player.play_track(0);
      fluffy.push_state('genres/' + fluffy.current_genre + '/' + fluffy.player.tracks[0].id)
    });
  };

  that.load_tracks = function(callback) {
    console.debug('loading tracks');
    $.getJSON("http://api.soundcloud.com/tracks.json?callback=?",
      {
        consumer_key: Config.soundcloud.consumer_key,
        order: "hotness",
        genres: fluffy.current_genre,
        filter: 'streamable',
        'created_at[from]': '2011-02-12+18%3A00%3A00', // TODO  
      },
      function(tracks) {
        console.debug('got tracks');
        fluffy.player.load_tracks(tracks);
        console.debug('calling back');
        callback();
      }
    );
  }

  that.load = function() {
    that._genres = ['indie', 'electronic', 'experimental', 'trance', 'dubstep', 'hardcore', 'house', 'techno'];
    for(i in that._genres) {
      var g = that._genres[i];
      that[g] = function() {
        that.show('genres/' + g);
      }
    }
  }

  return that;
}

var PlayerController = function(options) {
  var that = options;
  that._position_by_id = false;
  that.tracks = false;

  that.load_tracks = function(tracks) {
    that.tracks = tracks;
    that._position_by_id = false;
    that.position_by_id(function() {});
  };

  that.position_by_id = function(callback) {
    if(!that._position_by_id) {
      that._position_by_id = {};
     
      var _loaded = function() {
        for(i in that.tracks) {
          that._position_by_id[that.tracks[i].id] = i;
        }
        callback();
      };
 
      if(!that.tracks) {
        fluffy.genres.load_tracks(_loaded);
      } else {
        _loaded();
      }
    }
  }

  that.play = function(fragment) {
    console.debug('play()');
    var parts = fragment.split('/')
    fluffy.current_genre = parts[1];
    that.play_by_id(parts[2]);
  };

  that.play_by_id = function(id) {
    that.position_by_id(function() {
      var position = that._position_by_id[id];
      that.play_track(position);
    });
  };

  that.play_track = function(position) {
    that.current_position = position;
    var track = that.tracks[position];
    var stream_url = track['stream_url'] + '?' + 'consumer_key=' + Config.soundcloud.consumer_key;
    $('audio').attr('src', stream_url);
    $('audio')[0].play();
  };

  return that;
};


fluffy = Fluffy({});
