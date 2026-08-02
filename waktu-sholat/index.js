// Local, file-based reimplementation of the waktu-sholat.vercel.app API,
// ported from https://github.com/renomureza/waktu-sholat (services + utils).
// Data lives in ./data (list.json + <province>/<city>/<year>.json), read on demand.
const path = require("path");
const fs = require("fs/promises");
const { find: findTimeZone } = require("geo-tz");
const { countDistance } = require("./geolocation");

const DATA_DIR = path.join(__dirname, "data");
// list.json is small (~68KB); require() caches it in memory for the process.
const provinces = require("./data/list.json");

const isValidLatitude = (latitude) => latitude >= -90 && latitude <= 90;
const isValidLongitude = (longitude) => longitude >= -180 && longitude <= 180;

// [{ name, id }] — id is the province slug (used as Telegram callback_data).
const getProvinces = async () =>
    provinces.map((province) => ({ name: province.name, id: province.slug }));

// { name, id, cities: [{ name, id }] } — city id is the city slug.
const getProvince = async (provinceSlug) => {
    const province = provinces.find((p) => p.slug === provinceSlug);
    if (!province) return null;

    return {
        name: province.name,
        id: province.slug,
        cities: province.cities.map((city) => ({
            name: city.name,
            id: city.slug,
        })),
    };
};

// { name, coordinate: { latitude, longitude } }.
const getCity = async (provinceSlug, citySlug) => {
    const province = provinces.find((p) => p.slug === provinceSlug);
    if (!province) return null;

    const city = province.cities.find((c) => c.slug === citySlug);
    if (!city) return null;

    return { name: city.name, coordinate: city.coordinate };
};

// Scan every city and return the one closest to the given coordinate.
const findNearestCity = (latitude, longitude) => {
    let nearest = null;
    let minDistance = Infinity;

    for (const province of provinces) {
        for (const city of province.cities) {
            const distance = countDistance(
                latitude,
                longitude,
                city.coordinate.latitude,
                city.coordinate.longitude
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { province, city };
            }
        }
    }

    return nearest;
};

// { prayers: [{ date: "YYYY-M-D", time: {...} }] } for the nearest city's current month.
// Dates are non-zero-padded to match the bot's moment().format("yyyy-M-D") filter.
const getPrayer = async ({
    latitude = -6.170088888888889,
    longitude = 106.83105,
} = {}) => {
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
        throw new Error(
            "Latitude must be >= -90 and <= 90 and longitude must be >= -180 and <= 180"
        );
    }

    const nearest = findNearestCity(latitude, longitude);

    // Resolve the current date in the city's own timezone (same technique as the source repo).
    const [timeZone] = findTimeZone(
        nearest.city.coordinate.latitude,
        nearest.city.coordinate.longitude
    );
    const localDate = new Date().toLocaleString("en", { timeZone });
    const [month, , year] = localDate.split(",")[0].split("/");

    const filePath = path.join(
        DATA_DIR,
        nearest.province.slug,
        nearest.city.slug,
        `${year}.json`
    );
    const cityData = JSON.parse(await fs.readFile(filePath, "utf8"));

    // Source data date is "M/D/YYYY"; convert to non-padded "YYYY-M-D".
    const monthPrefix = `${Number(year)}-${Number(month)}-`;
    const prayers = cityData.times
        .map((entry) => {
            const [m, d, y] = entry.date.split("/");
            return { date: `${y}-${m}-${d}`, time: entry.prayer };
        })
        .filter((p) => p.date.startsWith(monthPrefix));

    return {
        name: nearest.city.name,
        province: nearest.province.name,
        coordinate: nearest.city.coordinate,
        prayers,
    };
};

module.exports = { getProvinces, getProvince, getCity, getPrayer };
