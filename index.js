const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.MBOT_TOKEN)

bot.command('jadwal', ctx => {
    console.log(ctx.message.text);
    ctx.reply("helo", {
        parse_mode: "HTML",
        disable_web_page_preview: true,
    })
})

bot.launch()