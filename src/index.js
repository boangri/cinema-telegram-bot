const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const config = require('./config');
const helper = require('./helper');
const kb = require('./keyboard-buttons');
const keyboard = require('./keyboard');

helper.logStart()
mongoose.connect(config.DB_URL, {
    useMongoClient: true
}).then(() => console.log('MongoDB connected!'))
    .catch((err) => console.log(err.toString()))

require('./models/film.model')
const Film = mongoose.model('Films')

const bot = new TelegramBot(config.TOKEN, {
    polling: true
})

bot.on('message', msg => {
    const ChatId = helper.getChatId(msg);
    switch (msg.text) {
        case kb.home.films:
            bot.sendMessage(ChatId, `Выберите жанр:`, {
                reply_markup: {
                    keyboard: keyboard.films
                }
            })
            break
        case kb.home.favourite:
            break
        case kb.home.cinemas:
            break
        case kb.back:
            bot.sendMessage(ChatId, `Что хотите посмотреть?`, {
                reply_markup: {
                    keyboard: keyboard.home
                }
            })
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