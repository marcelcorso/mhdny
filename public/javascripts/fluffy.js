google.load('search', '1');

$(function(){
  fluffy = Fluffy({});
  $(window).bind( 'hashchange', hashchange);
  hashchange();

  google.search.Search.getBranding('branding');
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
      console.debug('fragment: ' + fragment);
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

  that.ui = UI({});

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
    $.getJSON("http://api.soundcloud.com/tracks.json?callback=?",
      {
        consumer_key: Config.soundcloud.consumer_key,
        order: "hotness",
        genres: fluffy.current_genre,
        filter: 'streamable',
        'created_at[from]': '2011-02-12+18%3A00%3A00', // TODO  
      },
      function(tracks) {
        fluffy.player.load_tracks(tracks);
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
};

var PlayerController = function(options) {
  var that = options;
  that._position_by_id = false;
  that.tracks = false;

  $('audio').bind('ended', function() {
    next_position = parseInt(that.current_position) + 1;
    fluffy.push_state('genres/' + fluffy.current_genre + '/' + fluffy.player.tracks[next_position].id)
  });

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
    setTimeout(function() {
      $('audio').attr('src', stream_url);
      $('audio')[0].load();

      fluffy.ui.get_beats();
      fluffy.ui.get_google_images();
      // later $('audio')[0].play();
    }, 1000);
  };

  return that;
};


var UI = function(options) {
  var that = options;
  
  that.current_image_position = 0;
  that.audio_element = $('audio')[0];
/*
  $('audio').bind('timeupdate', function() {
    var time = Math.floor((that.audio_element.currentTime * 100))
    console.debug(time);
    if (that.beats && that.beats[time]) {
      $('#content img').attr('src', that.images[that.current_image_position++]);
    }
  });
*/

  that.get_beats = function() {
    // upload
    $.getJSON("/echonest_proxy/upload?callback=?",
      {
        url: $('audio').attr('src'),
      },
      function(data) {
        that.upload_results = data;
        that.pool_beat_results(data.response.track.id);
      }
    );
  }

  that.pool_beat_results = function(id) {
    $.getJSON("/echonest_proxy/analyze?callback=?",
      {
        id: id,
      },
      function(data) {
        console.debug(data);
        if(data.response.track.status == 'complete') {
          that.analysis_results_arrived(data);
        } else {
          console.debug('pooling... status:' + data.response.track.status);
          setTimeout(function() {
            that.pool_beat_results(id);
          }, 2000)
        }
      }
    );
  }; 

  that.analysis_results_arrived = function(results) {
    that.analysis_data = results;
    that.beats = []
    for(i in results.analysis.beats) {
      that.beats.push(results.analysis.beats[i].start);
    }
    that.can_we_start() 
  }

  that.images_arrived = function() {
    that.can_we_start()
  }

  that.can_we_start = function() {
    if(that['analysis_data'] && that['images']) {
      // yes
      
      $('audio')[0].play();
      for(i in that.beats) {
        setTimeout(that.next_image, that.beats[i] * 1000);
      }
    }
  }

  that.next_image = function() {
    console.debug('next image');
    $('#content img').attr('src', that.images[that.current_image_position++]);
  }

/*
  that.schedule_beat_action = function(position) {
    var beat = that.analysis_data.analysis.beats[position];
    setTimeout(function() {

      console.debug('expected:' + beat['start'].toString() + ' happening: ' + $('audio')[0].currentTime.toString());

      console.debug('beat - ' + position.toString());
      $('#content').html($('<img>').attr('src', that.images[position]));
      that.schedule_beat_action(position+1);
    }, beat['start'] * 1000)
  }
*/
  that.get_google_images = function() {
    
    // Initialize the searcher object, in this case a WebSearch.
    var gs = new google.search.ImageSearch();
    gs.setResultSetSize(google.search.Search.LARGE_RESULTSET);
    gs.setRestriction(
      google.search.ImageSearch.RESTRICT_IMAGESIZE,
      google.search.ImageSearch.IMAGESIZE_LARGE
    );

    that.images = [];

    gs.setSearchCompleteCallback(gs, function() {
      console.debug('bang')
      var cursor = this.cursor;

      // Add the new results to the other results
      for(i in this.results) {
        that.images.push(this.results[i].url);
        $('#image_cache').append($('<img>').attr('src', this.results[i].url));
      }

      // Check to see if the searcher actually has a cursor object and, if so, if we're on the last page of results. If not...
      if (cursor && (cursor.pages.length > cursor.currentPageIndex + 1)){

        // Go to the next page.
        console.debug('goto page');
        this.gotoPage(cursor.currentPageIndex + 1);

      // Else, if there is no cursor object or we're on the last page...
      } else {
        that.images_arrived();
      }
    });

    var track = fluffy.player.tracks[fluffy.player.current_position];
    var query = track.title + ' ' + track.genre; // TODO maybe .tags? 
    console.debug('searching for: ' + query);
    gs.execute(query);
  };

  return that;
};

