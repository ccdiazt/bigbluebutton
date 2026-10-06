# Branding RockyGuard para BigBlueButton 3.0 + Greenlight v3

Identidad corporativa de **RockyGuard Technologies** aplicada a `bbb.rockyguard.tech`
(BBB 3.0.34 + Greenlight v3.8.2.3). Todo vive en **overrides que los upgrades de BBB no tocan** —
no se modifica ningún archivo empaquetado. Aplicado y verificado el 2026-08-16
(bitácora completa con hallazgos y rollback: [BITACORA-2026-08-16.md](BITACORA-2026-08-16.md)).

## Contenido

| Archivo | Destino en el servidor | Qué hace |
|---|---|---|
| `landing/` | `/etc/bigbluebutton/branding/landing/` | Portada corporativa (index.html autocontenido EN/ES), logos SVG y slide PDF |
| `nginx/landing.nginx` | `/etc/bigbluebutton/nginx/landing.nginx` | Sirve `/` y los assets de marca desde el directorio de branding; el resto de rutas sigue a Greenlight |
| `bbb-web.properties.branding` | anexar a `/etc/bigbluebutton/bbb-web.properties` | Logos claro/oscuro en sala, bienvenida bilingüe, presentación por defecto |
| `bbb-html5.yml` | `/etc/bigbluebutton/bbb-html5.yml` | `clientTitle` y `copyright` (⚠️ conserva también las claves que `bbb-conf --setip` escribe: `kurento.wsUrl`, `pads.url`) |
| `ai-notes/` + `landing/rg-ai-notes.js` | ver `ai-notes/README.md` | Interruptor "Asistente de IA" en Settings de las salas (BBB AI Notes); bitácora `BITACORA-2026-10-06.md` |
| `rg-default-slide.html` | (fuente, no se despliega) | HTML del slide de bienvenida; se convierte a PDF con Chrome headless |

El branding de **Greenlight** (colores + logo de cabecera) no son archivos: viven en su Postgres/volumen.
Valores aplicados: `PrimaryColor #059669`, `PrimaryColorLight #d1fae5`, `PrimaryColorDark #047857`,
y el logo `rg-logo-light-bg.svg` adjuntado a `BrandingImage` vía rails runner (ver bitácora —
el adjunto ActiveStorage tiene prioridad sobre el `value` de `site_settings`).

## Despliegue en un servidor nuevo

```bash
sudo mkdir -p /etc/bigbluebutton/branding
sudo cp -r landing /etc/bigbluebutton/branding/
sudo cp nginx/landing.nginx /etc/bigbluebutton/nginx/
sudo nginx -t && sudo systemctl reload nginx

cat bbb-web.properties.branding | sudo tee -a /etc/bigbluebutton/bbb-web.properties
# Fusionar bbb-html5.yml con el existente (NO sobrescribir wsUrl/pads del servidor destino):
sudo yq e -i '.public.app.clientTitle = "RockyGuard"' /etc/bigbluebutton/bbb-html5.yml
sudo yq e -i '.public.app.copyright = "©2026 RockyGuard Technologies LTD"' /etc/bigbluebutton/bbb-html5.yml

# Sin reuniones activas (verificar con getMeetings):
sudo systemctl restart bbb-web bbb-apps-akka
```

Si el dominio no es `bbb.rockyguard.tech`, ajustar las URLs absolutas en
`bbb-web.properties.branding`.

## Regenerar el slide PDF

```bash
google-chrome --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=landing/rg-default.pdf rg-default-slide.html
```

Reglas aprendidas para que la conversión de BBB no lo rompa: fondo en un `div` absoluto
(no en `body`) y colores sólidos (sin `background-clip: text`). Si solo cambia el PDF
(misma URL), no hay que reiniciar nada: aplica en la siguiente reunión creada.

## Advertencias

- ⚠️ `bbb-apps-akka` **no arranca** si `bbb-html5.yml` contiene claves fuera del esquema de
  `/usr/share/bigbluebutton/html5-client/private/config/settings.yml`.
- ⚠️ Reiniciar `bbb-apps-akka` cierra las reuniones activas — verificar antes con `getMeetings`.
- El archivo real `/etc/bigbluebutton/bbb-web.properties` contiene `securitySalt` (secreto):
  **nunca** commitearlo completo; aquí solo se versiona el bloque de branding.
