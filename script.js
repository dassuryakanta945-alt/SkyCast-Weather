/* =========================================================
   SKYCAST WEATHER PORTAL
   UNIVERSAL LOCATION SEARCH + WEATHER SYSTEM
========================================================= */

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_SEARCH_API = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/reverse";
const PIN_API = "https://api.postalpincode.in/pincode/";

let currentLocation = {
    name: "Bhubaneswar",
    district: "Khordha",
    state: "Odisha",
    postcode: "751001",
    latitude: 20.2961,
    longitude: 85.8245
};

let weatherRefreshTimer = null;
let weatherRequestController = null;
let lastSuccessfulWeatherUpdate = null;

const $ = id => document.getElementById(id);

function setText(id, value) {
    const el = $(id);
    if (el) {
        el.textContent =
            value === undefined ||
            value === null ||
            value === ""
                ? "--"
                : value;
    }
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   WEATHER BACKGROUND
========================================================= */

function installWeatherBackgroundStyles() {

    if ($("skycast-weather-background-style")) return;

    const style = document.createElement("style");

    style.id = "skycast-weather-background-style";

    style.textContent = `

        body {
            position: relative;
            overflow-x: hidden;
            transition: background 2s ease;
        }

        .skycast-weather-scene {
            position: fixed;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
        }

        .skycast-sky {
            position: absolute;
            inset: 0;
            background:
                linear-gradient(
                    180deg,
                    #4d9fd0 0%,
                    #72b8df 28%,
                    #9ed1ea 58%,
                    #cfe8f2 100%
                );
            transition:
                background 2.5s ease,
                filter 2s ease;
        }

        body.sky-clear-day .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #3c99d2 0%,
                    #65b4e2 30%,
                    #9ed5ed 65%,
                    #d9eef5 100%
                );
        }

        body.sky-partly-cloudy .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #579fca 0%,
                    #83b9d2 35%,
                    #b8d5df 70%,
                    #dce9ec 100%
                );
        }

        body.sky-cloudy .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #718b9a 0%,
                    #8fa6b2 35%,
                    #b5c5cc 70%,
                    #d5dfe2 100%
                );
        }

        body.sky-rain .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #4d6472 0%,
                    #657d8b 30%,
                    #91a4ae 67%,
                    #bcc8cc 100%
                );
        }

        body.sky-storm .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #18232d 0%,
                    #293b46 32%,
                    #465861 68%,
                    #68757a 100%
                );
            filter: brightness(.78);
        }

        body.sky-clear-night .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #020817 0%,
                    #071a32 38%,
                    #103052 70%,
                    #193d5a 100%
                );
        }

        body.sky-night-cloudy .skycast-sky {
            background:
                linear-gradient(
                    180deg,
                    #08111d 0%,
                    #172b3b 38%,
                    #304957 72%,
                    #53656c 100%
                );
        }

        .skycast-sun {
            position: absolute;
            right: 12%;
            top: 10%;
            width: 82px;
            height: 82px;
            border-radius: 50%;
            background:
                radial-gradient(
                    circle at 38% 35%,
                    #fffef1 0%,
                    #fff5c4 38%,
                    #ffd967 72%,
                    #ffc14a 100%
                );
            box-shadow:
                0 0 18px rgba(255,231,150,.72),
                0 0 42px rgba(255,220,120,.30);
            opacity: 0;
            transition: opacity 2s ease;
        }

        body.sky-clear-day .skycast-sun {
            opacity: .96;
        }

        body.sky-partly-cloudy .skycast-sun {
            opacity: .68;
        }

        body.sky-cloudy .skycast-sun {
            opacity: .16;
        }

        .skycast-day-glow {
            position: absolute;
            width: 520px;
            height: 520px;
            right: -190px;
            top: -190px;
            border-radius: 50%;
            background:
                radial-gradient(
                    circle,
                    rgba(255,238,170,.18) 0%,
                    rgba(255,225,145,.08) 32%,
                    transparent 68%
                );
            opacity: 0;
            transition: opacity 2s ease;
        }

        body.sky-clear-day .skycast-day-glow {
            opacity: 1;
        }

        body.sky-partly-cloudy .skycast-day-glow {
            opacity: .55;
        }

        .skycast-cloud-layer {
            position: absolute;
            inset: 0;
            overflow: hidden;
            opacity: 0;
            transition: opacity 2s ease;
        }

        body.sky-clear-day .skycast-cloud-layer,
        body.sky-partly-cloudy .skycast-cloud-layer,
        body.sky-cloudy .skycast-cloud-layer,
        body.sky-rain .skycast-cloud-layer,
        body.sky-storm .skycast-cloud-layer,
        body.sky-night-cloudy .skycast-cloud-layer {
            opacity: 1;
        }

        .skycast-cloud {
            position: absolute;
            left: -520px;
            width: 430px;
            height: 150px;
            animation: skycastCloudMove linear infinite;
        }

        .skycast-cloud svg {
            width: 100%;
            height: 100%;
            overflow: visible;
        }

        @keyframes skycastCloudMove {
            0% {
                transform: translate3d(-520px,0,0);
            }
            25% {
                transform: translate3d(calc(25vw - 100px),-6px,0);
            }
            50% {
                transform: translate3d(calc(50vw - 40px),4px,0);
            }
            75% {
                transform: translate3d(calc(75vw + 20px),-4px,0);
            }
            100% {
                transform: translate3d(calc(100vw + 560px),0,0);
            }
        }

        .skycast-cloud:nth-child(1) {
            top: 8%;
            width: 470px;
            height: 165px;
            animation-duration: 105s;
            animation-delay: -40s;
        }

        .skycast-cloud:nth-child(2) {
            top: 20%;
            width: 350px;
            height: 125px;
            animation-duration: 120s;
            animation-delay: -82s;
        }

        .skycast-cloud:nth-child(3) {
            top: 31%;
            width: 510px;
            height: 175px;
            animation-duration: 135s;
            animation-delay: -100s;
        }

        .skycast-cloud:nth-child(4) {
            top: 14%;
            width: 290px;
            height: 105px;
            animation-duration: 115s;
            animation-delay: -30s;
        }

        .skycast-cloud:nth-child(5) {
            top: 43%;
            width: 420px;
            height: 145px;
            animation-duration: 145s;
            animation-delay: -120s;
        }

        .skycast-cloud:nth-child(6) {
            top: 26%;
            width: 315px;
            height: 110px;
            animation-duration: 125s;
            animation-delay: -70s;
        }

        body.sky-clear-day .skycast-cloud {
            opacity: .56;
        }

        body.sky-partly-cloudy .skycast-cloud {
            opacity: .78;
        }

        body.sky-cloudy .skycast-cloud {
            opacity: .88;
        }

        body.sky-rain .skycast-cloud {
            opacity: .96;
        }

        body.sky-storm .skycast-cloud {
            opacity: 1;
        }

        body.sky-night-cloudy .skycast-cloud {
            opacity: .44;
        }

        .skycast-rain {
            position: absolute;
            inset: -15% 0 0;
            overflow: hidden;
            opacity: 0;
            transition: opacity 1.5s ease;
        }

        body.sky-rain .skycast-rain,
        body.sky-storm .skycast-rain {
            opacity: 1;
        }

        .skycast-rain span {
            position: absolute;
            top: -120px;
            width: 1px;
            height: 65px;
            background:
                linear-gradient(
                    to bottom,
                    transparent,
                    rgba(215,238,250,.82)
                );
            transform: rotate(12deg);
            animation: skycastRainFall linear infinite;
        }

        @keyframes skycastRainFall {
            from {
                transform:
                    translate3d(0,-120px,0)
                    rotate(12deg);
            }
            to {
                transform:
                    translate3d(-180px,115vh,0)
                    rotate(12deg);
            }
        }

        .skycast-rain-front {
            position: absolute;
            inset: -15% 0 0;
            overflow: hidden;
            opacity: 0;
        }

        body.sky-rain .skycast-rain-front {
            opacity: .42;
        }

        body.sky-storm .skycast-rain-front {
            opacity: .72;
        }

        .skycast-rain-front span {
            position: absolute;
            top: -140px;
            width: 2px;
            height: 105px;
            background:
                linear-gradient(
                    to bottom,
                    transparent,
                    rgba(220,242,255,.90)
                );
            animation: skycastFrontRain linear infinite;
        }

        @keyframes skycastFrontRain {
            from {
                transform:
                    translate3d(0,-140px,0)
                    rotate(12deg);
            }
            to {
                transform:
                    translate3d(-230px,120vh,0)
                    rotate(12deg);
            }
        }

        .skycast-moon {
            position: absolute;
            right: 12%;
            top: 9%;
            width: 76px;
            height: 76px;
            border-radius: 50%;
            background:
                radial-gradient(
                    circle at 34% 30%,
                    #ffffff 0%,
                    #f4f4e9 52%,
                    #d6d8cc 100%
                );
            box-shadow:
                0 0 20px rgba(235,242,255,.68),
                0 0 58px rgba(205,225,255,.22);
            opacity: 0;
            transition: opacity 2s ease;
        }

        body.sky-clear-night .skycast-moon,
        body.sky-night-cloudy .skycast-moon {
            opacity: .92;
        }

        .skycast-moon::before {
            content: "";
            position: absolute;
            width: 12px;
            height: 12px;
            left: 21px;
            top: 28px;
            border-radius: 50%;
            background: rgba(160,165,158,.18);
        }

        .skycast-moon::after {
            content: "";
            position: absolute;
            width: 8px;
            height: 8px;
            right: 20px;
            bottom: 22px;
            border-radius: 50%;
            background: rgba(160,165,158,.16);
        }

        .skycast-stars {
            position: absolute;
            inset: 0;
            opacity: 0;
            transition: opacity 1.5s ease;
        }

        body.sky-clear-night .skycast-stars,
        body.sky-night-cloudy .skycast-stars {
            opacity: 1;
        }

        .skycast-star {
            position: absolute;
            width: 2px;
            height: 2px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 6px rgba(255,255,255,.72);
            animation: skycastStarTwinkle 4s ease-in-out infinite;
        }

        @keyframes skycastStarTwinkle {
            0%,100% { opacity: .25; }
            50% { opacity: .95; }
        }

        .skycast-lightning {
            position: absolute;
            inset: 0;
            opacity: 0;
            background:
                radial-gradient(
                    ellipse at 55% 22%,
                    rgba(245,250,255,.55),
                    transparent 52%
                );
            mix-blend-mode: screen;
        }

        body.sky-storm .skycast-lightning {
            animation: skycastLightning 9s infinite;
        }

        @keyframes skycastLightning {
            0%,72%,100% { opacity: 0; }
            73% { opacity: .95; }
            74% { opacity: .08; }
            75% { opacity: .72; }
            76% { opacity: 0; }
            88% { opacity: .48; }
            89% { opacity: 0; }
        }

        .skycast-bolt {
            position: absolute;
            left: 56%;
            top: 2%;
            width: 8px;
            height: 52%;
            background:
                linear-gradient(
                    180deg,
                    transparent,
                    #fff 20%,
                    #dff6ff 55%,
                    #fff 78%,
                    transparent
                );
            clip-path:
                polygon(
                    42% 0%,
                    62% 0%,
                    52% 24%,
                    100% 24%,
                    57% 52%,
                    68% 52%,
                    18% 100%,
                    34% 58%,
                    0% 58%,
                    42% 25%
                );
            opacity: 0;
        }

        body.sky-storm .skycast-bolt {
            animation: skycastBolt 9s infinite;
        }

        @keyframes skycastBolt {
            0%,72%,100% { opacity: 0; }
            73% { opacity: 1; }
            74% { opacity: 0; }
            75% { opacity: .9; }
            76% { opacity: 0; }
            88% { opacity: .45; }
            89% { opacity: 0; }
        }

        .skycast-darkness {
            position: absolute;
            inset: 0;
            background:
                linear-gradient(
                    180deg,
                    rgba(0,0,0,.02),
                    rgba(0,0,0,.14)
                );
            opacity: 0;
            transition: opacity 2s ease;
        }

        body.sky-rain .skycast-darkness {
            opacity: .22;
        }

        body.sky-storm .skycast-darkness {
            opacity: .48;
        }

        body.sky-clear-night .skycast-darkness,
        body.sky-night-cloudy .skycast-darkness {
            opacity: .20;
        }

        header,
        main,
        footer {
            position: relative;
            z-index: 10;
        }
    `;

    document.head.appendChild(style);
}


function createCloudSVG(variant = 0) {

    const paths = [
        `M18 104 C20 87 34 76 51 76 C54 53 72 37 94 39 C108 17 135 11 155 27 C172 8 204 12 214 36 C240 27 267 40 271 63 C292 59 315 70 320 91 C338 91 353 99 356 112 C351 128 336 134 316 134 L47 134 C28 134 16 122 18 104 Z`,
        `M16 108 C18 91 31 82 48 81 C45 61 61 46 82 45 C91 23 114 14 136 25 C149 4 181 5 193 28 C218 20 242 32 247 54 C270 49 294 62 299 82 C322 79 343 91 349 108 C348 124 334 133 315 133 L45 133 C27 133 15 123 16 108 Z`,
        `M22 106 C20 88 35 75 54 76 C57 54 76 38 98 42 C107 20 131 12 153 23 C169 6 197 10 208 31 C231 24 258 38 262 59 C285 56 308 69 311 89 C333 88 349 99 354 111 C354 127 339 135 319 135 L48 135 C29 135 20 122 22 106 Z`
    ];

    const path = paths[variant % paths.length];

    return `
        <svg viewBox="0 0 370 150"
             preserveAspectRatio="none"
             xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="cloudTop${variant}"
                    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="48%" stop-color="#f4f7f8"/>
                    <stop offset="100%" stop-color="#d2dde2"/>
                </linearGradient>

                <linearGradient id="cloudGrey${variant}"
                    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#e9eef1"/>
                    <stop offset="55%" stop-color="#b8c5cb"/>
                    <stop offset="100%" stop-color="#87969e"/>
                </linearGradient>

                <linearGradient id="cloudRain${variant}"
                    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#71818a"/>
                    <stop offset="50%" stop-color="#4c5b65"/>
                    <stop offset="100%" stop-color="#2d3941"/>
                </linearGradient>
            </defs>

            <path d="${path}"
                fill="url(#cloudRain${variant})"
                opacity=".12"
                transform="translate(3 7)"/>

            <path d="${path}"
                fill="url(#cloudTop${variant})"/>

            <path d="${path}"
                fill="url(#cloudGrey${variant})"
                opacity=".20"
                transform="translate(0 7)"/>
        </svg>
    `;
}


function createWeatherLayers() {

    if ($("skycast-weather-scene")) return;

    const scene = document.createElement("div");
    scene.id = "skycast-weather-scene";
    scene.className = "skycast-weather-scene";

    const sky = document.createElement("div");
    sky.className = "skycast-sky";
    scene.appendChild(sky);

    const glow = document.createElement("div");
    glow.className = "skycast-day-glow";
    scene.appendChild(glow);

    const sun = document.createElement("div");
    sun.className = "skycast-sun";
    scene.appendChild(sun);

    const moon = document.createElement("div");
    moon.className = "skycast-moon";
    scene.appendChild(moon);

    const stars = document.createElement("div");
    stars.className = "skycast-stars";

    for (let i = 0; i < 65; i++) {
        const star = document.createElement("span");
        star.className = "skycast-star";
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 58}%`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        stars.appendChild(star);
    }

    scene.appendChild(stars);

    const cloudLayer = document.createElement("div");
    cloudLayer.className = "skycast-cloud-layer";

    for (let i = 0; i < 6; i++) {
        const cloud = document.createElement("div");
        cloud.className = "skycast-cloud";
        cloud.innerHTML = createCloudSVG(i);
        cloudLayer.appendChild(cloud);
    }

    scene.appendChild(cloudLayer);

    const rain = document.createElement("div");
    rain.className = "skycast-rain";

    for (let i = 0; i < 125; i++) {
        const drop = document.createElement("span");
        drop.style.left = `${Math.random() * 110}%`;
        drop.style.height = `${45 + Math.random() * 70}px`;
        drop.style.animationDuration = `${.45 + Math.random() * .75}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        drop.style.opacity = `${.18 + Math.random() * .68}`;
        rain.appendChild(drop);
    }

    scene.appendChild(rain);

    const frontRain = document.createElement("div");
    frontRain.className = "skycast-rain-front";

    for (let i = 0; i < 30; i++) {
        const drop = document.createElement("span");
        drop.style.left = `${Math.random() * 110}%`;
        drop.style.height = `${80 + Math.random() * 75}px`;
        drop.style.animationDuration = `${.35 + Math.random() * .45}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        drop.style.opacity = `${.25 + Math.random() * .60}`;
        frontRain.appendChild(drop);
    }

    scene.appendChild(frontRain);

    const lightning = document.createElement("div");
    lightning.className = "skycast-lightning";

    const bolt = document.createElement("div");
    bolt.className = "skycast-bolt";

    lightning.appendChild(bolt);
    scene.appendChild(lightning);

    const darkness = document.createElement("div");
    darkness.className = "skycast-darkness";
    scene.appendChild(darkness);

    document.body.prepend(scene);
}


/* =========================================================
   WEATHER BACKGROUND UPDATE
========================================================= */

function updateWeatherBackground(code, isDay) {

    installWeatherBackgroundStyles();
    createWeatherLayers();

    document.body.classList.remove(
        "sky-clear-day",
        "sky-clear-night",
        "sky-partly-cloudy",
        "sky-cloudy",
        "sky-rain",
        "sky-storm",
        "sky-fog",
        "sky-snow",
        "sky-day",
        "sky-night-cloudy"
    );

    code = Number(code);
    isDay = Number(isDay);

    if (code === 0 || code === 1) {
        document.body.classList.add(
            isDay === 1
                ? "sky-clear-day"
                : "sky-clear-night"
        );

        if (isDay === 1) {
            document.body.classList.add("sky-day");
        }

        return;
    }

    if (code === 2) {
        document.body.classList.add(
            isDay === 1
                ? "sky-partly-cloudy"
                : "sky-night-cloudy"
        );

        if (isDay === 1) {
            document.body.classList.add("sky-day");
        }

        return;
    }

    if (code === 3 || code === 45 || code === 48) {
        document.body.classList.add(
            isDay === 1
                ? "sky-cloudy"
                : "sky-night-cloudy"
        );

        if (isDay === 1) {
            document.body.classList.add("sky-day");
        }

        return;
    }

    if (
        [51,53,55,61,63,65,80,81,82]
            .includes(code)
    ) {
        document.body.classList.add("sky-rain");
        return;
    }

    if ([95,96,99].includes(code)) {
        document.body.classList.add("sky-storm");
        return;
    }

    if ([71,73,75].includes(code)) {
        document.body.classList.add("sky-cloudy");
        return;
    }

    document.body.classList.add(
        isDay === 1
            ? "sky-clear-day"
            : "sky-clear-night"
    );
}


/* =========================================================
   WEATHER INFO
========================================================= */

function weatherInfo(code, isDay = 1) {

    const data = {
        0: ["Clear Sky", isDay ? "☀️" : "🌙"],
        1: ["Mainly Clear", isDay ? "🌤️" : "🌙"],
        2: ["Partly Cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Fog", "🌫️"],
        48: ["Fog", "🌫️"],
        51: ["Light Drizzle", "🌦️"],
        53: ["Drizzle", "🌦️"],
        55: ["Heavy Drizzle", "🌧️"],
        61: ["Light Rain", "🌦️"],
        63: ["Rain", "🌧️"],
        65: ["Heavy Rain", "🌧️"],
        71: ["Light Snow", "🌨️"],
        73: ["Snow", "🌨️"],
        75: ["Heavy Snow", "❄️"],
        80: ["Rain Showers", "🌦️"],
        81: ["Rain Showers", "🌧️"],
        82: ["Heavy Rain Showers", "⛈️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm", "⛈️"],
        99: ["Heavy Thunderstorm", "⛈️"]
    };

    return data[Number(code)] || ["Unknown", "🌡️"];
}


/* =========================================================
   TIME
========================================================= */

function formatTime(value) {

    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--";
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );
}


function formatDate(value) {

    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function formatDay(value) {

    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "short"
        }
    );
}


/* =========================================================
   LOCATION NORMALIZATION
========================================================= */

function normalizePlace(place) {

    const address = place.address || {};

    const name =
        place.name ||
        address.village ||
        address.town ||
        address.city ||
        address.suburb ||
        address.neighbourhood ||
        address.hamlet ||
        address.postcode ||
        "Unknown Location";

    const district =
        place.admin2 ||
        address.state_district ||
        address.district ||
        address.county ||
        address.municipality ||
        address.city_district ||
        "--";

    const state =
        place.admin1 ||
        address.state ||
        "--";

    const postcode =
        place.postcode ||
        address.postcode ||
        (
            Array.isArray(place.postcodes)
                ? place.postcodes[0]
                : ""
        ) ||
        "--";

    return {
        name,
        district,
        state,
        postcode,
        latitude: Number(
            place.latitude ??
            place.lat
        ),
        longitude: Number(
            place.longitude ??
            place.lon
        ),
        country:
            place.country ||
            address.country ||
            "India",

        type:
            place.type ||
            place.addresstype ||
            "",

        source:
            place.source ||
            "search"
    };
}


/* =========================================================
   SEARCH RANKING
========================================================= */

function locationScore(place, query) {

    const q =
        String(query)
            .trim()
            .toLowerCase();

    const name =
        String(place.name || "")
            .toLowerCase();

    const district =
        String(place.district || "")
            .toLowerCase();

    const state =
        String(place.state || "")
            .toLowerCase();

    let score = 0;

    if (name === q) score += 1000;

    if (name.startsWith(q)) score += 500;

    if (name.includes(q)) score += 250;

    if (district === q) score += 220;

    if (district.includes(q)) score += 100;

    if (state === q) score += 80;

    const type =
        String(place.type || "")
            .toLowerCase();

    if (
        [
            "city",
            "town",
            "village",
            "suburb",
            "neighbourhood",
            "hamlet",
            "locality"
        ].includes(type)
    ) {
        score += 40;
    }

    if (place.postcode && place.postcode !== "--") {
        score += 10;
    }

    if (Number.isFinite(place.latitude) &&
        Number.isFinite(place.longitude)) {
        score += 10;
    }

    return score;
}


/* =========================================================
   OPEN-METEO SEARCH
========================================================= */

async function searchOpenMeteo(query) {

    try {

        const url =
            `${GEOCODING_API}` +
            `?name=${encodeURIComponent(query)}` +
            `&count=100` +
            `&language=en` +
            `&format=json`;

        const response =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        if (!Array.isArray(data.results)) {
            return [];
        }

        return data.results
            .filter(place =>
                String(
                    place.country_code || ""
                ).toUpperCase() === "IN"
            )
            .map(place => ({
                ...normalizePlace(place),
                source: "Open-Meteo"
            }));

    } catch (error) {

        console.warn(
            "Open-Meteo search failed:",
            error
        );

        return [];
    }
}


/* =========================================================
   NOMINATIM AREA SEARCH
========================================================= */

async function searchNominatim(query) {

    try {

        const url =
            `${NOMINATIM_SEARCH_API}` +
            `?q=${encodeURIComponent(query)}` +
            `&format=jsonv2` +
            `&addressdetails=1` +
            `&limit=50` +
            `&countrycodes=in` +
            `&accept-language=en`;

        const response =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        if (!Array.isArray(data)) {
            return [];
        }

        return data.map(place => ({
            ...normalizePlace(place),
            source: "OpenStreetMap"
        }));

    } catch (error) {

        console.warn(
            "OpenStreetMap search failed:",
            error
        );

        return [];
    }
}


/* =========================================================
   MERGE SEARCH RESULTS
========================================================= */

function mergeLocationResults(
    results,
    query
) {

    const unique = new Map();

    for (const place of results) {

        if (
            !Number.isFinite(place.latitude) ||
            !Number.isFinite(place.longitude)
        ) {
            continue;
        }

        const key =
            [
                String(place.name).toLowerCase(),
                String(place.district).toLowerCase(),
                String(place.state).toLowerCase(),
                Number(place.latitude).toFixed(4),
                Number(place.longitude).toFixed(4)
            ].join("|");

        if (!unique.has(key)) {
            unique.set(key, place);
        }
    }

    return [...unique.values()]
        .sort(
            (a, b) =>
                locationScore(b, query) -
                locationScore(a, query)
        )
        .slice(0, 20);
}


/* =========================================================
   MAIN LOCATION SEARCH
========================================================= */

async function searchLocation(query) {

    query =
        String(query || "")
            .trim();

    if (!query) {

        alert(
            "Please enter a city, village, area, district or PIN code."
        );

        return;
    }

    const box =
        $("searchResults");

    if (box) {

        box.innerHTML = `
            <div class="result-item">
                🔎 Searching city, area, village, locality...
            </div>
        `;

        box.style.display = "block";
    }


    /* 6 DIGIT PIN */

    if (/^\\d{6}$/.test(query)) {

        await searchPin(query);

        return;
    }


    try {

        /*
         * SEARCH BOTH DATABASES
         * AT THE SAME TIME
         */

        const [
            openMeteoResults,
            osmResults
        ] =
            await Promise.all([
                searchOpenMeteo(query),
                searchNominatim(query)
            ]);


        let results =
            mergeLocationResults(
                [
                    ...openMeteoResults,
                    ...osmResults
                ],
                query
            );


        /*
         * If normal search gives nothing,
         * try India Post as a fallback.
         */

        if (!results.length) {

            const pinResults =
                await searchPostOfficeByName(
                    query
                );

            results =
                mergeLocationResults(
                    pinResults,
                    query
                );
        }


        if (!results.length) {

            showNoResults();
            return;
        }


        showSearchResults(results);

    } catch (error) {

        console.error(
            "Universal location search error:",
            error
        );

        showNoResults();
    }
}


/* =========================================================
   INDIA POST PIN SEARCH
========================================================= */

async function searchPin(pin) {

    const cleanPin =
        String(pin || "")
            .replace(/\D/g, "");

    if (cleanPin.length !== 6) {

        showNoResults();
        return;
    }

    try {

        const response =
            await fetch(
                `${PIN_API}${cleanPin}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error("PIN API error");
        }

        const data =
            await response.json();

        if (
            !data ||
            !data[0] ||
            data[0].Status !== "Success" ||
            !Array.isArray(
                data[0].PostOffice
            )
        ) {

            showNoResults();
            return;
        }

        const offices =
            data[0].PostOffice;

        const results = [];

        for (const post of offices.slice(0, 10)) {

            let coordinates = null;

            try {

                const geo =
                    await searchOpenMeteo(
                        post.Name
                    );

                const match =
                    geo.find(item =>
                        String(
                            item.state
                        ).toLowerCase() ===
                        String(
                            post.State
                        ).toLowerCase()
                    );

                if (match) {
                    coordinates = match;
                } else if (geo[0]) {
                    coordinates = geo[0];
                }

            } catch (error) {
                console.warn(
                    "PIN coordinate search:",
                    error
                );
            }

            if (coordinates) {

                results.push({
                    name: post.Name,
                    district: post.District,
                    state: post.State,
                    postcode: cleanPin,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    country: "India",
                    type: "post office",
                    source: "India Post"
                });
            }
        }


        if (!results.length) {

            showNoResults();
            return;
        }

        showSearchResults(results);

    } catch (error) {

        console.error(
            "PIN search error:",
            error
        );

        showNoResults();
    }
}


/* =========================================================
   INDIA POST NAME FALLBACK
========================================================= */

async function searchPostOfficeByName(query) {

    /*
     * India Post does not provide a universal
     * name-search endpoint, so this fallback
     * searches OpenStreetMap/Open-Meteo again.
     */

    try {

        const variations = [
            `${query}, India`,
            `${query} village, India`,
            `${query} town, India`,
            `${query} Odisha, India`
        ];

        const all = [];

        for (const text of variations) {

            const results =
                await searchNominatim(
                    text
                );

            all.push(...results);
        }

        return all;

    } catch (error) {

        return [];
    }
}


/* =========================================================
   DISPLAY SEARCH RESULTS
========================================================= */

function showSearchResults(results) {

    const box =
        $("searchResults");

    if (!box) return;

    box.innerHTML = "";

    results
        .slice(0, 10)
        .forEach(place => {

            const item =
                document.createElement("div");

            item.className =
                "result-item";

            const district =
                place.district || "--";

            const state =
                place.state || "--";

            const postcode =
                place.postcode &&
                place.postcode !== "--"
                    ? place.postcode
                    : "";

            const source =
                place.source || "";


            item.innerHTML = `
                <strong>
                    📍 ${escapeHTML(
                        place.name ||
                        "Unknown Location"
                    )}
                </strong>

                <small>
                    ${escapeHTML(district)},
                    ${escapeHTML(state)}

                    ${
                        postcode
                            ? ` • PIN ${escapeHTML(
                                postcode
                            )}`
                            : ""
                    }

                    ${
                        source
                            ? ` • ${escapeHTML(
                                source
                            )}`
                            : ""
                    }
                </small>
            `;


            item.addEventListener(
                "click",
                async () => {

                    const latitude =
                        Number(
                            place.latitude
                        );

                    const longitude =
                        Number(
                            place.longitude
                        );

                    if (
                        !Number.isFinite(
                            latitude
                        ) ||
                        !Number.isFinite(
                            longitude
                        )
                    ) {

                        alert(
                            "Weather coordinates are not available for this location."
                        );

                        return;
                    }


                    box.style.display =
                        "none";


                    await loadLocation({

                        name:
                            place.name,

                        district:
                            district,

                        state:
                            state,

                        postcode:
                            postcode || "--",

                        country:
                            place.country ||
                            "India",

                        latitude:
                            latitude,

                        longitude:
                            longitude
                    });
                }
            );


            box.appendChild(item);
        });


    box.style.display =
        "block";
}


/* =========================================================
   NO RESULTS
========================================================= */

function showNoResults() {

    const box =
        $("searchResults");

    if (!box) return;

    box.innerHTML = `
        <div class="result-item">
            ❌ Location not found.<br>
            <small>
                Try exact area name, village,
                district, town, city or 6-digit PIN.
            </small>
        </div>
    `;

    box.style.display =
        "block";
}


/* =========================================================
   LOAD LOCATION
========================================================= */

async function loadLocation(location) {

    if (
        !location ||
        !Number.isFinite(
            Number(location.latitude)
        ) ||
        !Number.isFinite(
            Number(location.longitude)
        )
    ) {

        alert(
            "Weather coordinates are not available for this location."
        );

        return;
    }


    currentLocation = {

        ...currentLocation,
        ...location,

        latitude:
            Number(
                location.latitude
            ),

        longitude:
            Number(
                location.longitude
            )
    };


    setText(
        "locationFullName",
        [
            currentLocation.name,
            currentLocation.district,
            currentLocation.state
        ]
            .filter(Boolean)
            .join(", ")
    );


    setText(
        "cityName",
        currentLocation.name
    );


    setText(
        "districtName",
        currentLocation.district ||
        "--"
    );


    setText(
        "stateName",
        currentLocation.state ||
        "--"
    );


    setText(
        "postcode",
        currentLocation.postcode ||
        "--"
    );


    await loadWeather(
        currentLocation.latitude,
        currentLocation.longitude
    );
}


/* =========================================================
   WEATHER URL
========================================================= */

function buildWeatherURL(
    latitude,
    longitude
) {

    return (
        `${WEATHER_API}` +
        `?latitude=${encodeURIComponent(latitude)}` +
        `&longitude=${encodeURIComponent(longitude)}` +
        `&current=` +
        `temperature_2m,` +
        `relative_humidity_2m,` +
        `apparent_temperature,` +
        `is_day,` +
        `weather_code,` +
        `wind_speed_10m,` +
        `surface_pressure` +
        `&hourly=` +
        `visibility,` +
        `precipitation_probability` +
        `&daily=` +
        `weather_code,` +
        `temperature_2m_max,` +
        `temperature_2m_min,` +
        `sunrise,` +
        `sunset,` +
        `precipitation_probability_max` +
        `&timezone=auto` +
        `&forecast_days=5` +
        `&_skycast_refresh=${Date.now()}`
    );
}


/* =========================================================
   WEATHER LOADER
========================================================= */

async function loadWeather(
    latitude,
    longitude
) {

    if (
        !Number.isFinite(
            Number(latitude)
        ) ||
        !Number.isFinite(
            Number(longitude)
        )
    ) {
        return;
    }


    if (weatherRequestController) {
        weatherRequestController.abort();
    }


    const controller =
        new AbortController();

    weatherRequestController =
        controller;


    const timeout =
        setTimeout(
            () => controller.abort(),
            15000
        );


    try {

        const response =
            await fetch(
                buildWeatherURL(
                    latitude,
                    longitude
                ),
                {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Weather API error: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            controller.signal.aborted
        ) {
            return;
        }


        if (!data.current) {

            throw new Error(
                "Current weather data missing"
            );
        }


        displayCurrentWeather(
            data
        );

        displayOverview(
            data
        );

        displayForecast(
            data
        );


        lastSuccessfulWeatherUpdate =
            Date.now();


        setText(
            "updatedText",
            `Updated ${formatTime(
                data.current.time
            )}`
        );


        console.log(
            "✅ SkyCast weather updated:",
            data.current.time
        );

    } catch (error) {

        if (
            error.name === "AbortError"
        ) {

            console.warn(
                "SkyCast weather request cancelled/timed out."
            );

        } else {

            console.error(
                "SkyCast weather error:",
                error
            );
        }


        if (
            lastSuccessfulWeatherUpdate
        ) {

            const minutes =
                Math.max(
                    1,
                    Math.round(
                        (
                            Date.now() -
                            lastSuccessfulWeatherUpdate
                        ) / 60000
                    )
                );


            setText(
                "updatedText",
                `Last updated ${minutes} min ago`
            );

        } else {

            setText(
                "updatedText",
                "Weather temporarily unavailable"
            );
        }

    } finally {

        clearTimeout(timeout);

        if (
            weatherRequestController ===
            controller
        ) {
            weatherRequestController =
                null;
        }
    }
}


/* =========================================================
   CURRENT WEATHER
========================================================= */

function displayCurrentWeather(data) {

    const current =
        data.current;

    if (!current) return;


    const [
        condition,
        icon
    ] =
        weatherInfo(
            current.weather_code,
            current.is_day
        );


    updateWeatherBackground(
        current.weather_code,
        current.is_day
    );


    setText(
        "weatherIcon",
        icon
    );


    if (
        Number.isFinite(
            Number(
                current.temperature_2m
            )
        )
    ) {

        setText(
            "temperature",
            `${Math.round(
                current.temperature_2m
            )}°C`
        );
    }


    setText(
        "condition",
        condition
    );


    if (
        Number.isFinite(
            Number(
                current.apparent_temperature
            )
        )
    ) {

        setText(
            "feelsLike",
            `${Math.round(
                current.apparent_temperature
            )}°C`
        );
    }


    if (
        Number.isFinite(
            Number(
                current.relative_humidity_2m
            )
        )
    ) {

        setText(
            "humidity",
            `${Math.round(
                current.relative_humidity_2m
            )}%`
        );
    }


    if (
        Number.isFinite(
            Number(
                current.wind_speed_10m
            )
        )
    ) {

        setText(
            "windSpeed",
            `${Math.round(
                current.wind_speed_10m
            )} km/h`
        );
    }


    if (
        Number.isFinite(
            Number(
                current.surface_pressure
            )
        )
    ) {

        setText(
            "pressure",
            `${Math.round(
                current.surface_pressure
            )} hPa`
        );
    }


    setText(
        "weatherDate",
        formatDate(
            current.time
        )
    );
}


/* =========================================================
   WEATHER OVERVIEW
========================================================= */

function displayOverview(data) {

    if (!data.daily) return;

    const daily =
        data.daily;


    setText(
        "sunrise",
        formatTime(
            daily.sunrise?.[0]
        )
    );


    setText(
        "sunset",
        formatTime(
            daily.sunset?.[0]
        )
    );


    setText(
        "rainChance",
        `${daily.precipitation_probability_max?.[0] ?? 0}%`
    );


    let visibility =
        "--";


    if (
        Array.isArray(
            data.hourly?.time
        ) &&
        Array.isArray(
            data.hourly?.visibility
        )
    ) {

        const currentTime =
            data.current?.time
                ? new Date(
                    data.current.time
                ).getTime()
                : Date.now();


        let closestIndex =
            -1;

        let smallestDifference =
            Infinity;


        for (
            let i = 0;
            i < data.hourly.time.length;
            i++
        ) {

            const value =
                data.hourly.visibility[i];

            if (
                value === null ||
                value === undefined
            ) {
                continue;
            }


            const hourTime =
                new Date(
                    data.hourly.time[i]
                ).getTime();


            const difference =
                Math.abs(
                    hourTime -
                    currentTime
                );


            if (
                difference <
                smallestDifference
            ) {

                smallestDifference =
                    difference;

                closestIndex =
                    i;
            }
        }


        if (
            closestIndex >= 0
        ) {

            visibility =
                `${(
                    Number(
                        data.hourly.visibility[
                            closestIndex
                        ]
                    ) / 1000
                ).toFixed(1)} km`;
        }
    }


    setText(
        "visibility",
        visibility
    );
}


/* =========================================================
   5 DAY FORECAST
========================================================= */

function displayForecast(data) {

    const grid =
        $("forecastGrid");

    if (
        !grid ||
        !data.daily
    ) {
        return;
    }


    const daily =
        data.daily;


    grid.innerHTML =
        "";


    const days =
        Math.min(
            5,
            daily.time?.length || 0
        );


    for (
        let i = 0;
        i < days;
        i++
    ) {

        const [
            condition,
            icon
        ] =
            weatherInfo(
                daily.weather_code?.[i],
                1
            );


        const card =
            document.createElement(
                "div"
            );

        card.className =
            "forecast-card";


        const maxTemp =
            Number(
                daily.temperature_2m_max?.[i]
            );

        const minTemp =
            Number(
                daily.temperature_2m_min?.[i]
            );


        card.innerHTML = `
            <div class="forecast-day">
                ${
                    i === 0
                        ? "Today"
                        : escapeHTML(
                            formatDay(
                                daily.time?.[i]
                            )
                        )
                }
            </div>

            <div class="forecast-icon">
                ${icon}
            </div>

            <div class="forecast-condition">
                ${escapeHTML(condition)}
            </div>

            <div class="forecast-temp">
                <strong>
                    ${
                        Number.isFinite(maxTemp)
                            ? Math.round(maxTemp) + "°"
                            : "--"
                    }
                </strong>

                <span>
                    ${
                        Number.isFinite(minTemp)
                            ? Math.round(minTemp) + "°"
                            : "--"
                    }
                </span>
            </div>
        `;


        grid.appendChild(card);
    }
}


/* =========================================================
   GPS
========================================================= */

async function useMyLocation() {

    const button =
        $("locationBtn");


    if (!navigator.geolocation) {

        alert(
            "GPS is not supported by this browser."
        );

        return;
    }


    if (button) {

        button.disabled = true;

        button.textContent =
            "📍 Getting location...";
    }


    navigator.geolocation.getCurrentPosition(

        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            try {

                const url =
                    `${NOMINATIM_API}` +
                    `?lat=${latitude}` +
                    `&lon=${longitude}` +
                    `&format=jsonv2` +
                    `&addressdetails=1` +
                    `&zoom=18` +
                    `&accept-language=en`;


                const response =
                    await fetch(
                        url,
                        {
                            cache: "no-store",
                            headers: {
                                Accept:
                                    "application/json"
                            }
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        "Reverse geocoding failed"
                    );
                }


                const data =
                    await response.json();

                const address =
                    data.address || {};


                const localName =
                    address.village ||
                    address.town ||
                    address.city ||
                    address.hamlet ||
                    address.suburb ||
                    address.neighbourhood ||
                    address.locality ||
                    address.city_district ||
                    "Your Location";


                const district =
                    address.state_district ||
                    address.district ||
                    address.county ||
                    address.municipality ||
                    "--";


                const state =
                    address.state ||
                    "--";


                const postcode =
                    address.postcode ||
                    "--";


                await loadLocation({

                    name:
                        localName,

                    district:
                        district,

                    state:
                        state,

                    postcode:
                        postcode,

                    latitude:
                        latitude,

                    longitude:
                        longitude
                });


            } catch (error) {

                console.warn(
                    "GPS reverse geocoding failed:",
                    error
                );


                await loadLocation({

                    name:
                        "Your Location",

                    district:
                        "--",

                    state:
                        "--",

                    postcode:
                        "--",

                    latitude:
                        latitude,

                    longitude:
                        longitude
                });
            }


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "📍 Use My Location";
            }
        },


        error => {

            console.error(
                "GPS Error:",
                error
            );


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "📍 Use My Location";
            }


            if (error.code === 1) {

                alert(
                    "📍 Location permission was denied.\n\n" +
                    "Chrome me address bar ke left side 🔒 icon par click karo → " +
                    "Location → Allow → page reload karo."
                );

            } else if (error.code === 2) {

                alert(
                    "📍 GPS location is unavailable.\n\n" +
                    "Please turn ON Windows Location Services and try again."
                );

            } else if (error.code === 3) {

                alert(
                    "📍 GPS request timed out.\n\n" +
                    "Please wait a few seconds and try again."
                );

            } else {

                alert(
                    "📍 Unable to get your location.\n\n" +
                    "Please check browser location permission."
                );
            }
        },


        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 60000
        }
    );
}


/* =========================================================
   SOLID UI CARDS
========================================================= */

function installFinalSkyStyles() {

    if ($("skycast-final-sky-style")) return;

    const style =
        document.createElement("style");

    style.id =
        "skycast-final-sky-style";

    style.textContent = `

        .search-box,
        .location-btn,
        .current-weather,
        .overview-card,
        .forecast-card {

            background:
                #111c2e !important;

            opacity:
                1 !important;

            backdrop-filter:
                none !important;

            -webkit-backdrop-filter:
                none !important;
        }

        #searchBtn {

            background:
                #16263d !important;

            opacity:
                1 !important;

            backdrop-filter:
                none !important;

            -webkit-backdrop-filter:
                none !important;
        }

        body.sky-season-summer
        .skycast-sky {

            filter:
                saturate(1.08)
                brightness(1.05);
        }

        body.sky-season-monsoon
        .skycast-sky {

            filter:
                saturate(.92)
                brightness(.94);
        }

        body.sky-season-autumn
        .skycast-sky {

            filter:
                saturate(1.02)
                brightness(1.01);
        }

        body.sky-season-winter
        .skycast-sky {

            filter:
                saturate(.88)
                brightness(1.02);
        }

        body.sky-season-summer
        .skycast-weather-scene::after,
        body.sky-season-monsoon
        .skycast-weather-scene::after,
        body.sky-season-autumn
        .skycast-weather-scene::after,
        body.sky-season-winter
        .skycast-weather-scene::after {

            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        body.sky-season-summer
        .skycast-weather-scene::after {

            background:
                linear-gradient(
                    180deg,
                    rgba(70,170,235,.08),
                    rgba(120,205,245,.02),
                    transparent 65%
                );
        }

        body.sky-season-monsoon
        .skycast-weather-scene::after {

            background:
                linear-gradient(
                    180deg,
                    rgba(80,125,150,.10),
                    rgba(90,130,150,.04),
                    transparent 70%
                );
        }

        body.sky-season-autumn
        .skycast-weather-scene::after {

            background:
                linear-gradient(
                    180deg,
                    rgba(70,155,215,.06),
                    transparent 65%
                );
        }

        body.sky-season-winter
        .skycast-weather-scene::after {

            background:
                linear-gradient(
                    180deg,
                    rgba(190,220,235,.08),
                    transparent 70%
                );
        }

        .skycast-weather-scene {
            z-index: 0 !important;
        }

        header,
        main,
        footer {
            position: relative;
            z-index: 10 !important;
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   SEASON
========================================================= */

function updateSeasonBackground() {

    const month =
        new Date().getMonth() + 1;

    document.body.classList.remove(
        "sky-season-summer",
        "sky-season-monsoon",
        "sky-season-autumn",
        "sky-season-winter"
    );

    if (month >= 3 && month <= 5) {

        document.body.classList.add(
            "sky-season-summer"
        );

    } else if (month >= 6 && month <= 9) {

        document.body.classList.add(
            "sky-season-monsoon"
        );

    } else if (month >= 10 && month <= 11) {

        document.body.classList.add(
            "sky-season-autumn"
        );

    } else {

        document.body.classList.add(
            "sky-season-winter"
        );
    }
}


/* =========================================================
   AUTO REFRESH - 10 MINUTES
========================================================= */

function startAutoWeatherRefresh() {

    if (weatherRefreshTimer) {

        clearInterval(
            weatherRefreshTimer
        );
    }


    weatherRefreshTimer =
        setInterval(
            () => {

                if (
                    currentLocation &&
                    Number.isFinite(
                        Number(
                            currentLocation.latitude
                        )
                    ) &&
                    Number.isFinite(
                        Number(
                            currentLocation.longitude
                        )
                    )
                ) {

                    console.log(
                        "🔄 SkyCast automatic weather refresh"
                    );


                    loadWeather(
                        currentLocation.latitude,
                        currentLocation.longitude
                    );
                }

            },
            10 * 60 * 1000
        );
}


/* =========================================================
   REFRESH WHEN TAB RETURNS
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState !==
            "visible"
        ) {
            return;
        }


        if (
            currentLocation &&
            Number.isFinite(
                Number(
                    currentLocation.latitude
                )
            ) &&
            Number.isFinite(
                Number(
                    currentLocation.longitude
                )
            )
        ) {

            console.log(
                "👁️ SkyCast: page visible → weather refresh"
            );


            loadWeather(
                currentLocation.latitude,
                currentLocation.longitude
            );
        }
    }
);


/* =========================================================
   SEARCH BUTTON
========================================================= */

const searchBtn =
    $("searchBtn");

const cityInput =
    $("cityInput");

const locationBtn =
    $("locationBtn");


if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        () => {

            searchLocation(
                cityInput
                    ? cityInput.value
                    : ""
            );
        }
    );
}


if (cityInput) {

    cityInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                searchLocation(
                    cityInput.value
                );
            }
        }
    );
}


if (locationBtn) {

    locationBtn.addEventListener(
        "click",
        useMyLocation
    );
}


/* =========================================================
   CLOSE SEARCH RESULTS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const box =
            $("searchResults");

        const input =
            $("cityInput");

        const button =
            $("searchBtn");


        if (!box) return;


        if (
            event.target !== input &&
            event.target !== button &&
            !box.contains(event.target)
        ) {

            box.style.display =
                "none";
        }
    }
);


/* =========================================================
   START SKYCAST
========================================================= */

installWeatherBackgroundStyles();

createWeatherLayers();

installFinalSkyStyles();

updateSeasonBackground();

loadLocation(
    currentLocation
);

startAutoWeatherRefresh();


console.log(
    "===================================="
);

console.log(
    "✅ SKYCAST WEATHER SYSTEM: ON"
);

console.log(
    "🔎 UNIVERSAL AREA SEARCH: ON"
);

console.log(
    "📍 CITY / VILLAGE / LOCALITY: ON"
);

console.log(
    "📮 PIN SEARCH: ON"
);

console.log(
    "🌤️ WEATHER-BASED SKY: ON"
);

console.log(
    "🌙 DAY / NIGHT: ON"
);

console.log(
    "📡 FRESH WEATHER: ON"
);

console.log(
    "🔄 AUTO REFRESH: 10 MINUTES"
);

console.log(
    "===================================="
);