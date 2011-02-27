class TracksController < ApplicationController

  def index
    genre = params[:genre]
    requested_id = params[:requested_id] || '-1'
    tracks = Track.all(:conditions => ['(genre = ? AND active = true) OR id = ?', genre, requested_id], :order => 'id')
    
    render :json => tracks
  end

end
