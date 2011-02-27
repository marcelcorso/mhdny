class CreateTracks < ActiveRecord::Migration
  def self.up
    create_table :tracks do |t|
      t.string :url
      t.text :analysis
      t.string :genre
      t.boolean :active
      t.integer :soundcloud_id

      t.timestamps
    end
  end

  def self.down
    drop_table :tracks
  end
end
