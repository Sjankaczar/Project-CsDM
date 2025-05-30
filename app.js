let mapViewMap;
let routeViewMap;
let mapViewMarkers = []; 
let routeViewMarkers = []; 

const initialDummyDangers = [
    { id: 'dummy1', lat: -7.279566, lng: 112.797808, level: 'Tinggi', description: 'Wilayah Cappucino Assassino beraksi' },
    { id: 'dummy2', lat: -7.289133, lng: 112.792490, level: 'Sedang', description: 'Bekas ledakan bombardillo crocodillo.' },
    { id: 'dummy3', lat: -7.280059, lng: 112.791907, level: 'Rendah', description: 'Terdapat penampakan Tung Tung Tung Sahur.' }
];

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400'); 
        
        if (button.getAttribute('onclick') && button.getAttribute('onclick').includes(viewId)) {
            button.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400'); // Tambah style aktif
        }
    });
}

function getDangerData() {
    const storedData = localStorage.getItem('dangerReportsLeaflet'); 
    let data = storedData ? JSON.parse(storedData) : [];
    const allDataIds = new Set(data.map(d => d.id));
    const uniqueInitialDangers = initialDummyDangers.filter(d => !allDataIds.has(d.id));
    return [...data, ...uniqueInitialDangers];
}

function saveDangerData(data) {
    const userAddedData = data.filter(d => !initialDummyDangers.some(dummy => dummy.id === d.id && d.id.startsWith('dummy')));
    localStorage.setItem('dangerReportsLeaflet', JSON.stringify(userAddedData));
}

function createColoredIcon(color) {
    return L.divIcon({
        className: 'custom-div-icon', 
        html: `<span style="background-color:${color};width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></span>`,
        iconSize: [12, 12], 
        iconAnchor: [6, 6]   
    });
}

function initMapViewIfNeeded() {
    if (!mapViewMap) { 
        mapViewMap = L.map('map-view-container').setView([-7.2792, 112.7972], 11); // Default Jakarta
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapViewMap);
    }
    updateMapViewMarkers();
}

function updateMapViewMarkers() {
    if (!mapViewMap) return; 

    mapViewMarkers.forEach(marker => marker.removeFrom(mapViewMap));
    mapViewMarkers = [];

    const dangerData = getDangerData();
    if (dangerData.length === 0) {
        return;
    }

    const bounds = L.latLngBounds(); 
    dangerData.forEach(danger => {
        if (typeof danger.lat !== 'number' || typeof danger.lng !== 'number') {
            console.warn("Data bahaya tidak valid, koordinat hilang:", danger);
            return; 
        }
        const position = [danger.lat, danger.lng];
        let icon;
        switch (danger.level.toLowerCase()) {
            case 'tinggi':
                icon = createColoredIcon('red');
                break;
            case 'sedang':
                icon = createColoredIcon('orange');
                break;
            case 'rendah':
            default:
                icon = createColoredIcon('green');
                break;
        }

        const marker = L.marker(position, { icon: icon }).addTo(mapViewMap);
        marker.bindPopup(`
            <div class="p-1" style="min-width: 150px;">
                <h4 class="font-bold text-sm" style="color: ${danger.level.toLowerCase() === 'tinggi' ? 'red' : danger.level.toLowerCase() === 'sedang' ? 'orange' : 'green'};">${danger.level}</h4>
                <p class="text-xs">${danger.description || 'Tidak ada deskripsi.'}</p>
                <p class="text-xs text-gray-500">Lat: ${danger.lat.toFixed(4)}, Lng: ${danger.lng.toFixed(4)}</p>
            </div>
        `);
        mapViewMarkers.push(marker);
        bounds.extend(position);
    });
    
    if (mapViewMarkers.length > 0) {
        mapViewMap.fitBounds(bounds, {padding: [20, 20]}); 
        if (mapViewMarkers.length === 1) {
             mapViewMap.setZoom(15);
        }
    } else {
        mapViewMap.setView([-7.2792, 112.7972], 11);
    }
}


function initRouteMapViewIfNeeded() {
    if (!routeViewMap) {
        routeViewMap = L.map('map-route-container').setView([-7.2792, 112.7972], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(routeViewMap);
    }
    routeViewMarkers.forEach(marker => marker.removeFrom(routeViewMap));
    routeViewMarkers = [];
}

function displayRoutePoints(startLat, startLng, endLat, endLng) {
    if (!routeViewMap) initRouteMapViewIfNeeded(); 

    routeViewMarkers.forEach(marker => marker.removeFrom(routeViewMap));
    routeViewMarkers = [];

    const startPos = [startLat, startLng];
    const endPos = [endLat, endLng];

    const startIcon = createColoredIcon('blue'); // Biru untuk titik awal
    const endIcon = createColoredIcon('purple');   // Ungu untuk titik tujuan

    const startMarker = L.marker(startPos, {icon: startIcon}).addTo(routeViewMap)
        .bindPopup("<b>Titik Awal</b>").openPopup(); 
    routeViewMarkers.push(startMarker);

    const endMarker = L.marker(endPos, {icon: endIcon}).addTo(routeViewMap)
        .bindPopup("<b>Titik Tujuan</b>");
    routeViewMarkers.push(endMarker);

    const bounds = L.latLngBounds([startPos, endPos]);
    routeViewMap.fitBounds(bounds, {padding: [50, 50]}); 

    document.getElementById('find-route-message').textContent = 'Titik awal dan akhir ditampilkan di peta.';
    document.getElementById('find-route-message').className = 'mt-4 text-center text-blue-600';
}

document.addEventListener('DOMContentLoaded', function() {
    showView('home-view');

    const addDangerForm = document.getElementById('add-danger-form');
    addDangerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        const level = document.getElementById('danger-level').value;
        const description = document.getElementById('description').value;
        const messageDiv = document.getElementById('add-danger-message');

        if (isNaN(lat) || isNaN(lng)) {
            messageDiv.textContent = 'Koordinat tidak valid!';
            messageDiv.className = 'mt-4 text-center text-red-600';
            return;
        }

        const newDanger = {
            id: 'user_' + Date.now(), 
            lat: lat,
            lng: lng,
            level: level,
            description: description
        };

        let currentData = getDangerData().filter(d => !initialDummyDangers.some(dummy => dummy.id === d.id && d.id.startsWith('dummy')));
        currentData.push(newDanger);
        saveDangerData(currentData); 

        messageDiv.textContent = 'Laporan bahaya berhasil ditambahkan!';
        messageDiv.className = 'mt-4 text-center text-green-600';
        addDangerForm.reset();

        setTimeout(() => {
            messageDiv.textContent = '';
            showView('view-map-view');
            initMapViewIfNeeded(); 
        }, 1500);
    });

    const findRouteForm = document.getElementById('find-route-form');
    findRouteForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const startLat = parseFloat(document.getElementById('start-latitude').value);
        const startLng = parseFloat(document.getElementById('start-longitude').value);
        const endLat = parseFloat(document.getElementById('end-latitude').value);
        const endLng = parseFloat(document.getElementById('end-longitude').value);
        const messageDiv = document.getElementById('find-route-message');

        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            messageDiv.textContent = 'Koordinat awal atau tujuan tidak valid!';
            messageDiv.className = 'mt-4 text-center text-red-600';
            return;
        }
        messageDiv.textContent = ''; 
        displayRoutePoints(startLat, startLng, endLat, endLng);
    });
});
