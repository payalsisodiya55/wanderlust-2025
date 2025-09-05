const center = window.listing.geometry.coordinates; // coordinates from show.ejs script [lng, lat]

const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/outdoor/style.json?key=${window.MAPTILER_KEY}`,
  center,
  zoom: 9,
});

// Add zoom controls
map.addControl(new maplibregl.NavigationControl());

// Add red marker 
const marker = new maplibregl.Marker({ color: "red" })
  .setLngLat(listing.geometry.coordinates)
  .setPopup(
    new maplibregl.Popup({ offset: 25 }).setHTML(
      `<h4>${window.listing.title}</h4><p>Exact Location will be provided after booking</p>`
    )
  )
  .addTo(map);
