
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEO_API = "https://nominatim.openstreetmap.org/reverse";
const locationElement = document.querySelector(".current-location");

// 1. Try to get existing data from localStorage
const storedData = localStorage.getItem("weatherNowCities");

// 2. ONLY set the default list if nothing exists yet (null)
if (storedData === null) {
  const initialCities = ["new york", "london", "tokyo", "sydney"];
  localStorage.setItem("weatherNowCities", JSON.stringify(initialCities));
}


  // Get current position
async function getCityNameByCoords(lat, lon) {
const url = `${REVERSE_GEO_API}?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data || !data.address) {
    throw new Error("City not found");
  }

  return data.address;

}

function getCurrentLocationWeather() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const cityData = await getCityNameByCoords(latitude, longitude);
      if (locationElement) {
        locationElement.textContent = `${cityData.county|| cityData.state}, ${cityData.country}`;
      }
      await fetchWeather(latitude, longitude);
    },
    () => alert("Location access denied")
  );
}

// Get city coordinates by name
async function getCityCoordinates(cityName) {
  const url = `${GEO_API}?name=${encodeURIComponent(cityName)}&count=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }

  return data.results[0];
}


function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function formatDay(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    weekday: "short",
  });
}

function mapWeatherCodeToType(code) {
  // Clear sky
  if (code === 0) return "sunny";

  // Mainly clear, partly cloudy
  if ([1, 2].includes(code)) return "partly-cloudy";

  // Overcast, fog, clouds
  if (
    [3, 45, 48].includes(code)
  ) {
    return "cloudy";
  }

  // Drizzle, rain, showers, thunderstorms, snow
  if (
    [51, 53, 55, 56, 57,
     61, 63, 65, 66, 67,
     71, 73, 75, 77,
     80, 81, 82,
     85, 86,
     95, 96, 99].includes(code)
  ) {
    return "rainy";
  }

  // Fallback
  return "cloudy";
}


function getWindDirection(deg) {
  const directions = ["N", "N-E", "E", "S-E", "S", "S-W", "W", "N-W"];
  return directions[Math.round(deg / 45) % 8];
}

const updateUI = (data) => {
  const {hourly, current, daily} = data;

  const currentData = {
    temp: `${Math.round(current.temperature_2m)}`,
    feels_like: `${Math.round(current.apparent_temperature)}°`,
    wind: {direction: getWindDirection(current.wind_direction_10m), speed: `${current.wind_speed_10m} km/h`},
    humidity: `${current.relative_humidity_2m}%`,
    dew_point: `${Math.round(hourly.dewpoint_2m[0])}°`,
    pressure: `${Math.round(current.surface_pressure)} mb`,
    sunrise: formatTime(daily.sunrise[0]),
    sunset: formatTime(daily.sunset[0]),
    weather: mapWeatherCodeToType(daily.weather_code[0]),
    uv_index: daily.uv_index_max[0],
    visibility: `${(current.visibility/1000).toFixed(2)}`, // in km
  }

  const dailyData = daily.time.map((date, index) => ({
    day: formatDay(date).slice(0,3),
    max_temp: `${Math.round(daily.temperature_2m_max[index])}`,  
    min_temp: `${Math.round(daily.temperature_2m_min[index])}`,
    weather: mapWeatherCodeToType(daily.weather_code[index]),
  }));

  const todayWindData = hourly.wind_speed_10m.slice(0,24).filter((_, i) => i % 2 === 0);
  
  // Update UI with current and daily data
  currentWeather(currentData);
  forecast(dailyData.slice(1)); // Exclude today from forecast
  renderHumidity(currentData.humidity, currentData.dew_point);
  renderWindStatus(currentData.wind, todayWindData);
  renderUVIndex(currentData.uv_index);
  renderVisibility(currentData.visibility);
}


// Fetch weather data
async function fetchWeather(lat, lon) {
  const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,visibility,uv_index,apparent_temperature,wind_direction_10m,surface_pressure&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&forecast_days=7&hourly=dewpoint_2m,wind_speed_10m&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();

  updateUI(data);
}



// Weather Icons
const WeatherIcon = (type) => {
  switch (type) {
    case "sunny":
      return `<svg class="w-8 h-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
</svg>`;
    case "cloudy":
      return `<svg class="w-8 h-8 text-weather-cloud" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
</svg>`;
    case "partly-cloudy":
      return `<div class="relative">
          <svg class="w-8 h-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
</svg>
          <svg class="w-5 h-5 text-weather-cloud absolute -bottom-1 -right-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
</svg>
        </div>`;
    // case "rainy":
    //   return <CloudRain class="w-8 h-8 text-weather-rain" />;
    // case "snowy":
    //   return <CloudSnow class="w-8 h-8 text-weather-snow" />;
    default:
      return `<svg class="w-8 h-8 text-weather-cloud" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
</svg>`;
  }
};


const currentWeather = (data) => {

  if (!data) return;

  const currentContainer = document.getElementById("current");

  const timeNow = new Date();
  data.day = timeNow.toLocaleDateString([], { weekday: "long" });
  data.time = timeNow.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

  const { temp, feels_like, humidity, wind, sunrise, sunset, pressure, weather } = data;

  currentContainer.querySelector("#day").textContent = data.day;
  currentContainer.querySelector("#time").textContent = data.time;
  currentContainer.querySelector(".temp").innerHTML = `${temp}`;
  currentContainer.querySelector(".feels-like").textContent = `${feels_like}`;
  currentContainer.querySelector(".humidity").textContent = `${humidity}`;
  currentContainer.querySelector(".pressure").textContent = `${pressure}`;
  currentContainer.querySelector(".sunrise").textContent = `${sunrise}`;
  currentContainer.querySelector(".sunset").textContent = `${sunset}`;
  currentContainer.querySelector(".wind-speed").textContent = `${wind.speed}`;
  currentContainer.querySelector(".wind-direction").textContent = `Wind ${wind.direction}`;
  // currentContainer.querySelector(".weather-icon").innerHTML = WeatherIcon(weather);


}

//Forecast Data
const forecast = (data) => {

  if (!data || data.length === 0) return;
  const weeklyForecast = data ?? mockData;

  const forecastSkeleton = document.querySelector(".forecast-skeleton");

  if (forecastSkeleton) {
    forecastSkeleton.style.display = "none"; // Hide skeleton
  }

const forecastContainer = document.querySelector(".forecast-container");

  forecastContainer.classList.remove("hidden");
  

         if (forecastContainer) {
          forecastContainer.innerHTML = "";
weeklyForecast.forEach(daily => {
  const forecastCard = `<div
           class="weather-card bg-card border border-border rounded-2xl p-5 transition-all duration-300 flex-1 flex flex-col items-center py-4 px-3 min-w-[70px]"
         >
           <span class="text-muted-foreground text-sm mb-3">${daily.day}</span>
           <div class="mb-3 h-10 flex items-center justify-center">
             ${WeatherIcon(daily.weather)}
           </div>
           <div class="flex items-start">
             <span class="text-xl font-medium text-foreground">${daily.max_temp}</span>
             <span class="text-sm text-foreground">°</span>
           </div>
         </div>`;
            forecastContainer.innerHTML += forecastCard;
})
         }
        
        }


//Other Cities
async function fetchCitySummary(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weathercode&daily=temperature_2m_max&timezone=auto`
  );

  return res.json();
}


async function getCityWeatherSummary(cityName) {
  const place = await getCityCoordinates(cityName);
  const weather = await fetchCitySummary(
    place.latitude,
    place.longitude
  );

  return {
    city: place.name,
    country: place.country,
    icon: mapWeatherCodeToType(weather.current.weathercode),
    weather: mapWeatherCodeToType(weather.current.weathercode).replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()),
    maxTemp: weather.daily.temperature_2m_max[0]
  };
}

async function loadAllCitiesWeather(cities) {
  try {
    const requests = cities.map(city =>
      getCityWeatherSummary(city)
    );

    const results = await Promise.all(requests);
    renderCities(results);

  } catch (err) {
    console.error("Failed to load cities:", err);
  }
}

const renderCities = (cities) => {
  if (!cities || cities.length === 0) return;

  const citiesSkeleton = document.querySelector(".cities-skeleton");

  if (citiesSkeleton) {
    citiesSkeleton.style.display = "none"; // Hide skeleton
  }

const otherCitiesContainer = document.querySelector(".cities");
otherCitiesContainer.classList.remove("hidden");

      if (otherCitiesContainer) {
otherCitiesContainer.innerHTML = cities.map(city => `
    <div
      class="weather-card relative cursor-pointer bg-card border border-border rounded-2xl p-5 transition-all duration-300 flex items-center justify-between py-3 px-4"
    >
    <button class="delete-btn" onClick={deleteCard(this)}>—</button>
      <div>
        <span class="text-muted-foreground text-xs">${city.country}</span>
        <h4 class="text-foreground font-medium">${city.city}</h4>
        <span class="text-muted-foreground text-xs">
          ${city.weather} · ${Math.round(city.maxTemp)}°
        </span>
      </div>
      ${WeatherIcon(city.icon)}
    </div>
  `).join("");
      }

      // Add click event listeners to each city card
      const cityCards = otherCitiesContainer.querySelectorAll("div.weather-card");
      cityCards.forEach(card => {
        card.addEventListener("click", () => {
          cityCards.forEach(c => c.classList.remove("bg-primary"));
          card.classList.add("bg-primary");

          // Fetch and display weather for selected city
          const cityName = card.querySelector("h4").textContent;
          getCityCoordinates(cityName.toLowerCase()).then(place => {
            fetchWeather(place.latitude, place.longitude);
            if (locationElement) {
              locationElement.textContent = `${place.name}, ${place.country}`;
            }
          });
        });
      });
    }


    
// Today's Overview
// Wind
function normalizeWindData(windData, maxHeight = 100) {
  const maxWind = Math.max(...windData);

  return windData.map(speed =>
    Math.round((speed / maxWind) * maxHeight)
  );
}

const renderWindStatus = (wind,windData) => {
const windStatus = document.querySelector(".wind-status");
const windOverview = document.querySelector(".wind-overview");
if (!windStatus || !windData) return;
  
windOverview.textContent = parseFloat(wind.speed); 
windStatus.innerHTML = "";
normalized = normalizeWindData(windData, 100);

function getCurrentTwoHourIndex() {
  const now = new Date();
  const hour = now.getHours(); // 0–23
  return Math.floor(hour / 2);
}
const currentIndex = getCurrentTwoHourIndex();

  normalized.forEach((height, i) => {
    const isCurrent = i === currentIndex;
    const hourLabel = `${i * 2}:00`;

     windStatus.innerHTML += `
      <div
        class="flex-1 rounded-t transition-all duration-300 
          ${isCurrent ? "bg-primary" : "bg-muted-foreground/30"}"
        style="height: ${height}%"
        title="${hourLabel} • ${windData[i]} km/h"
      ></div
    `;
  });
}


// UV Index
function renderUVIndex(uv) {
  const uvValue = document.getElementById("uv-value");
  const uvProgress = document.getElementById("uv-progress");

  if (!uvValue || !uvProgress || uv == null) return;

  const MAX_UV = 11;
  const clampedUV = Math.min(uv, MAX_UV);

  // Total arc length ≈ 126 (semi-circle)
  const ARC_LENGTH = 126;
  const progress = (clampedUV / MAX_UV) * ARC_LENGTH;

  uvValue.textContent = clampedUV.toFixed(1);

  uvProgress.style.strokeDashoffset =
    ARC_LENGTH - progress;

  // Optional severity coloring
  uvProgress.style.stroke = getUVColor(clampedUV);
}

function getUVColor(uv) {
  if (uv <= 2) return "hsl(142 70% 45%)"; // Low - green
  if (uv <= 5) return "hsl(48 95% 55%)";  // Moderate - yellow
  if (uv <= 7) return "hsl(28 90% 55%)";  // High - orange
  if (uv <= 10) return "hsl(0 85% 60%)";  // Very High - red
  return "hsl(290 70% 55%)";              // Extreme - purple
}


//Humidity
function renderHumidity(humidity, dewPoint) {
  const humidityElement = document.querySelector(".humidity-overview");
  const dewPointElement = document.querySelector(".dew-point"); 

  if (!humidityElement || !dewPointElement) return;

  humidityElement.textContent = `${humidity}`; 
  dewPointElement.textContent = `${dewPoint}`; 
}


//Visibility
function renderVisibility(visibility) {
  const visibilityElement = document.querySelector(".visibility-overview");
  const visibilityDescription = document.querySelector(".visibility-description");

  if (!visibilityElement || !visibilityDescription) return;

  let status = "";
  if (visibility > 40) status = "excellent";
  else if (visibility > 10) status = "good";
  else if (visibility > 4) status = "moderate";
  else if (visibility > 1) status = "poor";
  else status = "very poor (foggy)";

  visibilityElement.textContent = `${visibility}`; 
  visibilityDescription.textContent = `Current visibility is ${status}.`;
}
  






//Time Tabs
const TimeLine = () => {
const timeTabs = document.querySelector(".tabs-container");
const tabs = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "next7days", label: "Next 7days", active: true },
  ];

    if (timeTabs) {

tabs.forEach(tab => {
  const btn = `<button class="text-sm font-medium transition-colors ${
            tab.active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }"" role="tab" id="${tab.id}" aria-controls="section-${tab.id}" aria-selected="true">
    ${tab.label}
  </button>`
    timeTabs.innerHTML += btn;
})
  }
}

// Search City
function loadStoredCities() {
  const storedCities = localStorage.getItem("weatherNowCities") || "[]";
  const parsedCities = JSON.parse(storedCities);
  if (!Array.isArray(parsedCities)) return [];
  return parsedCities;
}

function saveCitiesToStorage(cities) {
  localStorage.setItem("weatherNowCities", JSON.stringify(cities));
}

async function addCitytoOtherCities(cityName) {
  const storedCities = loadStoredCities();

      // Check for duplicates
      if (storedCities.includes(cityName.toLocaleLowerCase())) {
                const cityIndex = storedCities.indexOf(cityName);
              const prevAddedCity = document.querySelector(".cities div.bg-primary");
      if (prevAddedCity) prevAddedCity.classList.remove("bg-primary");

        // Highlight existing city
        const city = document.querySelector(`.cities div:nth-child(${cityIndex + 1})`);
        city.classList.add("bg-primary");
        return;
      }

      //Add to other cities list
      storedCities.unshift(cityName.toLowerCase());
      console.log(storedCities);
      await loadAllCitiesWeather(storedCities);
      const prevAddedCity = document.querySelector(".cities div.bg-primary");
      if (prevAddedCity) prevAddedCity.classList.remove("bg-primary");

      // Highlight recently added city
      const recentlyAddedCity = document.querySelector(".cities div:first-child");
      if (recentlyAddedCity) {
        recentlyAddedCity.classList.add("bg-primary");
      }
      saveCitiesToStorage(storedCities);
    }

const searchForm = document.getElementById("search-city");
if (searchForm) {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cityInput = searchForm.querySelector("input");
    const cityName = cityInput.value.trim();
    if (!cityName) return;  

    try {
      const cityData = await getCityCoordinates(cityName);
      await fetchWeather(cityData.latitude, cityData.longitude);
      if (locationElement) {
        locationElement.textContent = `${cityData.name}, ${cityData.country}`;
      }

      await addCitytoOtherCities(cityData.name);
    } catch (error) {
      alert(error.message);
    }

    cityInput.value = "";
  });
}


// Edit Cities
const editCitiesBtn = document.querySelector(".edit-cities-btn");
if (editCitiesBtn) {
  editCitiesBtn.addEventListener("click", () => {

    //toggle edit mode
    const cityCards = document.querySelectorAll(".cities div");
    cityCards.forEach((card, index) => {
      card.classList.toggle("edit-mode");
    });
    if ([...cityCards].some(card => card.classList.contains("edit-mode"))) {
      editCitiesBtn.textContent = "Done";
          //give the search input focus for adding new cities
    const cityInput = searchForm.querySelector("input");
    cityInput.focus();
    cityInput.placeholder = "Add cities to list";
    } else {
      editCitiesBtn.textContent = "Edit";
      loadAllCitiesWeather(JSON.parse(localStorage.getItem("weatherNowCities")));
    }
  });
}  


// Delete City Card
function deleteCard(buttonElement) {

    const cardToRemove = buttonElement.closest('.weather-card');
    const cityName = cardToRemove.querySelector("h4").textContent;

    if (cardToRemove) {
        const storedCities = loadStoredCities()
        const newCities = storedCities.filter(city => city !== cityName.toLowerCase());
        saveCitiesToStorage(newCities);

        cardToRemove.remove();
    }
}

    
const homeButton = document.querySelector(".home");
if (homeButton) {
  homeButton.addEventListener("click", () => {
    getCurrentLocationWeather();
  });
}

const toggleBtn = document.getElementById("theme-toggle");
const body = document.body;

// Load saved preference
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  body.classList.add("light");
  toggleBtn.setAttribute("aria-pressed", "true");
}

// Toggle handler
toggleBtn.addEventListener("click", () => {
  const isLight = body.classList.toggle("light");

  console.log("Theme toggled. Light mode:", isLight);
  toggleBtn.setAttribute("aria-pressed", isLight);
  localStorage.setItem("theme", isLight ? "light" : "dark");
  updateThemeIcon(isLight);
});

function updateThemeIcon(isLight) {
  toggleBtn.innerHTML = isLight
    ? `<svg class="w-5 h-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
</svg>`
    : `<svg class="w-5 h-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
</svg>`;
}




// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  updateThemeIcon(body.classList.contains("light"));

  getCurrentLocationWeather();

  // TimeLine();
  loadAllCitiesWeather(JSON.parse(localStorage.getItem("weatherNowCities")));
});
