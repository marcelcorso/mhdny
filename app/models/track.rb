require 'open-uri'

class Track < ActiveRecord::Base

  @@echonest_api_key = 'EZ5LKJQBOSCFT3TUN'
  @@soundcloud_consumer_key = 'f9yIR0Wr4cwZewZquRr1g' 

  class << self
    def update_list
      genres = ['indie', 'electronic', 'experimental', 'trance', 'dubstep', 'hardcore', 'house', 'techno', 'soul']

      params = {'order' => "hotness",
        'consumer_key' => @@soundcloud_consumer_key,
        'filter' => 'streamable',
        'created_at[from]' => 1.week.ago.iso8601
        }


      active_ids = []
      genres.each do |g|
        params['genres'] = g
        url = 'http://api.soundcloud.com/tracks.json?' + params.map{|k,v| "#{k}=#{v}"}.join('&')
        content = open(url)
        remote_tracks = ActiveSupport::JSON.decode(content) 
        remote_tracks.reverse.each do |r|
          unless Track.find_by_soundcloud_id(r['id'])
            track = Track.create({
              :soundcloud_id => r['id'],
              :url => r['stream_url'],
              :genre => g
            })
            # ask achonest
            active_ids << r['id'] if echonest_analyse(track)
          else
            active_ids << r['id']
          end
        end
      end
      Track.update_all('active = 1', ['soundcloud_id in (?)', active_ids.join(',')])
    end

    def echonest_analyse(track)
      # can be slow
      # upload 
      stream_url = track['url'] + '?' + 'consumer_key=' + @@soundcloud_consumer_key
      puts "upload: " + stream_url
      url = URI.parse('http://developer.echonest.com/api/v4/track/upload/')
      puts url.inspect
      req = Net::HTTP::Post.new('http://developer.echonest.com/api/v4/track/upload/')
      req.set_form_data({
                          :api_key => @@echonest_api_key,
                          :format =>  "json",
                          :url => stream_url,
                          :wait => true
                        })
      res = Net::HTTP.new(url.host, url.port).start do |http| 
        http.read_timeout = 60
        http.request(req) 
      end


      puts res.body
      upload_response = ActiveSupport::JSON.decode(res.body)
     
      if upload_response['response']['track'] 
        echonest_track_id = upload_response['response']['track']['id']
        # analyse
        puts "analyze: " + echonest_track_id
        url = URI.parse('http://developer.echonest.com/api/v4/track/analyze/') 
        req = Net::HTTP::Post.new(url)
        req.set_form_data({
                                :api_key => @@echonest_api_key,
                                :format =>  "json",
                                :bucket => 'audio_summary',
                                :id => echonest_track_id,
                                :wait => true
                              })
        res = Net::HTTP.new(url.host, url.port).start do |http|
          http.read_timeout = 60
          http.request(req)
        end
        
        track.analysis = res.body
        track.save
        
        puts "analyzed"
        result = true
      else
        puts "failed to upload"
        result = false
      end
      result
    end
  end
end
