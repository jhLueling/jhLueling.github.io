
// Verbindung zu Supabase aufbauen
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wtellkdlpfsoqankwbua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZWxsa2RscGZzb3Fhbmt3YnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzY0ODYsImV4cCI6MjA3MjU1MjQ4Nn0.E4KpTEKEflzEp2-wI9uuBuyLtlmY9fpmeFRNkVQQ3oo';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase ist bereit:', supabase);

const output = document.getElementById('output');

async function initMap() {
    //const map = L.map('int_map').setView([51.481846, 7.216236], 4);
    const map = L.map('int_map').fitWorld();
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 13,
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    return map;
}

// Registrierung
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  const { data, error } = await supabase.auth.signUp({ email, password });

  output.textContent = error
    ? 'Registrierungs-Fehler: ' + error.message
    : 'Registrierung erfolgreich: ' + data.user.email;
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    output.textContent = 'Login-Fehler: ' + error.message;
    return;
  }

  output.textContent = 'Eingeloggt als: ' + data.user.email;
  document.getElementById('username-form').style.display = 'block';
});

// Username speichern
document.getElementById('set-username-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username: username });

  output.textContent = error
    ? 'Fehler beim Speichern des Usernames: ' + error.message
    : 'Username erfolgreich gespeichert: ' + username;
});

// Map initialisieren
document.getElementById('auth-container').style.display = 'none';
document.getElementById('map-container').style.display = 'block';
const map = await initMap();

// Auf Position des Nutzers zentrieren
map.locate({setView: true, maxZoom: 16});

function onLocationFound(e) {
    var radius = e.accuracy;

    L.marker(e.latlng).addTo(map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

function onLocationError(e) {
    alert(e.message);
}

map.on('locationerror', onLocationError);

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

function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.name) {
        layer.bindPopup(feature.properties.name);
    }
}

var geojsonLayer = new L.GeoJSON.AJAX("poi.geojson",  {
    onEachFeature: onEachFeature
});
geojsonLayer.addTo(map);

// Add OpenStreetMap geocoding control to the map for address search functionality
var osmGeocoder = new L.Control.OSMGeocoder({
    text: 'Suchen',
    placeholder: 'Adresse eingeben',
});

map.addControl(osmGeocoder);

// POIs aus Supabase laden und auf die Karte bringen
const { data, error } = await supabase.from('pois').select('*');
console.log(data, error);