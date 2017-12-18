const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const config = require('./config');
const helper = require('./helper');
const kb = require('./keyboard-buttons');
const keyboard = require('./keyboard');
const database = require('../database.json')

helper.logStart()
mongoose.Promise = global.Promise
mongoose.connect(config.DB_URL, {
    useMongoClient: true
})
    .then(() => console.log('MongoDB connected!'))
    .catch((err) => console.log(err.toString()))

require('./models/film.model')
require('./models/cinema.model')
const Film = mongoose.model('films')
const Cinema = mongoose.model('cinemas')

//database.films.forEach(f => new Film(f).save().catch(e => console.log(e)))
//database.cinemas.forEach(c => new Cinema(c).save().catch(e => console.log(e)))
const bot = new TelegramBot(config.TOKEN, {
    polling: true
})

//======================================================
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
        case kb.film.action:
            sendFilmsByQuery(ChatId, {type: 'action'})
            break
        case kb.film.comedy:
            sendFilmsByQuery(ChatId, {type: 'comedy'})
            break
        case kb.film.random:
            sendFilmsByQuery(ChatId, {})
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

bot.onText(/\/f(.+)/, (msg, [source, match]) => {
    const filmUuid = helper.getItemUuid(source)
    Film.findOne({uuid: filmUuid}).then(film => {
        const caption = `Название: ${film.name}
Год: ${film.year}
Страна: ${film.country}
Рейтинг: ${film.rate}
Длина: ${film.length}
`
        bot.sendPhoto(msg.chat.id, film.picture, {
            caption: caption,
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: 'Добавить в избранное',
                        callback_data: film.uuid
                    },{
                        text: 'Показать кинотеатры',
                        callback_data: film.uuid
                    }],
                    [{
                        text: 'Найти в этот фильм в кинопоиске',
                        url: film.link
                    }]
                ]
            }
        })
    })
})


//==========================================================
function sendFilmsByQuery(chatId, query) {
    Film.find(query).then((films)=> {
        const html = films.map((f, i) => {
            return `<b>${i+1}</b> ${f.name} - /f${f.uuid}`
        }).join('\n')
        sendHTML(chatId, html, films);
    }).catch((e) => console.log(e.toString()))
}

function sendHTML(chatId, html, kbName = null) {
    options = {
        parse_mode: 'HTML',
    }
    if (kbName) {
        options['reply_markup'] = keyboard[kbName]
    }
    bot.sendMessage(chatId, html, options);
}