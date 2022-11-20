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

bot.command('jadwal', ctx => {
    console.log(ctx.message.text);

    axios.get(`https://waktu-sholat.vercel.app/prayer?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`)
        .then(function (response) {
            const currentDay = response.data.prayers.filter(age => {
                return age.date === currentFormattedDate
            });
            console.log(currentDay);
            ctx.reply(JSON.stringify(currentDay[0].time), {
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