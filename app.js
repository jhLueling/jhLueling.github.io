// ----- Setup -----
//import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'; // Supabase Client importieren
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = 'https://wtellkdlpfsoqankwbua.supabase.co';
const supabaseKey = 'sb_publishable_4NUQh1YitkBLlKgzXu9OBA_b6GxDAXY';
const supabase = createClient(supabaseUrl, supabaseKey);
//console.log('Supabase ist bereit:', supabase);
let map; // globale Variable für die Karte

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

// ----- Map-Funktionen -----
//  Karte initialisieren
async function initMap() {
    //const map = L.map('map-container').setView([51.481846, 7.216236], 4);
    map = L.map('map-container').fitWorld();
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 13,
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
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

  // GeoJSON Layer mit POIs laden
  var geojsonLayer = new L.GeoJSON.AJAX("poi.geojson",  {
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

// ----- Auth-Funktionen -----
// Registrierung
async function handleRegistration(email, password, username) {
  // 1. Registrierung
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) return alert('Registrierung fehlgeschlagen: ' + signUpError.message);

  const userId = signUpData.user.id;

  // 2. Username in profiles speichern
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    username: username
  });
  if (profileError) return alert('Profil speichern fehlgeschlagen: ' + profileError.message);

  // 3. Map anzeigen
  await showMap();
}

// Login
async function handleLogin(email, password) {
  // 1. Login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return alert('Login fehlgeschlagen: ' + loginError.message);

  const userId = loginData.user.id;

  // 2. Username prüfen / ggf. setzen
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();
  if (profileError) return alert('Profil laden fehlgeschlagen: ' + profileError.message);

  if (!profileData.username) {
    const newUsername = prompt("Bitte wähle einen Benutzernamen:");
    await supabase.from('profiles').upsert({ id: userId, username: newUsername });
  }

  // 3. Map anzeigen
  await showMap();
}

// ----- Initialisierung -----
// Session-Prüfung beim Laden
window.addEventListener('load', async () => {
  const { data: { session } } = await supabase.auth.getSession();
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
const { data, error } = await supabase.from('pois').select('*');
console.log(data, error);