
// 1. Verbindung zu Supabase aufbauen
const supabaseUrl = 'https://wtellkdlpfsoqankwbua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZWxsa2RscGZzb3Fhbmt3YnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzY0ODYsImV4cCI6MjA3MjU1MjQ4Nn0.E4KpTEKEflzEp2-wI9uuBuyLtlmY9fpmeFRNkVQQ3oo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Map initialisieren
//var map = L.map('int_map').setView([51.481846, 7.216236], 4);
var map = L.map('int_map').fitWorld();

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 13,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// 3. Auf Position des Nutzers zentrieren
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
    text: 'Suchen', /* The text of the submit button */
    placeholder: 'Adresse eingeben', /* The placeholder text for the input field */
});

map.addControl(osmGeocoder);

// 4. POIs aus Supabase laden und auf die Karte bringen
const { data, error } = await supabase.from('pois').select('*');
console.log(data, error);