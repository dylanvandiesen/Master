(() => {
  const metrics = [
    { label: "Uplink Sync", value: 98, unit: "%" },
    { label: "Thermal Margin", value: 41, unit: "C" },
    { label: "Route Confidence", value: 87, unit: "%" },
    { label: "Packet Drift", value: 12, unit: "ms" }
  ];

  const grid = document.getElementById("stats-grid");
  const stamp = document.getElementById("build-stamp");
  if (!grid || !stamp) return;

  const fragment = document.createDocumentFragment();
  for (const metric of metrics) {
    const item = document.createElement("article");
    item.className = "tile";
    item.innerHTML = `
      <span class="tile-label">${metric.label}</span>
      <strong class="tile-value">${metric.value}${metric.unit}</strong>
    `;
    fragment.appendChild(item);
  }

  grid.appendChild(fragment);
  stamp.textContent = `Rendered ${new Date().toLocaleString()}`;
  console.log("[agency] NeonTerrain dashboard initialized");
})();
