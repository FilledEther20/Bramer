mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [77.2315, 28.6129],
  zoom: 10,
});

let waypoints = [];
let idCounter = 0;

// Initialize the route source and layer when the map loads
map.on("load", () => {
  map.addSource("route", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    },
  });

  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ff3333",
      "line-width": 4,
    },
  });
});

function updatePath() {
  const coordinates = waypoints
    .sort((a, b) => a.sequence - b.sequence)
    .map((wp) => [wp.lng, wp.lat]);

  if (map.getSource("route")) {
    map.getSource("route").setData({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coordinates.length >= 2 ? coordinates : [],
      },
    });
  }
}

map.on("click", function (e) {
  const lat = e.lngLat.lat;
  const lng = e.lngLat.lng;
  const alt = 0;
  addWaypoint(lat, lng, alt);
});

function addWaypoint(lat, lng, alt) {
  const id = idCounter++;
  const marker = new mapboxgl.Marker({ draggable: true })
    .setLngLat([lng, lat])
    .addTo(map);

  marker.on("dragend", function () {
    const lngLat = marker.getLngLat();
    const wp = waypoints.find((w) => w.id === id);
    wp.lat = lngLat.lat;
    wp.lng = lngLat.lng;
    updateDisplay();
    updatePath();
  });

  waypoints.push({ id, lat, lng, alt, marker, sequence: waypoints.length + 1 });
  updateDisplay();
  updatePath();
}

function updateDisplay() {
  const list = document.getElementById("waypoint-list");
  list.innerHTML = waypoints
    .sort((a, b) => a.sequence - b.sequence)
    .map(
      (wp) => `
        <div class="waypoint-item" data-id="${wp.id}">
          <div><strong>#${wp.sequence}</strong></div>
          <div>Lat: ${wp.lat.toFixed(6)}</div>
          <div>Lng: ${wp.lng.toFixed(6)}</div>
          <div>Alt: ${wp.alt} m</div>
          <button onclick="copyWaypoint(${wp.id})">Copy</button>
          <button onclick="editWaypoint(${wp.id})">Edit</button>
          <button onclick="deleteWaypoint(${wp.id})">Delete</button>
        </div>
      `
    )
    .join("");
}

function editWaypoint(id) {
  const wp = waypoints.find((w) => w.id === id);
  const newAlt = prompt("Enter new altitude:", wp.alt);
  if (newAlt !== null) {
    wp.alt = parseFloat(newAlt);
    updateDisplay();
  }
}

// Deleting Waypoints
function deleteWaypoint(id) {
  const index = waypoints.findIndex((w) => w.id === id);
  if (index !== -1) {
    waypoints[index].marker.remove();
    waypoints.splice(index, 1);
    waypoints.forEach((wp, i) => (wp.sequence = i + 1));
    updateDisplay();
    updatePath();
  }
}

function addManualMarker() {
  const lat = parseFloat(document.getElementById("manual-lat").value);
  const lng = parseFloat(document.getElementById("manual-lng").value);
  const alt = parseFloat(document.getElementById("manual-alt").value);
  if (!isNaN(lat) && !isNaN(lng)) {
    addWaypoint(lat, lng, isNaN(alt) ? 0 : alt);
  } else {
    alert("Invalid coordinates");
  }
}

function copyWaypoint(id) {
  const wp = waypoints.find((w) => w.id === id);
  const text = `Latitude: ${wp.lat}, Longitude: ${wp.lng}, Altitude: ${wp.alt}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Waypoint copied to clipboard!");
  });
}

function copyAllWaypoints() {
  const lines = waypoints
    .sort((a, b) => a.sequence - b.sequence)
    .map(
      (wp) => `#${wp.sequence}: Lat=${wp.lat}, Lng=${wp.lng}, Alt=${wp.alt}m`
    )
    .join("\n");

  navigator.clipboard.writeText(lines).then(() => {
    alert("All waypoints copied to clipboard!");
  });
}

function exportWaypoints() {
  const output = waypoints
    .sort((a, b) => a.sequence - b.sequence)
    .map((wp) => ({ lat: wp.lat, lng: wp.lng, alt: wp.alt }));

  const blob = new Blob([JSON.stringify(output, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "waypoints.json";
  a.click();
}
