# BBB AI Notes - opciones de sala para el interruptor "Asistente de IA" (Greenlight v3).
# Idempotente. Ejecutar dentro del contenedor:
#   docker cp seed_options.rb greenlight-v3:/tmp/ && docker exec greenlight-v3 bundle exec rails runner /tmp/seed_options.rb
# Greenlight envia a /create toda opcion que no empiece por "gl", con su valor tal cual.
OPTS = {
  'meta_ai-notes' => 'false',             # opt-in del agente
  'autoStartRecording' => 'false',        # FreeSWITCH solo graba audio con la grabacion iniciada
  'allowStartStopRecording' => 'true',    # valor por omision de BBB; el interruptor lo pone en false
  'notifyRecordingAppend' => '',          # aviso de IA (texto); vacio = sin aviso
}.freeze

ActiveRecord::Base.transaction do
  OPTS.each do |name, default|
    opt = MeetingOption.find_or_create_by!(name:) { |o| o.default_value = default }
    RoomsConfiguration.find_or_create_by!(meeting_option: opt, provider: 'greenlight') { |c| c.value = 'optional' }
    Room.find_each do |room|
      RoomMeetingOption.find_or_create_by!(room:, meeting_option: opt) { |r| r.value = default }
    end
  end
end

OPTS.each_key do |name|
  opt = MeetingOption.find_by!(name:)
  puts format('%-26s config=%-9s salas=%d', name, RoomsConfiguration.find_by(meeting_option: opt, provider: 'greenlight')&.value,
              RoomMeetingOption.where(meeting_option: opt).count)
end
