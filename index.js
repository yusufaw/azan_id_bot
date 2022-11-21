const { Telegraf } = require('telegraf');
const axios = require('axios');
const moment = require('moment-timezone');
const { find } = require('geo-tz')
require('dotenv').config();

const bot = new Telegraf(process.env.MBOT_TOKEN)

const currentLocation = {
    latitude: -8.7825214,
    longitude: 115.1838128
}

const currentTimezone = find(currentLocation.latitude, currentLocation.longitude)
const currentFormattedDate = moment().tz(currentTimezone[0]).format("yyyy-MM-DD");
const currentFormattedDateX = moment().locale("id").tz(currentTimezone[0]).format("dddd, DD MMMM yyyy");
console.log(currentFormattedDateX)

bot.command('jadwal', ctx => {
    console.log(ctx.message.text);

    axios.get(`https://waktu-sholat.vercel.app/prayer?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`)
        .then(function (response) {
            const currentDay = response.data.prayers.filter(age => {
                return age.date === currentFormattedDate
            });
            console.log(currentDay);
            var message = `<b>[Waktu Salat Hari Ini]</b>
${currentFormattedDateX}
<code>`

            for (var key in currentDay[0].time) {
                if (currentDay[0].time.hasOwnProperty(key)) {
                    message = message + `
${toSalahSchedule(key, currentDay[0].time[key])}`;
                }
            }
            message = message + "</code>"
            ctx.reply(message, {
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

bot.launch()

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

function toSalahSchedule(key, value) {
    const spaceCount = 8 - key.length
    return key.toProperCase() + new Array(spaceCount + 1).join(' ') + "- " + value
}