/* =========================
   MAP INITIALIZATION
========================= */
const map = L.map("map", {
  zoomControl: false
}).setView([20.5937, 78.9629], 5);

/* =========================
   STATE VARIABLES
========================= */
let userCoords = null;
let userMarker = null;
let destMarker = null;
let routeLine = null;

/* =========================
   AUTO LOCATION
========================= */
navigator.geolocation.getCurrentPosition(
  (pos) => {
    userCoords = [pos.coords.latitude, pos.coords.longitude];

    userMarker = L.marker(userCoords)
      .addTo(map)
      .bindPopup("📍 You are here")
      .openPopup();

    map.setView(userCoords, 14);
  }
);

/* =========================
   TILE LAYER
========================= */
const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
).addTo(map);

/* =========================
   LOCATE BUTTON
========================= */
document.getElementById("locateBtn").onclick = () => {
  if (userCoords) {
    map.setView(userCoords, 14);
  }
};

/* =========================
   SEARCH DROPDOWN (MAIN FIX)
========================= */
const input = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");

input.addEventListener("input", async () => {
  const query = input.value.trim();

  console.log("Typing:", query);

  if (query.length < 2) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );
    const data = await res.json();

    console.log("Results:", data);

    suggestionsBox.innerHTML = "";

    if (!data.length) {
      suggestionsBox.innerHTML = `<div>No results found</div>`;
      suggestionsBox.classList.remove("hidden");
      return;
    }

    data.slice(0, 5).forEach(place => {
      const div = document.createElement("div");
      div.textContent = place.display_name;

      div.onclick = () => selectPlace(place);

      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.remove("hidden");

  } catch (err) {
    console.error(err);
  }
});

/* =========================
   SELECT PLACE
========================= */
function selectPlace(place) {
  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);

  suggestionsBox.classList.add("hidden");
  input.value = place.display_name;

  if (destMarker) map.removeLayer(destMarker);
  if (routeLine) map.removeLayer(routeLine);

  destMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(place.display_name)
    .openPopup();

  map.setView([lat, lon], 14);

  if (userCoords) fetchRoute(lat, lon);
}

/* =========================
   ROUTING
========================= */
async function fetchRoute(lat, lon) {
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${userCoords[1]},${userCoords[0]};${lon},${lat}?overview=full&geometries=geojson`
  );

  const data = await res.json();

  if (!data.routes || data.routes.length === 0) return;

  const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

  routeLine = L.polyline(coords, {
    color: "blue",
    weight: 5
  }).addTo(map);

  map.fitBounds(routeLine.getBounds());
}

/* =========================
   CLICK OUTSIDE CLOSE
========================= */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    suggestionsBox.classList.add("hidden");
  }
});

/* =========================
   ENTER KEY SUPPORT
========================= */
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const first = suggestionsBox.querySelector("div");
    if (first) first.click();
  }
});

/* =========================
   RESIZE FIX
========================= */
window.addEventListener("resize", () => {
  setTimeout(() => map.invalidateSize(), 300);
});
