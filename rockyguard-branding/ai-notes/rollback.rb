# BBB AI Notes - retira las opciones del interruptor (las salas dejan de enviarlas a /create).
#   docker cp rollback.rb greenlight-v3:/tmp/ && docker exec greenlight-v3 bundle exec rails runner /tmp/rollback.rb
names = %w[meta_ai-notes autoStartRecording allowStartStopRecording notifyRecordingAppend]
ActiveRecord::Base.transaction do
  opts = MeetingOption.where(name: names)
  puts "filas de sala: #{RoomMeetingOption.where(meeting_option: opts).delete_all}"
  puts "configuraciones: #{RoomsConfiguration.where(meeting_option: opts).delete_all}"
  puts "opciones: #{opts.delete_all}"
end
