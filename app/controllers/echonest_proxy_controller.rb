
require 'net/http'
require 'open-uri'

class EchonestProxyController < ApplicationController

  @@api_key = 'EZ5LKJQBOSCFT3TUN'

  def upload
    cached = Rails.cache.read('upload_' + params[:url])
    unless cached
      res = Net::HTTP.post_form(URI.parse('http://developer.echonest.com/api/v4/track/upload'),
                              {
                                :api_key => @@api_key,
                                :format =>  "json",
                                :url => params[:url],
                                :wait => true
                              });
    
      puts 'response: ' + res.body
      Rails.cache.write('upload_' + params[:url], res.body)
      cached = res.body
    end

    render :json => "#{params[:callback]}(#{cached});"
  end


  def analyze
    res_body = Rails.cache.read('analyze_' + params[:id])
    if res_body
      puts 'analyze cache hit' 
      parsed = ActiveSupport::JSON.decode(res_body)
    else
      res = Net::HTTP.post_form(URI.parse('http://developer.echonest.com/api/v4/track/analyze'),
                              {
                                :api_key => @@api_key,
                                :format =>  "json",
                                :bucket => 'audio_summary',
                                :id => params[:id],
                                :wait => true 
                              });
      parsed = ActiveSupport::JSON.decode(res.body)
      if(parsed['response']['track']['status'] == 'complete') 
        Rails.cache.write('analyze_' + params[:id], res.body)
      end
      res_body = res.body 
    end

    puts 'response: ' + res_body
    if(parsed['response']['track']['status'] == 'complete')  
      analysis_body = Rails.cache.read('analysis_' + params[:id])
      if analysis_body
        puts 'analysis cache hit'
      else 
        puts 'requesting: ' + parsed['response']['track']['audio_summary']['analysis_url']
      
        analysis_body = open(parsed['response']['track']['audio_summary']['analysis_url']).read
        Rails.cache.write('analysis_' + params[:id], analysis_body)
      end
      parsed['analysis'] = ActiveSupport::JSON.decode(analysis_body)
      res_body =  parsed.to_json
    end

    render :json => "#{params[:callback]}(#{res_body});"
  end

end
