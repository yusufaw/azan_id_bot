const { Telegraf } = require('telegraf');
const axios = require('axios');
const moment = require('moment-timezone');
const { find } = require('geo-tz');
const LocationsService = require('./service/LocationsService.js')
const { performance } = require("perf_hooks");
require('dotenv').config();

const bot = new Telegraf(process.env.MBOT_TOKEN)

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

        axios.get(`https://waktu-sholat.vercel.app/prayer?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`)
            .then(function (response) {
                const currentListTime = response.data.prayers.filter(age => {
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
    axios.get(`https://waktu-sholat.vercel.app/province`)
        .then(function (response) {
            const inKey = response.data.map(province => {
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

bot.on('callback_query', async (ctx) => {
    const chat = ctx.callbackQuery.message.chat;
    if (ctx.callbackQuery.message.text.includes("kabupaten")) {
        axios.get(`https://waktu-sholat.vercel.app/province/${ctx.callbackQuery.data}`)
            .then(function (response) {
                ctx.editMessageText(response.data.name)
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
                    latitude: response.data.coordinate.latitude,
                    longitude: response.data.coordinate.longitude,
                    city: response.data.name
                })
            })
            .catch(function (error) {
                console.log(error);
            })
            .finally(function () {
                // always executed
            });
    } else {
        axios.get(`https://waktu-sholat.vercel.app/province/${ctx.callbackQuery.data}`)
            .then(function (response) {
                const inKey = response.data.cities.map(city => {
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