let map = null;
let marker = null;
let imageBase = "";

let statusEl;
let errorEl;
let inputEl;
let locationNameEl;
let metaLocationEl;
let metaUpdatedEl;

// helpers ------------------------------------------------
function setStatus(message) {
  if (statusEl) statusEl.textContent = message || "";
}

function setError(message) {
  if (errorEl) errorEl.textContent = message || "";
}

function getWeerEmoji(conditie) {
  const lowerConditie = conditie.toLowerCase();

  if (lowerConditie.includes("zon") || lowerConditie.includes("helder"))
    return "☀️";
  if (lowerConditie.includes("bewolkt") || lowerConditie.includes("wolken"))
    return "☁️";
  if (lowerConditie.includes("regen") || lowerConditie.includes("bui"))
    return "🌧️";
  if (lowerConditie.includes("onweer") || lowerConditie.includes("storm"))
    return "⛈️";
  if (lowerConditie.includes("sneeuw")) return "❄️";
  if (lowerConditie.includes("mist")) return "🌫️";

  return "🌤️";
}

function formatUpdatedTime(lastUpdated) {
  if (!lastUpdated) return "Onbekend tijdstip";
  const date = new Date(lastUpdated.replace(" ", "T"));
  return `Geüpdatet: ${date.toLocaleString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function themeForWeather(temp, conditionText) {
  const cond = conditionText.toLowerCase();

  if (cond.includes("sneeuw")) return { theme: "theme-cold", state: "snow" };
  if (cond.includes("regen") || cond.includes("bui"))
    return { theme: "theme-cold", state: "rain" };
  if (cond.includes("storm") || cond.includes("onweer"))
    return { theme: "theme-cold", state: "rain" };
  if (temp <= 5) return { theme: "theme-cold", state: "cold" };
  if (temp <= 15) return { theme: "theme-mild", state: "mild" };
  if (temp <= 25) return { theme: "theme-warm", state: "warm" };
  return { theme: "theme-hot", state: "hot" };
}

function getCharacterUrl(state) {
  const cleanBase = imageBase.endsWith("/")
    ? imageBase.slice(0, -1)
    : imageBase;
  return `${cleanBase}/character-${state}.png`;
}

// init ---------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  statusEl = document.getElementById("statusMessage");
  errorEl = document.getElementById("errorMessage");
  inputEl = document.getElementById("locationInput");
  locationNameEl = document.getElementById("currentLocationName");
  metaLocationEl = document.getElementById("metaLocation");
  metaUpdatedEl = document.getElementById("metaUpdated");

  imageBase = document.body.dataset.imageBase || "static/images";

  const btn = document.getElementById("searchButton");
  if (btn) btn.addEventListener("click", zoekWeer);
  if (inputEl) {
    inputEl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") zoekWeer();
    });
  }

  bootstrapLocation();
});

function openLocationEdit() {
  const target = inputEl || document.getElementById("locationInput");
  if (target) {
    target.focus();
    target.select();
  }
}

// locatie bepalen ---------------------------------------
function bootstrapLocation() {
  setStatus("We bepalen je locatie...");

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        handleLookup(`${latitude},${longitude}`, "Huidige locatie");
      },
      (err) => {
        console.warn("Geolocatie mislukt:", err);
        detectLocationByIp();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  } else {
    detectLocationByIp();
  }
}

async function detectLocationByIp() {
  setStatus("Geen GPS. We zoeken je IP-locatie...");
  try {
    const resp = await fetch("https://ipapi.co/json/");
    if (!resp.ok) throw new Error("IP lookup mislukte");
    const info = await resp.json();

    let query = "Amsterdam";
    let label = "Amsterdam (fallback)";

    if (info?.country_code === "NL") {
      query = "Amsterdam";
      label = "Amsterdam (NL)";
    } else if (info?.city && info?.country_name) {
      query = `${info.city}, ${info.country_name}`;
      label = `${info.city}, ${info.country_name}`;
    } else if (info?.latitude && info?.longitude) {
      query = `${info.latitude},${info.longitude}`;
      label = "IP-coördinaten";
    }

    await handleLookup(query, label);
  } catch (error) {
    console.error(error);
    setStatus("Automatische locatie mislukt. We tonen Amsterdam.");
    await handleLookup("Amsterdam", "Amsterdam (fallback)");
  }
}

// handmatige zoek ---------------------------------------
async function zoekWeer() {
  if (!inputEl) return;
  const locatie = inputEl.value.trim();

  setError("");

  if (!locatie) {
    setError("Voer eerst een locatie in voordat je zoekt.");
    return;
  }

  await handleLookup(locatie, `Zoek: ${locatie}`);
}

async function handleLookup(query, sourceLabel = "") {
  try {
    setStatus(`Weer ophalen voor ${sourceLabel || query}...`);
    const data = await fetchWeather(query);
    updateUIWithWeather(data, sourceLabel);
    if (inputEl && data?.location?.name) {
      inputEl.value = data.location.name;
    }
    setStatus(`Weer geladen voor ${data.location.name}`);
  } catch (err) {
    console.error(err);
    const message =
      err?.message ||
      "Kon het weer niet ophalen. Controleer de locatie en probeer opnieuw.";
    setError(message);
    setStatus("Probeer een andere plaatsnaam.");
  }
}

async function fetchWeather(query) {
  const response = await fetch(`/api/weather?q=${encodeURIComponent(query)}`);

  const bodyText = await response.text();
  let data = null;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    // geen geldige JSON, laten we data leeg houden
  }

  const apiError =
    (typeof data?.error === "string" && data.error) ||
    data?.error?.message ||
    data?.message;

  if (!response.ok) {
    throw new Error(
      apiError || `Kon weerdata niet ophalen (status ${response.status})`
    );
  }

  if (!data || apiError) {
    throw new Error(apiError || "Kon weerdata niet ophalen");
  }

  return data;
}

// UI bijwerken ------------------------------------------
function updateUIWithWeather(data, sourceLabel = "") {
  const current = data.current;
  const location = data.location;
  const forecast = data.forecast?.forecastday || [];

  const temp = Math.round(current.temp_c);
  const conditionText = current.condition.text;

  const tempEl = document.getElementById("currentTemp");
  const condEl = document.getElementById("currentCondition");
  const iconEl = document.getElementById("currentWeatherIcon");

  if (tempEl) tempEl.textContent = `${temp}°C`;
  if (condEl) condEl.textContent = conditionText;
  if (iconEl) iconEl.textContent = getWeerEmoji(conditionText);
  if (locationNameEl) locationNameEl.textContent = location.name;
  if (metaLocationEl)
    metaLocationEl.textContent = `${location.name}, ${location.country}`;
  if (metaUpdatedEl) metaUpdatedEl.textContent = formatUpdatedTime(current.last_updated);

  applyThemeAndCharacter(temp, conditionText);

  updateMap(
    location.lat,
    location.lon,
    location.name,
    current.wind_kph,
    current.humidity
  );

  renderForecast(forecast);
  genereerAIAdvies(data);
}

function applyThemeAndCharacter(temp, conditionText) {
  const { theme, state } = themeForWeather(temp, conditionText);
  const body = document.body;

  body.classList.remove("theme-cold", "theme-mild", "theme-warm", "theme-hot");
  body.classList.add(theme);

  const img = document.getElementById("characterImage");
  if (img) {
    img.src = getCharacterUrl(state);
    img.alt = `Weerkarakter voor ${conditionText}`;
  }
}

// map ----------------------------------------------------
function updateMap(lat, lon, name, windKph, humidity) {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  if (!map) {
    map = L.map("map").setView([lat, lon], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
  } else {
    map.setView([lat, lon], 12);
  }

  if (marker) {
    marker.remove();
  }

  marker = L.marker([lat, lon]).addTo(map).bindPopup(name).openPopup();

  const windEl = document.getElementById("windValue");
  const humEl = document.getElementById("humidityValue");

  if (windEl) windEl.textContent = `${windKph} km/u`;
  if (humEl) humEl.textContent = `${humidity}%`;

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

// forecast ------------------------------------------------
function renderForecast(forecast) {
  const row = document.getElementById("forecastRow");
  if (!row) return;

  if (!forecast.length) {
    row.innerHTML =
      '<div class="forecast-card">Geen verwachting beschikbaar.</div>';
    return;
  }

  const subset = forecast.slice(0, 3);

  row.innerHTML = subset
    .map((day, index) => {
      const date = new Date(day.date);
      let dagNaam;

      if (index === 0) {
        dagNaam = "Vandaag";
      } else if (index === 1) {
        dagNaam = "Morgen";
      } else {
        dagNaam = date.toLocaleDateString("nl-NL", { weekday: "long" });
      }

      const condText = day.day.condition.text;
      const avgTemp = Math.round(day.day.avgtemp_c);
      const emoji = getWeerEmoji(condText);

      return `
        <div class="forecast-card">
          <div class="forecast-day-name">${dagNaam}</div>
          <div class="forecast-icon">${emoji}</div>
          <div class="forecast-temp">${avgTemp}°</div>
          <div class="forecast-condition">${condText}</div>
        </div>
      `;
    })
    .join("");
}

// advies --------------------------------------------------
function genereerAIAdvies(weerData) {
  const adviesContainer = document.getElementById("aiAdvice");
  if (!adviesContainer) return;

  const temp = weerData.current.temp_c;
  const conditie = weerData.current.condition.text.toLowerCase();
  const wind = weerData.current.wind_kph;
  const humidity = weerData.current.humidity;
  const location = weerData.location.name;

  let advies = "";

  if (temp >= 30) {
    advies =
      "Het is bloedheet in " +
      location +
      ". Zoek de schaduw op, drink veel water en vermijd de middagzon.";
  } else if (temp >= 25) {
    advies =
      "Zomers warm in " +
      location +
      "! Perfect weer voor een terrasje, strand of een ijsje.";
  } else if (temp >= 20) {
    advies =
      "Heerlijk zacht weer in " +
      location +
      ". Ideaal voor een wandeling of fietstocht.";
  } else if (temp >= 15) {
    advies =
      "Aangenaam fris in " +
      location +
      ". Een lichte jas of trui is genoeg om buiten te genieten.";
  } else if (temp >= 10) {
    advies =
      "Het is wat fris in " +
      location +
      ". Trek een warme trui aan en misschien een jas als je lang buiten bent.";
  } else if (temp >= 5) {
    advies =
      "Best koud in " +
      location +
      ". Denk aan een goede jas, sjaal en eventueel handschoenen.";
  } else {
    advies =
      "Het is echt koud in " +
      location +
      ". Kleed je in lagen en blijf niet te lang buiten.";
  }

  if (conditie.includes("regen") || conditie.includes("bui")) {
    advies +=
      " Vergeet je regenjas of paraplu niet: het wordt nat vandaag.";
  } else if (conditie.includes("sneeuw")) {
    advies +=
      " Er kan sneeuw vallen. Rijd voorzichtig en geniet van het winterse uitzicht.";
  } else if (conditie.includes("onweer") || conditie.includes("storm")) {
    advies +=
      " Er is kans op onweer of harde wind. Blijf bij voorkeur binnen tijdens de heftigste buien.";
  }

  if (wind > 30) {
    advies += " De wind is stevig, houd hier rekening mee op de fiets of scooter.";
  }

  if (humidity > 80) {
    advies += " De lucht voelt vochtig aan, waardoor het drukkender kan zijn.";
  } else if (humidity < 30) {
    advies += " De lucht is vrij droog; sommige mensen kunnen dat in hun huid of keel merken.";
  }

  adviesContainer.innerHTML = `
    <div class="advice-label">Weeradvies</div>
    <p class="advice-text">${advies}</p>
  `;
}
