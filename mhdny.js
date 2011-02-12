$(function(){
  $(window).bind( 'hashchange', hashchange);
  hashchange(null, 'genres/index'); // fake a hashchange on (re)load
});


function hashchange(e, default_fragment) {
    var fragment = $.param.fragment();
    if(fragment == '') {
      fragment = default_fragment;
    }
    var parts = fragment.split('/')
    var last_obj = fluffy;
    for(i in parts) {
      console.debug(parts[i]);
      last_obj = last_obj[parts[i]];
    }
    // actually call it
    last_obj();
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

  that.show = function(genre) {
    $('#content').html('');
 
    $.getJSON("http://api.soundcloud.com/tracks.json?callback=?",
      {
        consumer_key: Config.soundcloud.consumer_key,
        order: "hotness",
        genres: genre,
        filter: 'streamable',
        'created_at[from]': '2011-02-12+18%3A00%3A00', // TODO  
      },
      function(tracks) {
        fluffy.player.tracks = tracks;
        fluffy.player.play_first();
      }
    );
  };

  that.load = function() {
    that._genres = ['indie', 'electronic', 'experimental', 'trance', 'dubstep', 'hardcore', 'house', 'techno'];
    for(i in that._genres) {
      var g = that._genres[i];
      that[g] = function() {
        that.show(g);
      }
    }
  }

  return that;
}

var PlayerController = function(options) {
  var that = options;

  that.play_first = function() {
    that.play(that.tracks[0]);
  }

  that.play = function(track) {
    that.current_track = track;
    var stream_url = track['stream_url'] + '?' + 'consumer_key=' + Config.soundcloud.consumer_key;
    $('audio').attr('src', stream_url);
    $('audio')[0].play();

  }

  return that;
};


fluffy = Fluffy({});
