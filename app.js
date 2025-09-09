// ----- Setup -----
//import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'; // Supabase Client importieren
//import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = 'https://wtellkdlpfsoqankwbua.supabase.co';
const supabaseKey = 'sb_publishable_4NUQh1YitkBLlKgzXu9OBA_b6GxDAXY';
const client = supabase.createClient(supabaseUrl, supabaseKey)
//const supabase = createClient(supabaseUrl, supabaseKey);
//console.log('Supabase ist bereit:', supabase);
let map; // globale Variable für die Karte
let lightLayer;
let darkLayer;

// ----- Hilfsfunktionen -----
function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.name) {
      layer.bindPopup(feature.properties.name);
  }
}
function onLocationFound(e) {
  var radius = e.accuracy;
  L.marker(e.latlng).addTo(map)
      .bindPopup("You are within " + radius + " meters from this point").openPopup();
  L.circle(e.latlng, radius).addTo(map);
}
function onLocationError(e) {
  alert(e.message);
}
function setDarkLayer() {
  if (!darkLayer) {
    darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      minZoom: 9,
      maxZoom: 19,
      opacity: 0.8,  // statt 1
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
    });
  }
}
function setLightLayer() {
  if (!lightLayer) {
    lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          minZoom: 9,
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      });
  }
}
function applyDarkMode(isDark) {
  if (isDark) {
    setDarkLayer(); 
    if (map.hasLayer(lightLayer)) map.removeLayer(lightLayer);
    if (!map.hasLayer(darkLayer)) darkLayer.addTo(map);
  } else {
    setLightLayer();
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    if (!map.hasLayer(lightLayer)) lightLayer.addTo(map);
  }
}
function applyAutoDarkmode(lat, lng) {
  // aktuelles Datum
  //const now = new Date();
  const now = new Date('2025-09-09T22:30:00'); // simuliert 22:30 Uhr

  // Sonnenzeiten berechnen
  const sunTimes = SunCalc.getTimes(now, lat, lng);

  const sunrise = sunTimes.sunrise;   // z.B. 06:35
  const sunset  = sunTimes.sunset;    // z.B. 19:45

  const isDark = now < sunrise || now > sunset;

  applyDarkMode(isDark);
}

// ----- Map-Funktionen -----
//  Karte initialisieren
async function initMap() {
    //const map = L.map('map-container').setView([51.481846, 7.216236], 4);

    if (map) {
      map.remove();   // alte Karte komplett löschen
      map = null;
      lightLayer = null;
      darkLayer = null;
    } 

    map = L.map('map').fitWorld();
    setLightLayer();
    lightLayer.addTo(map);
    return map;
}

// Karte anzeigen
async function showMap() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('map-container').style.display = 'block';
  await initMap();

  // Auf Position des Nutzers zentrieren
  map.locate({setView: true, maxZoom: 16});
  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);

  // Bei Start GPS holen
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    applyAutoDarkmode(lat, lng);
  });

  // Custom Logout Control
  const LogoutControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.innerHTML = 'Logout';
          container.style.background = 'white';
          container.style.cursor = 'pointer';
          container.style.padding = '5px';
          container.onclick = async () => {
              await handleLogout();
          };
          return container;
      }
  });
  map.addControl(new LogoutControl());

  // GeoJSON Layer mit POIs laden
  var geojsonLayer = new L.GeoJSON.AJAX("data/poi.geojson",  {
      onEachFeature: onEachFeature
  });
  geojsonLayer.addTo(map);

  // OpenStreetMap geocoding for address search
  var osmGeocoder = new L.Control.OSMGeocoder({
      text: 'Suchen',
      placeholder: 'Adresse eingeben',
  });
  map.addControl(osmGeocoder);
}

// POIs anzeigen
async function loadPois() {
  const { data, error } = await client.from('pois').select('*')
  console.log('POIs:', data, error)
}

// ----- Auth-Funktionen -----
// Registrierung
async function handleRegistration(email, password, username) {
  // 1. Registrierung
  const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) return alert('Registrierung fehlgeschlagen: ' + signUpError.message);

  const userId = signUpData.user.id;

  // 2. Username in profiles speichern
  const { error: profileError } = await client.from('profiles').upsert({
    user_id: userId,
    username: username,
    created_at: new Date()
  });
  if (profileError) return alert('Profil speichern fehlgeschlagen: ' + profileError.message);

  // 3. Popup anzeigen
  document.getElementById('prefs-popup').style.display = 'block';
}

// Login
async function handleLogin(email, password) {
  // 1. Login
  const { data: loginData, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) return alert('Login fehlgeschlagen: ' + loginError.message);

  const userId = loginData.user.id;

  // 2. Username prüfen / ggf. setzen
  const { data: profileData, error: profileError } = await client
    .from('profiles')
    .select('username')
    .eq('user_id', userId)
    .single();
  if (profileError) return alert('Profil laden fehlgeschlagen: ' + profileError.message);

  if (!profileData.username) {
    const newUsername = prompt("Bitte wähle einen Benutzernamen:");
    await client.from('profiles').upsert({ user_id: userId, username: newUsername });
  }

  // 3. Map anzeigen
  await showMap();
}
// Logout
async function handleLogout() {
  const { error } = await client.auth.signOut();
  if (error) {
    alert('Logout fehlgeschlagen: ' + error.message);
  } else {

    if (map) {
      map.remove();  // Leaflet-Objekte entsorgen
      map = null;
      lightLayer = null;
      darkLayer = null;
    }
    
    // Session ist beendet → Map verstecken, Auth-Formular anzeigen
    document.getElementById('map-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'block';
  }
}

// Nutzerpräferenzen laden
async function loadUserPrefs() {
  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) return [];

  const { data: prefs, error } = await client
    .from('user_category_prefs')
    .select('category')
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Laden der Präferenzen:", error);
    return [];
  }

  return prefs.map(p => p.category);
}

// ----- Initialisierung -----
// Session-Prüfung beim Laden
window.addEventListener('load', async () => {
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    // Nutzer bereits eingeloggt → Map direkt anzeigen
    await showMap();
  }
});

// Eventlistener für Buttons
document.getElementById('register-btn').addEventListener('click', async () => {
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const username = document.getElementById('register-username').value;
  await handleRegistration(email, password, username);
});
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  await handleLogin(email, password);
});
document.getElementById('save-prefs-btn').addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('#prefs-popup input[type=checkbox]:checked');
  const selected = Array.from(checkboxes).map(cb => cb.value);

  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) return alert("Nicht eingeloggt!");

  const rows = selected.map(cat => ({ user_id: user.id, category: cat }));
  const { error } = await client.from('user_category_prefs').insert(rows);

  if (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Fehler beim Speichern deiner Präferenzen.");
  } else {
    alert("Präferenzen gespeichert!");
    document.getElementById('prefs-popup').style.display = 'none';
  }

  showMap();
});
//document.getElementById('logout-btn').addEventListener('click', handleLogout);

//var popup = L.popup()
//   .setLatLng([51.48, 7.22])
//    .setContent("I am a standalone popup.")
//    .openOn(map);

//function onMapClick(e) {
//    popup
//        .setLatLng(e.latlng)
//        .setContent("You clicked the map at " + e.latlng.toString())
//        .openOn(map);
//}

//map.on('click', onMapClick);

// POIs aus Supabase laden und auf die Karte bringen
loadPois()