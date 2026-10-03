/* Bean Bag Rental Co — address autocomplete + driving distance.
   Uses Google Places API (New) and Routes API with a browser key restricted to beanbagrentals.com. */
window.BBRCPlaces = (function () {
  var KEY = 'AIzaSyC7WCavaqgBRfUfugxF4k_63Qx9jIHQzJc';
  var ORIGIN = '11201 Cedar Lake Dr, Raleigh, NC 27614'; // Spencer's premises
  var BIAS = { circle: { center: { latitude: 35.9, longitude: -78.8 }, radius: 160000 } }; // Triangle, ~100 mi
  var css = '.bbrc-ac{position:relative}.bbrc-ac-list{position:absolute;left:0;right:0;top:100%;z-index:50;margin:4px 0 0;padding:4px 0;list-style:none;background:#fff;color:#202B3A;border:1px solid #DAD6CC;border-radius:10px;box-shadow:0 12px 32px rgba(32,43,58,.18);max-height:280px;overflow-y:auto;text-align:left}.bbrc-ac-list[hidden]{display:none}.bbrc-ac-item{padding:9px 14px;cursor:pointer;font-size:15px;line-height:1.3}.bbrc-ac-item small{display:block;color:#5B6472;font-size:13px}.bbrc-ac-item[aria-selected=true],.bbrc-ac-item:hover{background:#F1EEE4}.bbrc-ac-foot{padding:6px 14px 4px;font-size:11px;color:#8A90A0;text-align:right}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function token() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function suggest(input, session) {
    return fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
      body: JSON.stringify({ input: input, sessionToken: session, locationBias: BIAS, includedRegionCodes: ['us'] })
    }).then(function (r) { return r.json(); }).then(function (d) {
      return (d.suggestions || []).map(function (s) { return s.placePrediction; }).filter(Boolean);
    });
  }
  function details(placeId, session) {
    return fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId) + '?sessionToken=' + session, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents' }
    }).then(function (r) { return r.json(); }).then(function (p) {
      var comp = function (type) { var c = (p.addressComponents || []).filter(function (a) { return (a.types || []).indexOf(type) >= 0; })[0]; return c ? c.longText : ''; };
      var name = p.displayName && p.displayName.text ? p.displayName.text : '';
      var addr = p.formattedAddress || '';
      return { placeId: p.id, name: name, address: addr, display: (name && addr.indexOf(name) !== 0) ? name + ', ' + addr : addr,
        town: comp('locality') || comp('sublocality') || comp('administrative_area_level_3') || '', state: comp('administrative_area_level_1'),
        lat: p.location ? p.location.latitude : null, lng: p.location ? p.location.longitude : null };
    });
  }

  /* Attach a suggestion dropdown to a text input. onSelect(place) fires when the user picks one. */
  function autocomplete(input, onSelect) {
    var wrap = document.createElement('div'); wrap.className = 'bbrc-ac';
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var list = document.createElement('ul'); list.className = 'bbrc-ac-list'; list.hidden = true; list.setAttribute('role', 'listbox'); wrap.appendChild(list);
    input.setAttribute('autocomplete', 'off'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false');
    var session = token(), timer = null, items = [], active = -1, lastPicked = '';

    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
    function render() {
      if (!items.length) { close(); return; }
      list.innerHTML = items.map(function (p, i) {
        var main = p.structuredFormat && p.structuredFormat.mainText ? p.structuredFormat.mainText.text : (p.text ? p.text.text : '');
        var sec = p.structuredFormat && p.structuredFormat.secondaryText ? p.structuredFormat.secondaryText.text : '';
        return '<li class="bbrc-ac-item" role="option" data-i="' + i + '" aria-selected="' + (i === active) + '">' + esc(main) + '<small>' + esc(sec) + '</small></li>';
      }).join('') + '<li class="bbrc-ac-foot">Powered by Google</li>';
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function pick(i) {
      var p = items[i]; if (!p) return;
      close(); input.value = p.text ? p.text.text : '';
      details(p.placeId, session).then(function (place) {
        session = token();
        input.value = place.display; lastPicked = place.display;
        if (onSelect) onSelect(place);
      }).catch(function () { session = token(); });
    }
    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (lastPicked && q !== lastPicked && onSelect) onSelect(null);
      lastPicked = '';
      clearTimeout(timer);
      if (q.length < 3) { items = []; close(); return; }
      timer = setTimeout(function () {
        suggest(q, session).then(function (res) { if (input.value.trim() === q) { items = res; active = -1; render(); } }).catch(function () { items = []; close(); });
      }, 220);
    });
    input.addEventListener('keydown', function (e) {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); pick(active); } }
      else if (e.key === 'Escape') { close(); }
    });
    list.addEventListener('mousedown', function (e) { var li = e.target.closest('.bbrc-ac-item'); if (li) { e.preventDefault(); pick(+li.getAttribute('data-i')); } });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
  }

  /* Driving distance from Spencer's premises to a place. Resolves {miles, minutes}. */
  function distanceFromSpencer(place) {
    var dest = place.placeId ? { placeId: place.placeId } : { address: place.address };
    return fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
      body: JSON.stringify({ origin: { address: ORIGIN }, destination: dest, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', units: 'IMPERIAL' })
    }).then(function (r) { return r.json(); }).then(function (d) {
      var r = d.routes && d.routes[0]; if (!r) throw new Error('no route');
      return { miles: Math.round(r.distanceMeters / 1609.344), minutes: Math.round(parseFloat(r.duration) / 60) };
    });
  }

  return { autocomplete: autocomplete, distanceFromSpencer: distanceFromSpencer, ORIGIN: ORIGIN };
})();
