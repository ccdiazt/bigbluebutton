/*
 * BBB AI Notes - interruptor "Asistente de IA" en Settings de las salas de Greenlight v3.
 * Se sirve desde /etc/bigbluebutton/branding/landing/ y se inyecta con el sub_filter de
 * landing.nginx (override: ni BBB ni Greenlight lo tocan al actualizar).
 *
 * Usa la misma API que la interfaz (GET/PATCH /api/v1/room_settings/:friendly_id con el token
 * CSRF de la pagina), asi que respeta permisos y la configuracion de salas del administrador.
 * Si una version futura de Greenlight cambia la pantalla, el interruptor simplemente no aparece
 * y las salas conservan sus valores guardados.
 */
(function () {
  'use strict';
  var NAME = 'meta_ai-notes';
  var NOTICE = 'Esta sesión será transcrita y resumida por un asistente de IA local.';
  var en = (document.documentElement.lang || navigator.language || 'es').slice(0, 2) === 'en';
  var T = en ? {
    label: 'AI assistant: transcript and minutes',
    hint: 'Records the session and emails the minutes to the room owner.',
    denied: 'Recording is disabled by the administrator.',
    failed: 'Could not save. Try again.',
  } : {
    label: 'Asistente de IA: transcripción y minuta',
    hint: 'Graba la sesión y envía la minuta por correo al dueño de la sala.',
    denied: 'La grabación está deshabilitada por el administrador.',
    failed: 'No se pudo guardar. Intente de nuevo.',
  };

  function roomId() {
    var m = location.pathname.match(/^\/rooms\/([a-z0-9-]+)\/?$/);
    return m && m[1];
  }

  function csrf() {
    var t = document.querySelector('meta[name="csrf-token"]');
    return t ? t.getAttribute('content') : '';
  }

  function api(method, id, body) {
    return fetch('/api/v1/room_settings/' + encodeURIComponent(id), {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json().catch(function () { return {}; });
    });
  }

  function set(id, name, value) {
    return api('PATCH', id, { room_setting: { settingName: name, settingValue: value } });
  }

  // Al activar, meta_ai-notes va al final; al desactivar, primero: un fallo a mitad nunca deja la
  // sala con opt-in y sin grabacion automatica.
  function apply(id, on, current) {
    var steps = on
      ? [['autoStartRecording', true], ['allowStartStopRecording', false],
         ['notifyRecordingAppend', NOTICE], [NAME, true]]
      : [[NAME, false], ['autoStartRecording', false], ['allowStartStopRecording', true],
         ['notifyRecordingAppend', '']];
    if (on && current.record !== 'true') steps.unshift(['record', true]);
    return steps.reduce(function (p, s) {
      return p.then(function () { return set(id, s[0], s[1]); });
    }, Promise.resolve());
  }

  function build(row) {
    var mine = row.cloneNode(true);
    var input = mine.querySelector('input');
    var label = mine.querySelector('label');
    if (!input || !label) return null;
    input.id = NAME;
    input.checked = false;
    input.disabled = true;
    label.htmlFor = NAME;
    label.textContent = T.label;
    var hint = document.createElement('div');
    hint.className = 'small';
    hint.textContent = T.hint;
    label.appendChild(hint);
    return { row: mine, input: input, hint: hint };
  }

  function ensure() {
    var id = roomId();
    if (!id || document.getElementById(NAME)) return;
    var ref = document.getElementById('muteOnStart');
    var row = ref && ref.closest('.room-settings-row');
    if (!row) return;
    var ui = build(row);
    if (!ui) return;
    row.parentNode.insertBefore(ui.row, row.nextSibling);

    var current = {};
    api('GET', id).then(function (r) {
      current = (r && r.data) || {};
      if (!(NAME in current)) { ui.row.remove(); return; } // deshabilitado por el administrador
      ui.input.checked = current[NAME] === 'true';
      ui.input.disabled = false;
    }).catch(function () { ui.row.remove(); });

    ui.input.addEventListener('change', function () {
      var on = ui.input.checked;
      ui.input.disabled = true;
      apply(id, on, current)
        .then(function () { location.reload(); }) // refresca "Allow room to be recorded"
        .catch(function (e) {
          ui.input.checked = !on;
          ui.input.disabled = false;
          ui.hint.textContent = e.status === 403 ? T.denied : T.failed;
        });
    });
  }

  new MutationObserver(ensure).observe(document.documentElement, { childList: true, subtree: true });
  ensure();
})();
