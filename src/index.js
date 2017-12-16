const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const helper = require('./helper');
const kb = require('./keyboard-buttons');
const keyboard = require('./keyboard');

helper.logStart()

const bot = new TelegramBot(config.TOKEN, {
    polling: true
})

bot.on('message', msg => {
    switch (msg.text) {
        case kb.home.films:
            break
        case kb.home.favourite:
            break
        case kb.home.cinemas:
            break
    }
})

bot.onText(/\/start/, msg => {
    const greeting = `Здравствуйте ${msg.from.first_name}\nВыберите команду из списка:`
    bot.sendMessage(helper.getChatId(msg), greeting, {
        reply_markup: {
            keyboard:  keyboard.home
        }
    })
})