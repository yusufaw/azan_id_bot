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

bot.command('jadwal', ctx => {
    console.log(ctx.message.text);

    const currentFormattedDate = moment().tz(currentTimezone[0]).format("yyyy-MM-D");
    const currentFormattedDateWithDay = moment().locale("id").tz(currentTimezone[0]).format("dddd, DD MMMM yyyy");

    axios.get(`https://waktu-sholat.vercel.app/prayer?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`)
        .then(function (response) {
            const currentListTime = response.data.prayers.filter(age => {
                return age.date === currentFormattedDate
            })[0].time;

            const formattedMessage = generateFormattedMessage(currentFormattedDateWithDay, currentListTime)

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

bot.command('pengaturan', ctx => {
    axios.get(`https://waktu-sholat.vercel.app/province`)
        .then(function (response) {
            console.log(response);
            const inKey = response.data.map(province => {
                return [{
                    text: province.name,
                    callback_data: province.id
                }]
            })
            const opts = {
                reply_markup: JSON.stringify({
                    inline_keyboard:inKey
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
    console.log(ctx.callbackQuery);
    // Explicit usage
    // await ctx.telegram.answerCbQuery(ctx.callbackQuery.id);

    // // Using context shortcut
    // await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(ctx)
});

bot.launch()

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

function generateSalahSchedule(key, value) {
    const spaceCount = 8 - key.length
    return key.toProperCase() + new Array(spaceCount + 1).join(' ') + "- " + value
}

function generateFormattedMessage(day, time) {
    var message = "<b>[Waktu Salat Hari Ini]</b>"
    message += `\n<i>${day}</i>\n`
    message += "<code>"

    for (var key in time) {
        if (time.hasOwnProperty(key)) {
            message += `\n${generateSalahSchedule(key, time[key])}`;
        }
    }
    message += "</code>"
    return message;
}