let mapViewMap;
let routeViewMap;
let mapViewMarkers = []; 
let routeViewMarkers = []; 

// Data bahaya awal (dummy)
const initialDummyDangers = [
    { id: 'dummy1', lat: -6.200000, lng: 106.816666, level: 'Tinggi', description: 'Area rawan Dukuh Atas.' },
    { id: 'dummy2', lat: -6.214620, lng: 106.845130, level: 'Sedang', description: 'Jalan rusak Manggarai.' },
    { id: 'dummy3', lat: -6.175392, lng: 106.827153, level: 'Rendah', description: 'Genangan air Monas.' }
];

// Fungsi untuk menampilkan view tertentu dan menyembunyikan yang lain
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    
    // Update tombol navigasi aktif
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400'); // Hapus style aktif
        // Periksa apakah atribut onclick mengandung ID view yang diminta
        // Cara ini agak rapuh, alternatifnya bisa menggunakan data-attribute pada tombol
        if (button.getAttribute('onclick') && button.getAttribute('onclick').includes(viewId)) {
            button.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400'); // Tambah style aktif
        }
    });
}

// Fungsi untuk mendapatkan data bahaya dari localStorage
function getDangerData() {
    const storedData = localStorage.getItem('dangerReportsLeaflet'); // Gunakan key localStorage yang konsisten
    let data = storedData ? JSON.parse(storedData) : [];
    const allDataIds = new Set(data.map(d => d.id));
    // Hanya tambahkan dummy data jika ID-nya belum ada (untuk menghindari duplikasi)
    const uniqueInitialDangers = initialDummyDangers.filter(d => !allDataIds.has(d.id));
    return [...data, ...uniqueInitialDangers];
}

// Fungsi untuk menyimpan data bahaya ke localStorage
function saveDangerData(data) {
    // Saring dummy data sebelum menyimpan, agar hanya data pengguna yang tersimpan permanen
    const userAddedData = data.filter(d => !initialDummyDangers.some(dummy => dummy.id === d.id && d.id.startsWith('dummy')));
    localStorage.setItem('dangerReportsLeaflet', JSON.stringify(userAddedData));
}

// Fungsi untuk membuat ikon kustom sederhana (lingkaran berwarna) untuk Leaflet
function createColoredIcon(color) {
    return L.divIcon({
        className: 'custom-div-icon', // Anda bisa menambahkan style untuk kelas ini di CSS jika mau
        html: `<span style="background-color:${color};width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></span>`,
        iconSize: [12, 12], // Ukuran ikon
        iconAnchor: [6, 6]   // Titik anchor ikon (tengah)
    });
}

// Fungsi untuk inisialisasi peta di view "Lihat Peta Bahaya"
// Diubah menjadi initMapViewIfNeeded agar tidak menginisialisasi ulang jika sudah ada
function initMapViewIfNeeded() {
    if (!mapViewMap) { 
        mapViewMap = L.map('map-view-container').setView([-6.2088, 106.8456], 11); // Default Jakarta
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapViewMap);
    }
    // Selalu update marker saat fungsi ini dipanggil
    updateMapViewMarkers();
}

function updateMapViewMarkers() {
    if (!mapViewMap) return; // Pastikan peta sudah ada

    // Hapus marker lama
    mapViewMarkers.forEach(marker => marker.removeFrom(mapViewMap));
    mapViewMarkers = [];

    const dangerData = getDangerData();
    if (dangerData.length === 0) {
        // Mungkin tampilkan pesan bahwa tidak ada data, atau biarkan peta kosong
        return;
    }

    const bounds = L.latLngBounds(); // Untuk auto-zoom dan center
    dangerData.forEach(danger => {
        if (typeof danger.lat !== 'number' || typeof danger.lng !== 'number') {
            console.warn("Data bahaya tidak valid, koordinat hilang:", danger);
            return; // Lewati data yang tidak valid
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
        mapViewMap.fitBounds(bounds, {padding: [20, 20]}); // Beri sedikit padding
        // Hindari zoom terlalu dekat jika hanya ada satu marker
        if (mapViewMarkers.length === 1) {
             mapViewMap.setZoom(15);
        }
    } else {
        // Jika tidak ada marker valid, kembali ke view default
        mapViewMap.setView([-6.2088, 106.8456], 11);
    }
}


// Fungsi untuk inisialisasi peta di view "Cari Rute Aman"
function initRouteMapViewIfNeeded() {
    if (!routeViewMap) {
        routeViewMap = L.map('map-route-container').setView([-6.2088, 106.8456], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(routeViewMap);
    }
    // Hapus marker lama jika ada saat inisialisasi ulang tampilan
    routeViewMarkers.forEach(marker => marker.removeFrom(routeViewMap));
    routeViewMarkers = [];
}

// Fungsi untuk menampilkan titik awal dan akhir di peta rute
function displayRoutePoints(startLat, startLng, endLat, endLng) {
    if (!routeViewMap) initRouteMapViewIfNeeded(); // Pastikan peta sudah diinisialisasi

    // Hapus marker lama
    routeViewMarkers.forEach(marker => marker.removeFrom(routeViewMap));
    routeViewMarkers = [];

    const startPos = [startLat, startLng];
    const endPos = [endLat, endLng];

    const startIcon = createColoredIcon('blue'); // Biru untuk titik awal
    const endIcon = createColoredIcon('purple');   // Ungu untuk titik tujuan

    const startMarker = L.marker(startPos, {icon: startIcon}).addTo(routeViewMap)
        .bindPopup("<b>Titik Awal</b>").openPopup(); // Langsung buka popup titik awal
    routeViewMarkers.push(startMarker);

    const endMarker = L.marker(endPos, {icon: endIcon}).addTo(routeViewMap)
        .bindPopup("<b>Titik Tujuan</b>");
    routeViewMarkers.push(endMarker);

    // Buat batas (bounds) untuk mencakup kedua marker
    const bounds = L.latLngBounds([startPos, endPos]);
    routeViewMap.fitBounds(bounds, {padding: [50, 50]}); // Beri padding agar marker tidak terlalu di tepi

    document.getElementById('find-route-message').textContent = 'Titik awal dan akhir ditampilkan di peta.';
    document.getElementById('find-route-message').className = 'mt-4 text-center text-blue-600';
}

// Event listener yang dijalankan setelah seluruh HTML selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Tampilkan view beranda secara default
    showView('home-view');

    // Setup event listener untuk form tambah bahaya
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
            id: 'user_' + Date.now(), // ID unik sederhana
            lat: lat,
            lng: lng,
            level: level,
            description: description
        };

        // Ambil data yang sudah ada (hanya data pengguna), tambahkan yang baru
        let currentData = getDangerData().filter(d => !initialDummyDangers.some(dummy => dummy.id === d.id && d.id.startsWith('dummy')));
        currentData.push(newDanger);
        saveDangerData(currentData); // Simpan data pengguna

        messageDiv.textContent = 'Laporan bahaya berhasil ditambahkan!';
        messageDiv.className = 'mt-4 text-center text-green-600';
        addDangerForm.reset();

        // Setelah beberapa saat, pindah ke tampilan peta dan refresh marker
        setTimeout(() => {
            messageDiv.textContent = '';
            showView('view-map-view');
            initMapViewIfNeeded(); // Panggil untuk update marker
        }, 1500);
    });

    // Setup event listener untuk form cari rute
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
        messageDiv.textContent = ''; // Kosongkan pesan jika valid
        displayRoutePoints(startLat, startLng, endLat, endLng);
    });
});
