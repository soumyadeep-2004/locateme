/* MAP INIT */
const map = L.map("map").setView([20.5937, 78.9629], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

/* STATE */
let userCoords = null;
let userMarker = null;
let destMarker = null;
let routeLine = null;

/* UI */
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");

const infoPanel = document.getElementById("infoPanel");
const placeNameEl = document.getElementById("placeName");
const addressEl = document.getElementById("address");
const distanceEl = document.getElementById("distance");

/* ALWAYS SHOW USER LOCATION */
document.getElementById("locateBtn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    userCoords = [lat, lng];

    if (userMarker) map.removeLayer(userMarker);

    userMarker = L.marker(userCoords)
      .addTo(map)
      .bindPopup("You are here");

    map.setView(userCoords, 14);
  });
});

/* AUTOCOMPLETE */
searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (q.length < 3) {
    suggestions.classList.add("hidden");
    return;
  }

  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}`;

  if (userCoords) {
    url += `&lat=${userCoords[0]}&lon=${userCoords[1]}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  suggestions.innerHTML = "";
  data.slice(0, 5).forEach(place => {
    const div = document.createElement("div");
    div.textContent = place.display_name;
    div.onclick = () => selectPlace(place);
    suggestions.appendChild(div);
  });

  suggestions.classList.remove("hidden");
});

/* SEARCH BUTTON */
searchBtn.addEventListener("click", () => {
  if (suggestions.firstChild) suggestions.firstChild.click();
});

/* PLACE SELECT */
function selectPlace(place) {
  suggestions.classList.add("hidden");

  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);

  if (destMarker) map.removeLayer(destMarker);
  if (routeLine) map.removeLayer(routeLine);

  destMarker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 14);

  placeNameEl.innerText = place.display_name.split(",")[0];
  addressEl.innerText = place.display_name;

  if (userCoords) {
    routeLine = L.polyline(
      [userCoords, [lat, lon]],
      { color: "red", weight: 4 }
    ).addTo(map);

    distanceEl.innerText =
      `📏 ${getDistance(userCoords[0], userCoords[1], lat, lon)} km`;
  } else {
    distanceEl.innerText = "📏 Locate yourself first";
  }

  infoPanel.classList.remove("hidden");
}

/* DISTANCE */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}
// Fix map rendering on mobile resize
window.addEventListener("resize", () => {
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
});
