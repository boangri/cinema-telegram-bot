const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const geolib = require('geolib')
const _ = require('lodash')
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
require('./models/user.model.js')
const Film = mongoose.model('films')
const Cinema = mongoose.model('cinemas')
const User = mongoose.model('users')

//database.films.forEach(f => new Film(f).save().catch(e => console.log(e)))
//database.cinemas.forEach(c => new Cinema(c).save().catch(e => console.log(e)))
const bot = new TelegramBot(config.TOKEN, {
    polling: true
})

//======================================================
bot.on('message', msg => {
    const chatId = helper.getChatId(msg);
    switch (msg.text) {
        case kb.home.films:
            bot.sendMessage(chatId, `Выберите жанр:`, {
                reply_markup: {
                    keyboard: keyboard.films
                }
            })
            break
        case kb.home.favourite:

            break
        case kb.home.cinemas:
            bot.sendMessage(chatId, 'Отправить местоположение', {
                reply_markup: {
                    keyboard: keyboard.cinemas
                }
            })
            break
        case kb.film.action:
            sendFilmsByQuery(chatId, {type: 'action'})
            break
        case kb.film.comedy:
            sendFilmsByQuery(chatId, {type: 'comedy'})
            break
        case kb.film.random:
            sendFilmsByQuery(chatId, {})
            break
        case kb.back:
            bot.sendMessage(chatId, `Что хотите посмотреть?`, {
                reply_markup: {
                    keyboard: keyboard.home
                }
            })
            break
    }
    if (msg.location) {
        console.log(msg.location)
        getCinemasInCoord(chatId, msg.location)
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

bot.onText(/\/c(.+)/, (msg, [source , match]) => {
    const cinemaUuid = helper.getItemUuid(source)
    const chatId = msg.chat.id;
    console.log(source)
    Cinema.findOne({uuid: cinemaUuid}).then(cinema => {

        bot.sendMessage(chatId, `Кинотеатр ${cinema.name}`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: cinema.name,
                            url: cinema.url
                        },
                        {
                            text: 'Показать на карте',
                            callback_data: cinema.uuid
                        }
                    ],
                    [
                        {
                            text: 'Показать фильмы ',
                            callback_data: JSON.stringify(cinema.films)
                        }
                    ]
                ]
            }
        } )
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
        options['reply_markup'] = {
            keyboard: keyboard[kbName]
        }
    }
    bot.sendMessage(chatId, html, options);
}

function getCinemasInCoord(chatId, location) {
    Cinema.find({}).then(cinemas => {
        cinemas.forEach(c => {
            c.distance = geolib.getDistance(location, c.location)/1000
        })
        cinemas = _.sortBy(cinemas, 'distance')
        const html = cinemas.map((c, i) => {
            return `<b>${i + 1}</b> ${c.name}. <em>Расстояние</em> - <strong>${c.distance} км. /c${c.uuid}</strong>`
        }).join('\n')
        sendHTML(chatId, html, 'home')
    })
}