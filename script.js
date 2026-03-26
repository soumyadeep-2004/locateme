/* =========================
   MAP INITIALIZATION
========================= */


document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    document.getElementById("suggestions").classList.add("hidden");
  }
});

document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const first = document.querySelector("#suggestions div");
    if (first) first.click();
  }
});

const map = L.map("map", {
  zoomControl: false
}).setView([20.5937, 78.9629], 5);

// AUTO GET USER LOCATION ON LOAD
navigator.geolocation.getCurrentPosition(
  (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    userCoords = [lat, lng];

    userMarker = L.marker(userCoords)
      .addTo(map)
      .bindPopup("You are here");

    map.setView(userCoords, 14);
  },
  (err) => {
    console.warn("Location permission denied");
  }
);
/* =========================
   TILE LAYERS
========================= */

// Default OpenStreetMap
const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap" }
);

// Transport Map (better streets, requires API key)
const transport = L.tileLayer(
  "https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=apikey=1bd6f58614f44d95a63cdcc9c8e5844a",
  { attribution: "© Thunderforest, © OpenStreetMap" }
);

// Terrain Map
const terrain = L.tileLayer(
  "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenTopoMap", maxZoom: 17 }
);

// Default layer
osm.addTo(map);

// Layer object
const layers = {
  osm,
  transport,
  terrain
};


/* =========================
   LAYER SWITCHING
========================= */
document.querySelectorAll(".map-modes button").forEach(btn => {
  btn.onclick = () => {
    Object.values(layers).forEach(layer => map.removeLayer(layer));
    layers[btn.dataset.layer].addTo(map);
  };
});


/* =========================
   STATE VARIABLES
========================= */
let userCoords = null;
let userMarker = null;
let destMarker = null;
let routeLine = null;


/* =========================
   CURRENT LOCATION
========================= */
document.getElementById("locateBtn").onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    userCoords = [lat, lng];

    if (userMarker) map.removeLayer(userMarker);

    userMarker = L.marker(userCoords)
      .addTo(map)
      .bindPopup("You are here");

    map.setView(userCoords, 14);
  });
};


/* =========================
   SEARCH + ROUTING
========================= */
document.getElementById("searchBtn").onclick = async () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  try {
    // 1️⃣ SEARCH PLACE (Nominatim)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );
    const data = await res.json();

    if (!data.length) {
      alert("Place not found");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    // Remove old markers/routes
    if (destMarker) map.removeLayer(destMarker);
    if (routeLine) map.removeLayer(routeLine);

    // Add destination marker
    destMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(data[0].display_name);

    map.setView([lat, lon], 14);

    // 2️⃣ REAL ROUTING (OSRM)
    if (userCoords) {
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userCoords[1]},${userCoords[0]};${lon},${lat}?overview=full&geometries=geojson`
      );

      const routeData = await routeRes.json();

      if (!routeData.routes || !routeData.routes.length) {
        alert("Route not found");
        return;
      }

      // Convert coordinates
      const routeCoords = routeData.routes[0].geometry.coordinates.map(coord => [
        coord[1],
        coord[0]
      ]);

      // Draw route
      routeLine = L.polyline(routeCoords, {
        color: "blue",
        weight: 5
      }).addTo(map);

      // Fit map to route
      map.fitBounds(routeLine.getBounds());

      // Optional: distance & time
      const distance = routeData.routes[0].distance / 1000;
      const duration = routeData.routes[0].duration / 60;

      console.log(`Distance: ${distance.toFixed(2)} km`);
      console.log(`Time: ${duration.toFixed(0)} min`);
    } else {
      alert("Please click locate button first");
    }

  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
};


/* =========================
   HAMBURGER MENU
========================= */
const hamburgerBtn = document.getElementById("hamburgerBtn");
const sideMenu = document.getElementById("sideMenu");

hamburgerBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent auto close
  sideMenu.classList.toggle("hidden");
});

// close when clicking outside
document.addEventListener("click", () => {
  sideMenu.classList.add("hidden");
});

// prevent closing when clicking inside menu
sideMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});


/* =========================
   MOBILE FIX (VERY IMPORTANT)
========================= */
window.addEventListener("resize", () => {
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
});

const input = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");

input.addEventListener("input", async () => {
  const query = input.value.trim();

  console.log("Typing:", query); // 🔥 DEBUG

  if (query.length < 2) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    const data = await res.json();

    console.log("Results:", data); // 🔥 DEBUG

    suggestionsBox.innerHTML = "";

    if (!data.length) {
      suggestionsBox.innerHTML = `<div>No results found</div>`;
      suggestionsBox.classList.remove("hidden");
      return;
    }

    data.slice(0, 5).forEach(place => {
      const div = document.createElement("div");
      div.textContent = place.display_name;

      div.onclick = () => {
        console.log("Clicked:", place);

        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        suggestionsBox.classList.add("hidden");
        input.value = place.display_name;

        if (destMarker) map.removeLayer(destMarker);
        if (routeLine) map.removeLayer(routeLine);

        destMarker = L.marker([lat, lon]).addTo(map);
        map.setView([lat, lon], 14);

        if (userCoords) {
          fetchRoute(lat, lon);
        }
      };

      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.remove("hidden");

  } catch (err) {
    console.error("Fetch error:", err);
  }
});
