# Interruptor "Asistente de IA" en Greenlight

Activa el agente BBB AI Notes (transcripción y minuta por correo al dueño de la sala) desde
**Sala → Settings** de Greenlight v3, con un solo interruptor. Todo en overrides: no se modifica la
imagen de Greenlight ni archivos empaquetados de BBB. Proyecto del agente:
`HPConsultingMx/bbb-ai-notes` (plan en `docs/plan-greenlight-toggle-ia.md`).

| Archivo | Destino | Qué hace |
|---|---|---|
| `ai-notes/seed_options.rb` | `rails runner` en `greenlight-v3` (una vez) | Crea 4 opciones de sala (`meta_ai-notes`, `autoStartRecording`, `allowStartStopRecording`, `notifyRecordingAppend`), configuración `optional` y filas para las salas existentes |
| `landing/rg-ai-notes.js` | `/etc/bigbluebutton/branding/landing/` | Dibuja el interruptor (clona la fila "Mute users when they join") y guarda con la API de la propia interfaz |
| `nginx/landing.nginx` | `/etc/bigbluebutton/nginx/landing.nginx` | Sirve el script y lo inyecta en el `<head>` con el `sub_filter` existente |
| `ai-notes/rollback.rb` | `rails runner` | Retira las opciones |

Activado, la sala crea sus reuniones con `record=true`, `meta_ai-notes=true`,
`autoStartRecording=true`, `allowStartStopRecording=false` y el aviso de IA en
`notifyRecordingAppend`. Desactivado envía los valores por omisión de BBB.

## Despliegue

```bash
sudo docker cp ai-notes/seed_options.rb greenlight-v3:/tmp/
sudo docker exec greenlight-v3 bundle exec rails runner /tmp/seed_options.rb
sudo install -m 644 landing/rg-ai-notes.js /etc/bigbluebutton/branding/landing/
sudo install -m 644 nginx/landing.nginx /etc/bigbluebutton/nginx/landing.nginx
sudo nginx -t && sudo systemctl reload nginx
```

No requiere reiniciar Greenlight ni `bbb-apps-akka`. Las salas nuevas reciben las opciones solas.

## Rollback

- Solo ocultar el interruptor: quitar `<script src="/rg-ai-notes.js" defer></script>` del
  `sub_filter` y `nginx -t && systemctl reload nginx`.
- Retirar también las opciones: `rails runner /tmp/rollback.rb` (copiado igual que el seed).

## Tras cada actualización de Greenlight

Abrir Settings de una sala y comprobar que aparece el interruptor. Depende de la clase
`room-settings-row`, del id `muteOnStart` y de `/api/v1/room_settings`. Si algo de eso cambia, el
interruptor no aparece, pero las salas conservan sus valores.
