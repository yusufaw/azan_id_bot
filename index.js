const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

var moment = require('moment-timezone');
const xxx= moment().tz("Asia/Jakarta").format("yyyy-MM-DD");
console.log(xxx)

const bot = new Telegraf(process.env.MBOT_TOKEN)
// Make a request for a user with a given ID
axios.get("https://waktu-sholat.vercel.app/prayer?latitude=-6.310433333333333&longitude=107.2922944444444")
    .then(function (response) {
        // handle success
        console.log(response.data);
    })
    .catch(function (error) {
        // handle error
        console.log(error);
    })
    .finally(function () {
        // always executed
        var date_time = new Date();
        console.log(date_time)
    });

bot.command('jadwal', ctx => {
    console.log(ctx.message.text);
    ctx.reply("helo", {
        parse_mode: "HTML",
        disable_web_page_preview: true,
    })
})

bot.launch()