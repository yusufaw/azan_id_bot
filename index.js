const { Telegraf } = require('telegraf');
const moment = require('moment-timezone');
const { find } = require('geo-tz');
const cron = require('node-cron');
const LocationsService = require('./service/LocationsService.js')
const waktuSholat = require('./waktu-sholat')
const { performance } = require("perf_hooks");
require('dotenv').config();

const bot = new Telegraf(process.env.MBOT_TOKEN)

// The five obligatory prayers offered as opt-in azan notifications.
const NOTIFY_PRAYERS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
const PRAYER_LABELS = {
    subuh: 'Subuh',
    dzuhur: 'Dzuhur',
    ashar: 'Ashar',
    maghrib: 'Maghrib',
    isya: 'Isya'
};

bot.command('tentang', ctx => {
    ctx.reply("Bot ini masih dalam pengembangan, dukung kami untuk terus mengembangkan bot ini.\nhttps://saweria.co/shellstrop\n\nJika ada saran atau kesulitan silakan hubungi @ucup_aw.\nTerima kasih.", {
        parse_mode: "HTML"
    })
})

bot.command('jadwal', ctx => {
    const start = performance.now();
    LocationsService.getOneLocationByChatId(ctx.update.message.chat.id).then(currentLocation => {
        if (!currentLocation) {
            ctx.reply("Anda belum mengatur lokasi. Silakan masukkan perintah /pengaturan.");
            return;
        }
        const currentTimezone = find(currentLocation.latitude, currentLocation.longitude);

        const currentFormattedDate = moment().tz(currentTimezone[0]).format("yyyy-M-D");
        const currentFormattedDateWithDay = moment().locale("id").tz(currentTimezone[0]).format("dddd, DD MMMM yyyy");

        waktuSholat.getPrayer({ latitude: currentLocation.latitude, longitude: currentLocation.longitude })
            .then(function (result) {
                const currentListTime = result.prayers.filter(age => {
                    return age.date === currentFormattedDate
                })[0].time;

                const formattedMessage = generateFormattedMessage(currentFormattedDateWithDay, currentListTime, currentLocation.city)

                ctx.reply(formattedMessage, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                })
            })
            .catch(function (error) {
                console.log(error);
            })
            .finally(function () {
                // always executed
            });

    })

    const end = performance.now();
    console.log(`jadwal time taken: ${end - start}ms`);
})

bot.command('pengaturan', ctx => {
    waktuSholat.getProvinces()
        .then(function (provinces) {
            const inKey = provinces.map(province => {
                return [{
                    text: province.name,
                    callback_data: province.id
                }]
            })
            const opts = {
                reply_markup: JSON.stringify({
                    inline_keyboard: inKey
                })
            };
            ctx.reply("Silakan pilih provinsi", opts);
        })
        .catch(function (error) {
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
});

bot.command('notifikasi', ctx => {
    LocationsService.getOneLocationByChatId(ctx.update.message.chat.id).then(location => {
        if (!location) {
            ctx.reply("Anda belum mengatur lokasi. Silakan masukkan perintah /pengaturan.");
            return;
        }
        ctx.reply("Pilih waktu salat yang ingin diingatkan. Ketuk untuk mengaktifkan atau menonaktifkan.", {
            reply_markup: JSON.stringify({
                inline_keyboard: buildNotifKeyboard(location)
            })
        });
    });
});

bot.on('callback_query', async (ctx) => {
    const chat = ctx.callbackQuery.message.chat;
    if (ctx.callbackQuery.data === 'notif/save') {
        await ctx.editMessageText('✅ Pengaturan notifikasi berhasil disimpan.');
        await ctx.answerCbQuery('Tersimpan!');
        return;
    }
    if (ctx.callbackQuery.data.startsWith('notif/')) {
        const prayer = ctx.callbackQuery.data.split('/')[1];
        const updated = await LocationsService.toggleNotification(chat.id, prayer);
        if (updated) {
            await ctx.editMessageReplyMarkup({ inline_keyboard: buildNotifKeyboard(updated) });
        }
        await ctx.answerCbQuery();
        return;
    }
    if (ctx.callbackQuery.message.text.includes("kabupaten")) {
        const [provinceSlug, , citySlug] = ctx.callbackQuery.data.split('/')
        waktuSholat.getCity(provinceSlug, citySlug)
            .then(function (city) {
                ctx.editMessageText(city.name)
                var chatName = ""
                if (chat.type == 'private') {
                    if (chat.last_name) {
                        chatName = chat.first_name + " " + chat.last_name
                    } else {
                        chatName = chat.first_name
                    }
                } else {
                    chatName = chat.title
                }
                LocationsService.updateLocation({
                    chat_id: chat.id,
                    chat_name: chatName,
                    latitude: city.coordinate.latitude,
                    longitude: city.coordinate.longitude,
                    city: city.name
                })
            })
            .catch(function (error) {
                console.log(error);
            })
            .finally(function () {
                // always executed
            });
    } else {
        waktuSholat.getProvince(ctx.callbackQuery.data)
            .then(function (province) {
                const inKey = province.cities.map(city => {
                    return [{
                        text: city.name,
                        callback_data: `${ctx.callbackQuery.data}/city/${city.id}`
                    }]
                })
                const opts = {
                    reply_markup: JSON.stringify({
                        inline_keyboard: inKey
                    })
                };
                ctx.editMessageText("Silakan pilih kota atau kabupaten", opts)
            })
            .catch(function (error) {
                console.log(error);
            })
            .finally(function () {
                // always executed
            });

    }

});

bot.launch()

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

function generateSalahSchedule(key, value) {
    const spaceCount = 8 - key.length
    return key.toProperCase() + new Array(spaceCount + 1).join(' ') + "- " + value
}

function generateFormattedMessage(day, time, city) {
    var message = "<b>[Waktu Salat Hari Ini]</b>"
    message += `\n<i>${day}</i>`
    message += `\n<i>${city}</i>\n`
    message += "<code>"

    for (var key in time) {
        if (time.hasOwnProperty(key)) {
            message += `\n${generateSalahSchedule(key, time[key])}`;
        }
    }
    message += "</code>"
    return message;
}

// ---------------------------------------------------------------------------
// Prayer-time (azan) notification scheduler
// ---------------------------------------------------------------------------

const GRACE_MINUTES = 3; // deliver even if a tick is late/skipped, but never fire a stale prayer

// Day-scoped caches so the expensive work runs once per city per day, not per chat per minute.
const tzCache = new Map();       // "lat,lng"      -> IANA timezone (constant per coordinate)
const scheduleCache = new Map(); // "lat,lng|date" -> today's prayer `time` object

const hhmmToMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildNotifKeyboard(location) {
    const rows = NOTIFY_PRAYERS.map((prayer) => {
        const on = location.notifications && location.notifications[prayer];
        return [{
            text: `${on ? '✅' : '⬜'} ${PRAYER_LABELS[prayer]}`,
            callback_data: `notif/${prayer}`
        }];
    });
    rows.push([{ text: '💾 Simpan', callback_data: 'notif/save' }]);
    return rows;
}

function buildAzanMessage(prayer, time, city, dateWithDay) {
    var message = `🕌 <b>Waktu ${PRAYER_LABELS[prayer]} telah tiba</b>`;
    message += `\n<i>${city} — ${time}</i>`;
    message += `\n<i>${dateWithDay}</i>`;
    message += `\n\nSelamat menunaikan salat.`;
    return message;
}

// Rate-limited outbound queue. Telegram caps bots at ~30 msg/s globally, and a whole
// timezone comes due in the same minute — draining at a fixed interval keeps us under it.
const SEND_INTERVAL_MS = 40; // ~25 msg/s
const sendQueue = [];
let draining = false;

function enqueueSend(chatId, message) {
    sendQueue.push({ chatId, message });
    if (!draining) drainSendQueue();
}

async function drainSendQueue() {
    draining = true;
    while (sendQueue.length > 0) {
        const { chatId, message } = sendQueue.shift();
        try {
            await bot.telegram.sendMessage(chatId, message, {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
        } catch (err) {
            // 403 = bot blocked / kicked from group. Log and keep serving everyone else.
            console.error(`notify ${chatId} failed:`, err.description || err.message);
        }
        await sleep(SEND_INTERVAL_MS);
    }
    draining = false;
}

// Today's prayer times for a coordinate, cached per day. getPrayer reads + parses a
// whole-year JSON file, so caching collapses that to once per city per day.
async function getTodaysTimes(location, coordKey, today) {
    const cacheKey = `${coordKey}|${today}`;
    if (scheduleCache.has(cacheKey)) return scheduleCache.get(cacheKey);

    const result = await waktuSholat.getPrayer({
        latitude: location.latitude,
        longitude: location.longitude
    });
    const entry = result.prayers.find((p) => p.date === today);
    const times = entry ? entry.time : null;

    if (scheduleCache.size > 2000) scheduleCache.clear(); // bound growth across days
    scheduleCache.set(cacheKey, times);
    return times;
}

async function notificationTick() {
    let locations;
    try {
        locations = await LocationsService.getActiveLocations();
    } catch (err) {
        console.error('notificationTick: failed to load locations:', err.message);
        return;
    }

    for (const location of locations) {
        try {
            const coordKey = `${location.latitude},${location.longitude}`;
            let tz = tzCache.get(coordKey);
            if (!tz) {
                tz = find(location.latitude, location.longitude)[0];
                tzCache.set(coordKey, tz);
            }

            const now = moment().tz(tz);
            const today = now.format('yyyy-M-D');
            const nowMin = hhmmToMinutes(now.format('HH:mm'));

            const times = await getTodaysTimes(location, coordKey, today);
            if (!times) continue;

            // The dedup ledger is only valid for today; a new day starts empty.
            const alreadySent = location.last_notified_date === today
                ? location.notified_today
                : [];

            const dateWithDay = moment().locale('id').tz(tz).format('dddd, DD MMMM yyyy');

            for (const prayer of NOTIFY_PRAYERS) {
                if (!location.notifications[prayer]) continue;
                if (alreadySent.includes(prayer)) continue;
                if (times[prayer] === undefined) continue;

                const diff = nowMin - hhmmToMinutes(times[prayer]);
                if (diff >= 0 && diff <= GRACE_MINUTES) {
                    enqueueSend(location.chat_id, buildAzanMessage(prayer, times[prayer], location.city, dateWithDay));
                    await LocationsService.markNotified(location.chat_id, today, prayer);
                }
            }
        } catch (err) {
            console.error(`notificationTick: error for chat ${location.chat_id}:`, err.message);
        }
    }
}

// Fire every minute (at second 0). Prayer times are minute-granular.
cron.schedule('* * * * *', notificationTick);