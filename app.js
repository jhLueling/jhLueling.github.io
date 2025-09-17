// ===== Setup & globale Variablen =====
// Supabase Client
const supabaseUrl = 'https://wtellkdlpfsoqankwbua.supabase.co';
const supabaseKey = 'sb_publishable_4NUQh1YitkBLlKgzXu9OBA_b6GxDAXY';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let map;          // globale Karte
let lightLayer;   // helles Layer
let darkLayer;    // dunkles Layer
let categoryIcons; // Icons für Kategorien/Subtypen
let currentSessionId; // aktuelle Session-ID
const markersByPoiId = new Map(); // poi.id -> marker
let lastWeightComputationAt = 0;  // timestamp fürs Debouncing
const WEIGHT_COMPUTATION_DEBOUNCE_MS = 1500; // vermeidet zu häufige Recalculations
let recomputeTimeout = null;
let opacityMin = 0.75, opacityMax = 1.0;
let scaleMin   = 0.7, scaleMax   = 1.3;

// Subkategorie-Übersetzung deutsch
const subTypeTranslation = {
    cafe: "Café",
    restaurant: "Restaurant",
    bar: "Bar",
    fast_food: "Fast Food",
    pub: "Pub",
    biergarten: "Biergarten",
    theatre: "Theater",
    cinema: "Kino",
    museum: "Museum",
    arts_centre: "Kunstzentrum",
    library: "Bibliothek",
    sports_centre: "Sportzentrum",
    stadium: "Stadion",
    swimming_pool: "Schwimmbad",
    fitness_centre: "Fitnessstudio",
    pitch: "Sportplatz",
    track: "Laufbahn",
    park: "Park",
    garden: "Garten",
    playground: "Spielplatz",
    nature_reserve: "Naturschutzgebiet",
    picnic_site: "Picknickplatz",
    camp_site: "Campingplatz",
    supermarket: "Supermarkt",
    convenience: "Convenience Store",
    mall: "Einkaufszentrum",
    bakery: "Bäckerei",
    kiosk: "Kiosk",
    books: "Buchladen",
    sports: "Sportgeschäft",
    toys: "Spielzeugladen",
    clothes: "Kleidungsgeschäft",
    attraction: "Attraktion",
    viewpoint: "Aussichtspunkt",
    zoo: "Zoo",
    theme_park: "Freizeitpark",
    castle: "Schloss",
    monument: "Denkmal",
    ruins: "Ruine",
    memorial: "Gedenkstätte"
};

// LayerGroups für jede Kategorie
const categoryLayers = {
    gastronomy: L.layerGroup(),
    culture: L.layerGroup(),
    sport: L.layerGroup(),
    nature: L.layerGroup(),
    shopping: L.layerGroup(),
    sightseeing: L.layerGroup(),
    position: L.layerGroup()
};

// OverlayMaps für LayerControl
const overlayMaps = {
    "Gastronomie": categoryLayers.gastronomy,
    "Kultur": categoryLayers.culture,
    "Sport": categoryLayers.sport,
    "Natur": categoryLayers.nature,
    "Einkaufen": categoryLayers.shopping, // vorher Shopping
    "Sehenswürdigkeiten": categoryLayers.sightseeing,
    "Meine Position": categoryLayers.position
};

// Kategorie-Farben
const categoryColors = {
    gastronomy: "#E27D60",
    culture: "#9B59B6",
    sport: "#27AE60",
    nature: "#16A085",
    shopping: "#2980B9",
    sightseeing: "#F1C40F",
    position: "#8B1A10"
};

// ===== Hilfsfunktionen =====
function onLocationFound(e) {
    const radius = e.accuracy;
    const markerIcon = createMarkerWithIcon("position", 'icons/my_location_24dp_E3E3E3.svg', map.getZoom(), 1.5);
    const marker = L.marker(e.latlng, { icon: markerIcon })//.addTo(map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();
    marker.setZIndexOffset(1000);
    const circ = L.circle(e.latlng, radius);//.addTo(map);
    categoryLayers["position"].addLayer(marker);
    categoryLayers["position"].addLayer(circ);
    debounceRecomputeWeights();

    map.once('move', () => {
        categoryLayers["position"].removeLayer(circ);
    });
}
function onLocationError(e) {
    alert(e.message);
}

// Light/Dark Layer setzen
function setDarkLayer() {
    if (!darkLayer) {
        darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            minZoom: 12,
            maxZoom: 19,
            opacity: 0.8,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        });
    }
}
function setLightLayer() {
    if (!lightLayer) {
        lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 12,
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OSM</a>'
        });
    }
}
function applyDarkMode(isDark) {
    if (isDark) {
        setDarkLayer();
        if (lightLayer && map.hasLayer(lightLayer)) map.removeLayer(lightLayer);
        if (!map.hasLayer(darkLayer)) darkLayer.addTo(map);
    } else {
        setLightLayer();
        if (darkLayer && map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
        if (!map.hasLayer(lightLayer)) lightLayer.addTo(map);
    }
}
function applyAutoDarkmode(lat, lng) {
    const now = new Date();
    const sunTimes = SunCalc.getTimes(now, lat, lng);
    const sunrise = sunTimes.sunrise;
    const sunset = sunTimes.sunset;
    const isDark = now < sunrise || now > sunset;
    applyDarkMode(isDark);
}

function computeMarkerSize(zoom, scaleFactor = 1, minS = 16, maxS = 32, minZ = 10, maxZ = 18) {
    const baseSize = zoom <= minZ ? minS : zoom >= maxZ ? maxS : minS + ((zoom - minZ)/(maxZ - minZ))*(maxS - minS);
    return Math.round(baseSize * scaleFactor);
}

function createMarkerWithIcon(category, iconUrl, zoom = 14, scaleFactor = 1.0) {
    // Icon-Größe basierend auf Zoom interpolieren
    const size = computeMarkerSize(zoom, scaleFactor);

    const color = categoryColors[category] || "#888";

    // DivIcon mit runden Hintergrund und SVG
    const divIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                position: relative;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background-color: ${color};
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 0 4px rgba(0,0,0,0.5);
            ">
                <img src="${iconUrl}" style="width: ${size * 0.6}px; height: ${size * 0.6}px;" />
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size/2, size], // Spitze unten
        popupAnchor: [0, -size]
    });

    return divIcon;
}

function createDefaultMarkerIcon(scaleFactor = 1, category = 'gastronomy') {
    
    // Icon-Größensteuerung
    const minSize = 16;
    const maxSize = 32;

    const size = Math.round(minSize + ((maxSize - minSize) * scaleFactor));
    const color = categoryColors[category] || '#888';

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background-color: ${color};
                opacity: 0.6;
                border: 2px solid #fff;
                box-shadow: 0 0 4px rgba(0,0,0,0.4);
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size/2, size],
        popupAnchor: [0, -size]
    });
}

// ----- Wetter (Open-Meteo, keyless) -----
// Liefert ein einfaches, regelbares Wetterobjekt: { precipitation, temp, weathercode }
async function fetchWeatherForLocation(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather fetch failed');
        const json = await res.json();
        // current_weather: { temperature, windspeed, winddirection, weathercode, time }
        const cw = json.current_weather || {};
        // einfache Ableitung: precipitationFlag (wenn weathercode ist Regen/Snow)
        // weathercode docs: codes 61..67 = rain, 80..82 = rain showers, 71..77 = snow, etc.
        const code = cw.weathercode ?? null;
        const precipitation = code && ((code >= 61 && code <= 82) || (code >= 71 && code <= 77));
        return {
            temperature: cw.temperature ?? null,
            weathercode: code,
            precipitation: !!precipitation
        };
    } catch (err) {
        console.warn("Weather fetch failed:", err);
        return { temperature: null, weathercode: null, precipitation: false };
    }
}

function debounceRecomputeWeights(delay = WEIGHT_COMPUTATION_DEBOUNCE_MS) {
    if (recomputeTimeout) clearTimeout(recomputeTimeout);
    recomputeTimeout = setTimeout(async () => {
        recomputeTimeout = null;
        if (!map || !currentUserId) return;

        try {
            // UserPOIs lokal aus markersByPoiId
            const userPois = Array.from(markersByPoiId.values()).map(m => m.poiData).filter(p => p);

            if (userPois.length === 0) return;

            const center = map.getCenter();
            const weather = await fetchWeatherForLocation(center.lat, center.lng);

            // Lokale Berechnung (ohne DB-Update)
            computePoiWeightsLocally(userPois, { lat: center.lat, lon: center.lng, weather });

            // Marker-UI anwenden
            applyWeightsToMarkersLocally(userPois);
        } catch (err) {
            await logPrototypeError("debounceRecomputeWeights", err, { currentUserId });
        }
    }, delay);
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function normalize(w, userPois) {
    const weights = userPois.map(p => p.weight ?? 0);
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    if (max === min) return 0.5; // alle gleich → Mitte
    return (w - min) / (max - min);
}

function computeMaxWeightLocally(userPois) {
    if (!userPois || userPois.length === 0) return 1;
    const weights = userPois.map(p => p.weight ?? 0);
    return Math.max(...weights);
}

function weightThresholdForZoom(zoom, maxWeight = 1) {
    // Basis: maxWeight in gleichmäßige Schritte teilen
    const steps = 6; // oder 4, je nachdem
    const step = maxWeight / steps;

    if (zoom <= 12) return maxWeight - step * 1;
    if (zoom <= 13) return maxWeight - step * 2;
    if (zoom <= 14) return maxWeight - step * 3;
    if (zoom <= 15) return maxWeight - step * 4;
    if (zoom <= 16) return maxWeight - step * 5;
    return 0;
}

async function logPrototypeError(component, error, context = {}) {
    if (!currentUserId || !currentSessionId) return;
    try {
        await client.from('prototype_errors').insert({
            user_id: currentUserId,
            session_id: currentSessionId,
            component,
            error_message: error?.message || String(error),
            stack: error?.stack || null,
            context
        });
        console.error(`[Prototype Error][${component}]`, error, context);
    } catch (err) {
        console.error("❌ Fehler beim Logging selbst:", err);
    }
}

// ===== Map-Funktionen =====
async function initMap() {
    if (map) {
        map.remove(); // alte Karte entsorgen
        map = null;
        lightLayer = null;
        darkLayer = null;
    }
    map = L.map('map').fitWorld();
    setLightLayer();
    setDarkLayer();
    lightLayer.addTo(map);
    return map;
}

async function showMap() {
    try {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('map-container').style.display = 'block';
        await initMap();

        // Nutzer-Position
        map.locate({ setView: true, maxZoom: 16 });
        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);

        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            applyAutoDarkmode(lat, lng);
        });

        // Logout Control
        const LogoutControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = 'Logout';
                container.style.background = 'white';
                container.style.cursor = 'pointer';
                container.style.padding = '5px';
                container.onclick = async () => { await handleLogout(); };
                return container;
            }
        });
        map.addControl(new LogoutControl());

        // OSM Geocoder
        var osmGeocoder = new L.Control.OSMGeocoder({ text: 'Suchen', placeholder: 'Adresse eingeben' });
        map.addControl(osmGeocoder);

        // User POIs laden
        const { data: userData } = await client.auth.getUser();
        const userId = userData?.user?.id;
        let userPois = await loadUserPois(userId);
        if (!userPois || userPois.length === 0) {
            await fetchRandomPoisByCity(userId);
            userPois = await loadUserPois(userId);
        }
        if (!userPois || userPois.length === 0) {
            console.warn("Dieser User hat keine POIs.");
            return;
        }

        if (userPois && userPois.length > 0) {
            const poiIds = userPois.map(p => p.id);
            const poiIdStrings = poiIds.map(id => String(id))
            const poiChunks = chunkArray(poiIdStrings, 100); // z.B. 100 IDs pro Abfrage
            let allWeights = [];

            for (const chunk of poiChunks) {
                const { data, error } = await client
                    .from('poi_weights')
                    .select('poi_id, weight')
                    .eq('user_id', userId)
                    .in('poi_id', chunk);

                if (error) throw error;
                allWeights = allWeights.concat(data);
            }

            const weightsById = {};
            (allWeights || []).forEach(w => { weightsById[w.poi_id] = Number(w.weight); });

            // attach weight to each poi object (0..1 default 0)
            userPois = userPois.map(p => ({ ...p, weight: (weightsById[p.id] ?? 0) }));
        }

        // Icons laden
        categoryIcons = await loadCategoryIcons();

        // Marker erzeugen & Layer zuordnen (speichern Referenzen)
        markersByPoiId.clear();
        userPois.forEach(poi => {
            try {
                const iconObj = categoryIcons[poi.subcategory] || categoryIcons[poi.category];
                const iconUrl = iconObj.options.iconUrl;

                const poiCategory = poi.category;
                const poiSubcategory = poi.subcategory ? subTypeTranslation[poi.subcategory] || poi.subcategory : '';
                /*
                const fb = poi.feedback || { liked: false, rating: null };

                const popupText = `
                <b>${poi.name}</b><br>
                ${poi.subcategory ? subTypeTranslation[poi.subcategory] || poi.subcategory : ''}<br><br>
                <label>
                    <input type="checkbox" class="like-checkbox" ${fb.liked ? 'checked' : ''}>
                    Gefällt mir
                </label><br>
                <label>
                    Bewertung:
                    <select class="rating-select">
                    <option value="">---</option>
                    ${[1,2,3,4,5].map(n => `<option value="${n}" ${fb.rating===n?'selected':''}>${n}</option>`).join('')}
                    </select>
                </label><br>
                <button class="save-feedback-btn">Speichern</button>
                `;*/

                const [lng, lat] = poi.location.coordinates;
                const w = poi.weight ?? 0;
                const scaleFactor = 0.75 + w * 0.5;

                const markerIcon = createMarkerWithIcon(poiCategory, iconUrl, map.getZoom(), scaleFactor);

                const marker = L.marker([lat, lng], { icon: markerIcon });

                // Speichere Kategorie, IconURL & POI-Daten für später
                marker.poiData = poi;
                marker.options._category = poiCategory;
                marker.iconUrl = iconUrl;

                marker.bindPopup(createPoiPopup(poi));

                marker.on('popupopen', (e) => {
                    const popupEl = e.popup._contentNode || e.popup._container;
                    if (!popupEl) return;

                    // Checkbox & Rating setzen aus marker.poiData.feedback
                    const feedback = marker.poiData.feedback || {};
                    const likeCheckbox = popupEl.querySelector('.like-checkbox');
                    const ratingSelect = popupEl.querySelector('.rating-select');
                    if (likeCheckbox) likeCheckbox.checked = !!feedback.liked;
                    if (ratingSelect) ratingSelect.value = feedback.rating || '';

                    const saveBtn = popupEl.querySelector('.save-feedback-btn');
                    if (saveBtn) {
                        saveBtn.onclick = async () => {
                            const liked = likeCheckbox.checked;
                            const rating = parseInt(ratingSelect.value || '0', 10);

                            await savePoiFeedback({ userId: currentUserId, poiId: marker.poiData.id, liked, rating });
                            marker.poiData.feedback = { liked, rating };
                            debounceRecomputeWeights(500);

                            alert('Feedback gespeichert!');
                        };
                    }
                });

                marker.on('click', async (e) => {
                    await logInteraction({ event_type: "click", target_type: "poi", target_id: poi.id });
                    const target = e.originalEvent.target;
                    if (!target) return;

                    // Gefällt mir Button
                    if (target.classList.contains('save-feedback-btn')) {
                        const popupEl = target.closest('.leaflet-popup-content');
                        if (!popupEl) return;

                        const markerId = popupEl.dataset.poiId;
                        const marker = markersByPoiId.get(markerId);
                        if (!marker) return;

                        const liked = popupEl.querySelector('.like-checkbox').checked;
                        const rating = parseInt(popupEl.querySelector('.rating-select').value || '0', 10);

                        await savePoiFeedback({ userId: currentUserId, poiId: markerId, liked, rating });
                        marker.poiData.feedback = { liked, rating };
                        debounceRecomputeWeights(500);

                        alert('Feedback gespeichert!');
                    }
                    debounceRecomputeWeights();
                });

                markersByPoiId.set(poi.id, marker);
                categoryLayers[poiCategory].addLayer(marker);
            } catch(err) {
                logPrototypeError("showMap-marker-setup", err, { currentUserId, poi });
            }
        });

        // Standardmäßig alle Layer aktiv
        Object.values(categoryLayers).forEach(layer => layer.addTo(map));
        L.control.layers(null, overlayMaps, { collapsed: false, position: 'topleft' }).addTo(map);

        // After map and markers exist, compute initial weights & apply them
        (async () => {
            // determine context: try to use map center or first POI or user location
            let ctxLat = null, ctxLon = null;
            try {
                const center = map.getCenter();
                ctxLat = center.lat; ctxLon = center.lng;
            } catch (e) { 
                const first = userPois[0];
                if (first && first.location) { ctxLat = first.location.coordinates[1]; ctxLon = first.location.coordinates[0]; }
            }
            const weather = (ctxLat && ctxLon) ? await fetchWeatherForLocation(ctxLat, ctxLon) : null;
            await computeAndStorePoiWeights(currentUserId, userPois, { lat: ctxLat, lon: ctxLon, weather });
            await applyWeightsToMarkers(currentUserId);
        })();

        // Event-Logging (Klicks, Zoom, Dauer)
        map.on("zoomend", () => {
            const zoom = map.getZoom();
            const userPois = Array.from(markersByPoiId.values())
                .map(m => m.poiData)
                .filter(p => p);
            const maxWeight = computeMaxWeightLocally(userPois);
            console.log("👉 MaxWeight berechnet:", maxWeight);
            const threshold = weightThresholdForZoom(zoom, maxWeight);

            logInteraction({
                event_type: "zoom",
                target_type: "map",
                zoom_level: zoom,
                map_center: map.getCenter(),
                bbox: map.getBounds()
            });
            markersByPoiId.forEach(marker => {
                const poi = marker.poiData;
                if (!poi) return;

                const w = poi.weight ?? 0;
                const norm = normalize(w, userPois);
                const scaleFactor = scaleMin + norm * (scaleMax - scaleMin);
                const opacity = opacityMin + norm * (opacityMax - opacityMin);
                //const scaleFactor = 0.75 + w * 0.5;
                const category = marker.options._category || poi.category || 'gastronomy';
                const iconUrl = marker.iconUrl || marker.options.icon.options.html?.match(/src="([^"]+)"/)?.[1];

                // Sichtbarkeit prüfen
                if (w < threshold) {
                    categoryLayers[category].removeLayer(marker); // ausblenden
                    return;
                } else {
                    categoryLayers[category].addLayer(marker); // wieder einblenden
                }

                marker.setIcon(
                    marker.iconUrl
                        ? createMarkerWithIcon(category, iconUrl, zoom, scaleFactor)
                        : createDefaultMarkerIcon(scaleFactor, zoom, category)
                );

                // Opacity
                //const opacity = 0.5 + 0.7 * w; 
                const el = marker.getElement();
                if (el) el.style.opacity = opacity;
            });
        });
        map.on("moveend", () => {
        logInteraction({
            event_type: "move",
            zoom_level: map.getZoom(),
            map_center: map.getCenter(),
            bbox: map.getBounds()
        });
        debounceRecomputeWeights();
        });
    } catch(err) {
        await logPrototypeError("showMap", err, {currentUserId});
    }
}

// applyWeightsToMarkers: liest poi_weights für currentUserId und passt Marker an
async function applyWeightsToMarkers(userId) {
    if (!userId) return;
    try {
        const { data: weightsData, error } = await client
            .from('poi_weights')
            .select('poi_id, weight')
            .eq('user_id', userId);

        if (error) throw error;

        const weights = {};
        (weightsData || []).forEach(w => { weights[w.poi_id] = Number(w.weight); });

        const userPois = Array.from(markersByPoiId.values())
            .map(m => m.poiData)
            .filter(p => p);

        markersByPoiId.forEach((marker, poiId) => {
            const w = weights[poiId] ?? (marker.poiData?.weight ?? 0);
            // update marker.poiData.weight too (so future zooms keep it)
            if (marker.poiData) marker.poiData.weight = w;

            const norm = normalize(w, userPois);

            const scaleFactor = scaleMin + norm * (scaleMax - scaleMin);
            const opacity     = opacityMin + norm * (opacityMax - opacityMin);

            // size & scaleFactor
            //const scaleFactor = 0.75 + w * 0.5;
            // get iconUrl
            let iconUrl;
            try {
                const html = marker.options.icon.options.html;
                const m = html.match(/src="([^"]+)"/);
                iconUrl = m ? m[1] : null;
            } catch(e) {
                iconUrl = null;
            }

            const category = marker.options._category || (marker.poiData && marker.poiData.category) || 'gastronomy';
            marker.setIcon(iconUrl 
                ? createMarkerWithIcon(category, iconUrl, map.getZoom(), scaleFactor)
                : createDefaultMarkerIcon(scaleFactor, category));

            // opacity mapping
            //const opacity = Math.max(0.5 + 0.7 * w);
            const el = marker.getElement();
            if (el) el.style.opacity = opacity;
        });
    } catch(err) {
        await logPrototypeError("applyWeightsToMarkers", err, { userId });
    }
}
function applyWeightsToMarkersLocally(userPois) {
    userPois.forEach(poi => {
        const marker = markersByPoiId.get(poi.id);
        if (!marker) return;

        const norm = normalize(poi.weight, userPois);
        
        const opacity = opacityMin + norm * (opacityMax - opacityMin);
        const scale   = scaleMin   + norm * (scaleMax   - scaleMin);

        /*marker.poiData.weight = poi.weight;

        const w = poi.weight;
        const scaleFactor = 0.75 + w * 0.5;*/

        const category = marker.options._category || poi.category || 'gastronomy';
        const iconUrl = marker.iconUrl || marker.options.icon.options.html?.match(/src="([^"]+)"/)?.[1];

        marker.setIcon(
            iconUrl
                ? createMarkerWithIcon(category, iconUrl, map.getZoom(), scale)
                : createDefaultMarkerIcon(scale, category)
        );

        // Opacity mapping
        const el = marker.getElement();
        if (el) el.style.opacity = opacity;//Math.max(0.5 + 0.7 * w);
    });
}

// ===== POI-Funktionen =====
function createPoiPopup(poi) {
    const fb = poi.feedback || { liked: false, rating: '' };

    const div = L.DomUtil.create('div');
    div.innerHTML = `
        <b>${poi.name}</b><br>
        ${poi.subcategory ? subTypeTranslation[poi.subcategory] || poi.subcategory : ''}<br><br>
        <label>
            <input type="checkbox" class="like-checkbox" ${fb.liked ? 'checked' : ''}>
            Gefällt mir
        </label><br>
        <label>
            Bewertung:
            <select class="rating-select">
                <option value="">---</option>
                ${[1,2,3,4,5].map(n => `<option value="${n}" ${fb.rating===n?'selected':''}>${n}</option>`).join('')}
            </select>
        </label><br>
        <button class="save-feedback-btn">Speichern</button>
    `;

    // Eventlistener direkt auf das div (Leaflet kümmert sich um Popup)
    L.DomEvent.on(div, 'click', (e) => {
        const target = e.target;
        if (target.classList.contains('save-feedback-btn')) {
            const liked = div.querySelector('.like-checkbox').checked;
            const rating = parseInt(div.querySelector('.rating-select').value || '0', 10);

            savePoiFeedback({ userId: currentUserId, poiId: poi.id, liked, rating })
                .then(() => {
                    poi.feedback = { liked, rating };
                    debounceRecomputeWeights(500);
                    alert('Feedback gespeichert!');
                });
        }
    });

    return div;
}

async function fetchRandomPoisByCity(userId) {
    try {
        const { data: allPois, error } = await client
            .from('pois')
            .select('*')
            .in('category', ['gastronomy','culture','sport','nature','sightseeing','shopping'])
            .neq('isunnamed', true);

        if (error) throw error;
        const bochumPois = allPois.filter(p => p.city === 'Bochum');
        const iserlohnPois = allPois.filter(p => p.city === 'Iserlohn');

        const shuffle = arr => arr.sort(() => Math.random() - 0.5);

        const selectedBochum = shuffle(bochumPois).slice(0, 900);
        const selectedIserlohn = shuffle(iserlohnPois).slice(0, 300);

        const selectedPois = [...selectedBochum, ...selectedIserlohn];

        const rows = selectedPois.map(p => ({ user_id: userId, poi_id: p.id }));
        const { error: insertError } = await client.from("user_pois").insert(rows);
        if (insertError) throw insertError;
        console.log(`✅ ${rows.length} POIs dem User ${userId} zugewiesen`);
    } catch(err) {
        await logPrototypeError("fetchRandomPoisByCity", err, { userId });
    }
}
// ----- Einflussmatrix: Berechnung & Speicherung der poi_weights (regelbasiert, kein ML) -----

/**
 * computeAndStorePoiWeights
 * - userId: uuid
 * - userPois: Array of POI objects (with id, category, location)
 * - context: { lat, lon, weather } optional
 *
 * Regeln (Beispiel-Gewichtung):
 *  pref: +0.40 (if category in user prefs)
 *  feedback (like/rating): up to +0.35
 *  recent_clicks (last 3 days): up to +0.15
 *  distance_bonus (<=500m): up to +0.25
 *  weather_adjust: outdoor categories down in precipitation, indoor up: +/- 0.15
 *
 * Stores upsert rows to poi_weights: {user_id, poi_id, weight, reason}
 */
async function computeAndStorePoiWeights(userId, userPois, context = {}) {
    if (!userId || !userPois || userPois.length === 0) return;
    try {
        // 1️⃣ Nutzerpräferenzen laden
        const { data: prefsData } = await client.from('user_category_prefs').select('category').eq('user_id', userId);
        const userPrefs = (prefsData || []).map(r => r.category);

        // 2️⃣ Feedback laden
        const poiIds = userPois.map(p => p.id);
        const poiChunks = chunkArray(poiIds.map(id => String(id)), 100);
        let allFeedback = [];
        for (const chunk of poiChunks) {
            const { data, error } = await client
                .from('user_poi_feedback')
                .select('poi_id, liked, rating, visited_at')
                .in('poi_id', chunk)
                .eq('user_id', userId);
            if (error) throw error;
            allFeedback = allFeedback.concat(data);
        }
        const feedbackByPoi = {};
        allFeedback.forEach(f => { feedbackByPoi[f.poi_id] = f; });

        // 3️⃣ Klicks der letzten 3 Tage laden
        const twoDaysAgo = new Date(Date.now() - 2*24*3600*1000).toISOString();
        let allClicks = [];
        for (const chunk of poiChunks) {
            const { data, error } = await client
                .from('interactions')
                .select('target_id')
                .in('target_id', chunk)
                .eq('event_type', 'click')
                .gte('created_at', twoDaysAgo);
            if (error) throw error;
            allClicks = allClicks.concat(data);
        }
        const clicksCount = {};
        allClicks.forEach(row => {
            clicksCount[row.target_id] = (clicksCount[row.target_id] || 0) + 1;
        });
        const maxClicks = Math.max(1, ...Object.values(clicksCount), 1);

        // 4️⃣ Wetter laden
        let weather = context.weather || null;
        if (!weather && context.lat != null && context.lon != null) {
            weather = await fetchWeatherForLocation(context.lat, context.lon);
        }

        const outdoorCats = new Set(['sport','nature','sightseeing']);
        const indoorCats = new Set(['culture','gastronomy','shopping']);

        // Distanzberechnung
        function haversineDistance(lat1, lon1, lat2, lon2) {
            const toRad = x => x * Math.PI / 180;
            const R = 6371000;
            const dLat = toRad(lat2-lat1);
            const dLon = toRad(lon2-lon1);
            const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        // Sigmoid-artige Transformation für hohe Werte
        function squashScore(s) {
            return 1 / (1 + Math.exp(-10*(s-0.6))); // shift + scale
        }

        const rowsToUpsert = [];
        const ctxLat = context.lat ?? null;
        const ctxLon = context.lon ?? null;

        for (const poi of userPois) {
            const reason = {};
            let score = 0.5; // Basiswert, alle POIs starten hoch

            // Präferenz (nur kleiner Bonus)
            const pref = userPrefs.includes(poi.category) ? 1 : 0;
            reason.pref = pref;
            score += 0.1 * pref;

            // Feedback (leichtes Gewicht)
            let fbScore = 0;
            const fb = feedbackByPoi[poi.id];
            if (fb) {
                if (fb.liked) fbScore += 0.15;
                if (fb.rating) fbScore += ((fb.rating - 1) / 4) * 0.15;
                if (fb.visited_at) {
                    const days = (Date.now() - new Date(fb.visited_at).getTime()) / (24*3600*1000);
                    if (days <= 7) fbScore += 0.05;
                }
            }
            reason.feedback = +fbScore.toFixed(3);
            score += fbScore;

            // Klicks normalization (geringer Bonus)
            const clicks = clicksCount[poi.id] || 0;
            const clicksNorm = Math.min(1, clicks / maxClicks);
            reason.clicks = clicks;
            score += 0.05 * clicksNorm;

            // Distance Bonus (geringer Bonus)
            let distBonus = 0;
            if (ctxLat != null && ctxLon != null && poi.location?.coordinates) {
                const [lon, lat] = poi.location.coordinates;
                const dist = haversineDistance(ctxLat, ctxLon, lat, lon);
                if (dist <= 500) distBonus = 0.05;
                else if (dist <= 2000) distBonus = 0.05*(1-((dist-500)/1500));
                reason.distance_m = Math.round(dist);
            } else reason.distance_m = null;
            reason.distBonus = +distBonus.toFixed(3);
            score += distBonus;

            // Wetteranpassung (leicht)
            let weatherAdj = 0;
            if (weather?.precipitation) {
                if (outdoorCats.has(poi.category)) weatherAdj -= 0.05;
                else if (indoorCats.has(poi.category)) weatherAdj += 0.03;
            }
            reason.weather_adj = +weatherAdj.toFixed(3);
            score += weatherAdj;

            // Sigmoid-Transformation
            score = squashScore(score);

            rowsToUpsert.push({
                user_id: userId,
                poi_id: poi.id,
                weight: Number(score.toFixed(3)),
                reason,
                updated_at: new Date().toISOString()
            });
        }

        const { error: upsertError } = await client.from('poi_weights').upsert(rowsToUpsert, { onConflict: ['user_id', 'poi_id'] });
        if (upsertError) throw upsertError;
        console.log("✅ poi_weights upserted:", rowsToUpsert.length);
    } catch(err) {
        await logPrototypeError("computeAndStorePoiWeights", err, { userId, context });
    }
}
function computePoiWeightsLocally(userPois, context = {}) {
    const ctxLat = context.lat ?? null;
    const ctxLon = context.lon ?? null;
    const weather = context.weather ?? null;

    const outdoorCats = new Set(['sport','nature','sightseeing']);
    const indoorCats = new Set(['culture','gastronomy','shopping']);

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = x => x * Math.PI / 180;
        const R = 6371000;
        const dLat = toRad(lat2-lat1);
        const dLon = toRad(lon2-lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    userPois.forEach(poi => {
        // DB-Gewicht als Ausgangspunkt
        let score = poi.weight ?? 0; // Option B: DB-Wert als Basis

        // lokale Feedback-Anpassungen, falls vorhanden
        const fb = poi.feedback || {};
        if (fb.liked) score += 0.05;         // kleine kurzfristige Anpassung
        if (fb.rating) score += ((fb.rating-3)/2) * 0.05; // leicht erhöhen/senken, nur kleine Wirkung

        // Distanzbonus
        if (ctxLat != null && ctxLon != null && poi.location?.coordinates) {
            const [lon, lat] = poi.location.coordinates;
            const dist = haversineDistance(ctxLat, ctxLon, lat, lon);
            let distBonus = 0;
            if (dist <= 500) distBonus = 0.05;
            else if (dist <= 2000) distBonus = 0.05*(1 - ((dist-500)/1500));
            score += distBonus;
        }

        // Wetter-Anpassung
        if (weather?.precipitation) {
            if (outdoorCats.has(poi.category)) score -= 0.05; // outdoor bei Regen leicht unattraktiv
            else if (indoorCats.has(poi.category)) score += 0.03; // indoor bei Regen leicht attraktiver
        }

        // Clamp 0..1
        poi.weight = Math.max(0, Math.min(1, score));
    });
}
/*
async function assignRandomPoisToUser(userId) {
    const { data: randomPois, error: selectError } = await client.rpc("fetch_random_pois_iserlohn"); //fetch_random_pois
    if (selectError) { console.error("Fehler beim Ziehen zufälliger POIs:", selectError); return; }
    const rows = randomPois.map(p => ({ user_id: userId, poi_id: p.id }));
    const { error: insertError } = await client.from("user_pois").insert(rows);
    if (insertError) console.error("Fehler beim Speichern:", insertError);
    else console.log(`✅ ${rows.length} POIs zugewiesen`);
}*/
async function loadUserPois(userId) {
    try {
        const { data, error } = await client.from("user_pois").select("pois(*)").eq("user_id", userId);
        if (error) throw error;
        return data.map(entry => entry.pois);
    } catch(err) {
        await logPrototypeError("loadUserPois", err, { userId });
        return [];
    }
}
async function deleteUserPois(userId) {
    try {  
        const { data, error } = await client.from("user_pois").delete("*").eq("user_id", userId);
        if (error) throw error;
    } catch(err) {
        await logPrototypeError("deleteUserPois", err, { userId });
        return [];
    }
}
async function loadCategoryIcons() {
    const res = await fetch('data/Icons.json');
    const data = await res.json();
    const icons = {};
    for (const [cat, url] of Object.entries(data)) {
        icons[cat] = L.icon({ iconUrl: url, iconSize: [32, 32] });
    }
    return icons;
}

// ===== Interaktions-Funktionen =====
async function logInteraction({ event_type, target_type = null, target_id = null, zoom_level = null, duration_ms = null, map_center = null, bbox = null, metadata = null }) {
    try {
        if (!currentSessionId || !currentUserId) {
            console.warn("⚠️ Keine aktive Session oder User vorhanden → Interaction wird nicht gespeichert.");
            return;
        }

        const row = {
        user_id: currentUserId,
        session_id: currentSessionId,
        event_type,
        target_type,
        target_id,
        zoom_level,
        duration_ms,
        map_center,
        bbox,
        metadata
        };
        const { error } = await client.from("interactions").insert(row);
        if (error) throw error;
        console.log("✅ Interaction gespeichert:", event_type, target_type, target_id);
    } catch(err) {
        await logPrototypeError("logInteraction", err, {currentUserId});
    }
}
async function savePoiFeedback({ userId, poiId, liked = false, rating }) {
    if (!userId || !poiId) return;
    try {
        // DB-Update
        const { error } = await client.from('user_poi_feedback').upsert(
            { user_id: userId, poi_id: poiId, liked, rating, visited_at: new Date() },
            { onConflict: ['user_id','poi_id'] }
        );

        console.log("✅ Feedback gespeichert:", { userId, poiId, liked, rating });

        // Lokale Marker-Gewichtung sofort aktualisieren
        const marker = markersByPoiId.get(poiId);
        if (marker) {
            marker.poiData.feedback = { liked, rating };
            debounceRecomputeWeights(500); // lokal
        }
    } catch(err) {
        await logPrototypeError("savePoiFeedback", err, { userId, poiId, liked, rating });
    }
}

async function updatePoiWeightFromFeedback(poiId) {
    const { data: feedback } = await client
        .from('user_poi_feedback')
        .select('liked, rating')
        .eq('user_id', currentUserId)
        .eq('poi_id', poiId)
        .single();

    if (!feedback) return;

    // Berechne Gewicht z.B.: liked = 1, rating 1-5 → normalize 0..1
    const w = (feedback.liked ? 0.6 : 0) + (feedback.rating ? feedback.rating / 5 * 0.4 : 0);

    // Upsert in poi_weights
    await client.from('poi_weights').upsert({
        user_id: currentUserId,
        poi_id: poiId,
        weight: w,
        updated_at: new Date()
    }, { onConflict: ['user_id','poi_id'] });

    // Marker neu skalieren
    const marker = markersByPoiId.get(poiId);
    if (marker) {
        marker.poiData.weight = w;
        const iconUrl = marker.options.icon.options.html.match(/src="([^"]+)"/)?.[1];
        const scaleFactor = 0.75 + w * 0.5;
        marker.setIcon(iconUrl 
            ? createMarkerWithIcon(marker.options._category, iconUrl, map.getZoom(), scaleFactor)
            : createDefaultMarkerIcon(scaleFactor, map.getZoom(), marker.options._category));
    }
}

// ===== Auth-Funktionen =====
async function handleRegistration(email, password, username) {
    const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
    if (signUpError) return alert('Registrierung fehlgeschlagen: ' + signUpError.message);
    const userId = signUpData.user.id;
    const { error: profileError } = await client.from('profiles').upsert({
        user_id: userId, username, created_at: new Date()
    });
    if (profileError) return alert('Profil speichern fehlgeschlagen: ' + profileError.message);
    document.getElementById('prefs-popup').style.display = 'block';
}

async function handleLogin(email, password) {
    const { data: loginData, error: loginError } = await client.auth.signInWithPassword({ email, password });
    if (loginError) return alert('Login fehlgeschlagen: ' + loginError.message);
    await main();
}

async function handleLogout() {
    await endUserSession();
    const { error } = await client.auth.signOut();
    if (error) { alert('Logout fehlgeschlagen: ' + error.message); return; }
    if (map) {
        map.remove()
        map = null;
    };
    document.getElementById('map-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'block';
}

async function loadUserPrefs() {
    try {
        const { data: userData } = await client.auth.getUser();
        const user = userData?.user;
        if (!user) return [];
        const { data: prefs, error } = await client.from('user_category_prefs').select('category').eq('user_id', user.id);
        if (error) throw error;
        return prefs.map(p => p.category);
    } catch(err) {
        await logPrototypeError("loadUserPrefs", err, { currentUserId });
        return [];
    }
}

async function createUserSession(userId) {
    try {
        const { data, error } = await client
            .from("sessions")
            .insert({
                user_id: userId,
                started_at: new Date().toISOString()
            })
            .select("id")
            .single();
        if (error) throw error;
        currentSessionId = data.id;
        currentUserId = userId;
        console.log("✅ Session gestartet:", currentSessionId);
        return currentSessionId;
    } catch(err) {
        await logPrototypeError("createUserSession", err, { userId });
        return null;
    }
}

async function initUserSession() {
    try {
        const { data: { session }, error } = await client.auth.getSession();

        if (error) throw error;

        if (session?.user) {
            currentUserId = session.user.id;
            // Session in public.sessions anlegen
            currentSessionId = await createUserSession(session.user.id);
        } else {
            console.log("⚠️ Kein User eingeloggt.");
        }
    } catch(err) {
        await logPrototypeError("initUserSession", err, {});
    }
}

async function endUserSession() {
    try {
        if (!currentSessionId) return;

        const { error } = await client
            .from("sessions")
            .update({
                ended_at: new Date().toISOString()
            })
            .eq("id", currentSessionId);

        if (error) throw error;
        console.log("✅ Session beendet:", currentSessionId);

        currentSessionId = null;
        currentUserId = null;
    } catch(err) {
        await logPrototypeError("endUserSession", err, { currentUserId, currentSessionId });
    }
}

// ===== Initialisierung & Eventlistener =====
window.addEventListener('load', async () => {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        await main();
    }
});

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
    const selected = Array.from(document.querySelectorAll('#prefs-popup input[type=checkbox]:checked')).map(cb => cb.value);
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return alert("Nicht eingeloggt!");
    const rows = selected.map(cat => ({ user_id: user.id, category: cat }));
    const { error } = await client.from('user_category_prefs').insert(rows);
    if (error) alert("Fehler beim Speichern der Präferenzen.");
    else { alert("Präferenzen gespeichert!"); document.getElementById('prefs-popup').style.display = 'none'; }
    main();
});

// ===== Main =====
async function main() {
    await initUserSession();
    await showMap();
}