// CloudCtrl frontend logic
const $ = (sel, el=document)=> el.querySelector(sel);
const $$ = (sel, el=document)=> [...el.querySelectorAll(sel)];

const els = {
  searchInput: $("#searchInput"),
  searchBtn: $("#searchBtn"),
  geoBtn: $("#geoBtn"),
  metricBtn: $("#metricBtn"),
  imperialBtn: $("#imperialBtn"),
  cityName: $("#cityName"),
  favBtn: $("#favBtn"),
  temp: $("#temp"),
  desc: $("#desc"),
  feels: $("#feels"),
  humidity: $("#humidity"),
  wind: $("#wind"),
  sunrise: $("#sunrise"),
  sunset: $("#sunset"),
  updated: $("#updated"),
  mainIcon: $("#mainIcon"),
  currentCard: $("#currentCard"),
  hourly: $("#hourly"),
  daily: $("#daily"),
  favorites: $("#favorites"),
  hourTpl: $("#hourTile"),
  dayTpl: $("#dayTile"),
};

const state = {
  units: localStorage.getItem("units") || "metric",
  favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
  lastQuery: localStorage.getItem("lastQuery") || "Bengaluru",
};

function saveState(){
  localStorage.setItem("units", state.units);
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  localStorage.setItem("lastQuery", state.lastQuery);
}

function setUnits(u){
  state.units = u;
  els.metricBtn.classList.toggle("active", u==="metric");
  els.imperialBtn.classList.toggle("active", u==="imperial");
  saveState();
}

els.metricBtn.addEventListener("click", ()=> { setUnits("metric"); fetchAndRender(state.lastQuery); });
els.imperialBtn.addEventListener("click", ()=> { setUnits("imperial"); fetchAndRender(state.lastQuery); });

els.searchBtn.addEventListener("click", ()=> {
  const q = els.searchInput.value.trim();
  if(q) fetchAndRender(q);
});

els.searchInput.addEventListener("keydown", (e)=> {
  if(e.key==="Enter"){
    const q = els.searchInput.value.trim();
    if(q) fetchAndRender(q);
  }
});

els.geoBtn.addEventListener("click", ()=> {
  if(!navigator.geolocation){
    alert("Geolocation not supported in this browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude, longitude } = pos.coords;
      await fetchAndRender(null, latitude, longitude);
    },
    err => {
      console.warn(err);
      alert("Couldn't get your location. Please allow location access or search a city.");
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
  );
});

els.favBtn.addEventListener("click", ()=> {
  const name = els.cityName.textContent;
  if(!name || name==="—") return;
  const ix = state.favorites.findIndex(c => c.toLowerCase() === name.toLowerCase());
  if(ix === -1){
    state.favorites.push(name);
  } else {
    state.favorites.splice(ix,1);
  }
  renderFavorites();
  saveState();
});

function renderFavorites(){
  els.favorites.innerHTML = "";
  if(state.favorites.length === 0){
    const span = document.createElement("span");
    span.style.color = "var(--muted)";
    span.textContent = "No favorites yet. Search a city and press ★.";
    els.favorites.appendChild(span);
    return;
  }
  state.favorites.forEach(city => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = city;
    chip.addEventListener("click", ()=> fetchAndRender(city));
    els.favorites.appendChild(chip);
  });
}

function kphOrMph(speed){
  return state.units === "metric" ? `${Math.round(speed)} km/h` : `${Math.round(speed)} mph`;
}

function fmtTime(ts, tzOffset){
  const d = new Date((ts + tzOffset) * 1000);
  return d.toUTCString().match(/\d{2}:\d{2}/)[0];
}

function wxIconFrom(main, isNight=false){

  const map = {
    Clear: isNight ? "🌙" : "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Smoke: "🌫️",
    Haze: "🌫️",
    Dust: "🌫️",
    Fog: "🌫️",
    Sand: "🌫️",
    Ash: "🌫️",
    Squall: "🌫️",
    Tornado: "🌪️",
  };
  return map[main] || "☁️";
}

function setLoading(v){
  els.currentCard.classList.toggle("skeleton", !!v);
}

async function fetchAndRender(query=null, lat=null, lon=null){
  try{
    setLoading(true);
    const params = new URLSearchParams({ units: state.units });
    if(query) params.set("query", query);
    if(lat && lon){ params.set("lat", lat); params.set("lon", lon); }

    const res = await fetch(`/api/weather?${params.toString()}`);
    const data = await res.json();
    if(data.error) throw new Error(data.error);

    state.lastQuery = data.city || query || state.lastQuery;
    saveState();
    renderCurrent(data);
    renderHourly(data);
    renderDaily(data);
    renderFavorites();
  }catch(err){
    console.error(err);
    alert(err.message || "Failed Dont expect anything.");
  }finally{
    setLoading(false);
  }
}

function renderCurrent({ city, country, units, current }){
  const tzOffset = current.timezone; // seconds from UTC
  const isNight = (() => {
    const now = current.dt;
    return now < current.sys.sunrise || now > current.sys.sunset;
  })();

  els.cityName.textContent = city ? `${city}, ${country || ""}`.replace(/,\s*$/, "") : "—";
  const t = Math.round(current.main.temp);
  els.temp.textContent = t;
  els.desc.textContent = current.weather[0]?.description || "—";
  els.feels.textContent = Math.round(current.main.feels_like);
  els.humidity.textContent = Math.round(current.main.humidity);
  els.wind.textContent = kphOrMph(current.wind.speed * (units === "metric" ? 3.6 : 2.23694) / (units === "metric" ? 1 : 1)); // OWM m/s -> km/h or mph

  els.sunrise.textContent = fmtTime(current.sys.sunrise, tzOffset);
  els.sunset.textContent = fmtTime(current.sys.sunset, tzOffset);
  els.updated.textContent = new Date().toLocaleTimeString();

  els.mainIcon.textContent = wxIconFrom(current.weather[0]?.main, isNight);


  const ix = state.favorites.findIndex(c => c.toLowerCase() === (city||"").toLowerCase());
  els.favBtn.style.opacity = 1;
  els.favBtn.textContent = ix === -1 ? "★" : "☆"; // toggle visual
}

function renderHourly({ forecast }){
  els.hourly.innerHTML = "";
  const tzOffset = forecast.city?.timezone || 0;
  forecast.list.slice(0, 8).forEach(item => {
    const node = els.hourTpl.content.cloneNode(true);
    const time = new Date((item.dt + tzOffset) * 1000).toUTCString().match(/\d{2}:\d{2}/)[0];
    node.querySelector(".t-time").textContent = time;
    node.querySelector(".t-icon").textContent = wxIconFrom(item.weather[0]?.main);
    node.querySelector(".t-temp").textContent = `${Math.round(item.main.temp)}°`;
    els.hourly.appendChild(node);
  });
}

function groupByDay(list, tz){
  const fmt = (ts)=> new Date((ts + tz) * 1000).toUTCString().slice(0,16);
  const map = new Map();
  list.forEach(item => {
    const d = fmt(item.dt).slice(0,11); // 'Day, DD Mon'
    if(!map.has(d)) map.set(d, []);
    map.get(d).push(item);
  });
  return [...map.entries()].map(([day, arr]) => ({ day, arr }));
}

function renderDaily({ forecast }){
  els.daily.innerHTML = "";
  const tz = forecast.city?.timezone || 0;
  const grouped = groupByDay(forecast.list, tz).slice(0, 5);
  grouped.forEach(({ day, arr }) => {
    const node = els.dayTpl.content.cloneNode(true);
    node.querySelector(".d-name").textContent = day;
    // hi/lo
    const temps = arr.map(x => x.main.temp);
    const hi = Math.round(Math.max(...temps));
    const lo = Math.round(Math.min(...temps));
    node.querySelector(".hi").textContent = `${hi}°`;
    node.querySelector(".lo").textContent = `${lo}°`;
    // icon by majority
    const main = arr[0]?.weather[0]?.main || "Clouds";
    node.querySelector(".d-icon").textContent = wxIconFrom(main);
    els.daily.appendChild(node);
  });
}

// initial load
setUnits(state.units);
renderFavorites();
fetchAndRender(state.lastQuery);
