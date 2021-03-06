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

const ACTION_TYPE = {
    TOGGLE_FAV_FILM: 'tff',
    SHOW_CINEMAS: 'sc',
    SHOW_CINEMAS_MAP: 'scm',
    SHOW_FILMS: 'sf'
}
//======================================================

const bot = new TelegramBot(config.TOKEN, {
    polling: true
})

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
            showFavouriteFilms(chatId, msg.from.id)
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
        getCinemasInCoord(chatId, msg.location)
    }
})

bot.on('callback_query', query => {
    const userId = query.from.id
    let data
    try {
        data = JSON.parse(query.data)
    } catch (e) {
        throw new Error('Dat is not an object')
    }
    const {type} = data
    if (type === ACTION_TYPE.SHOW_CINEMAS_MAP) {
        const {lat, lon} = data
        bot.sendLocation(query.message.chat.id, lat, lon)
    } else if (type === ACTION_TYPE.SHOW_CINEMAS) {
        sendCinemasByQuery(userId, {uuid: {'$in': data.cinemaUuids}})
    } else if (type === ACTION_TYPE.TOGGLE_FAV_FILM) {
        toggleFavouriteFilm(userId, query.id, data)
    } else if (type === ACTION_TYPE.SHOW_FILMS) {
        sendFilmsByQuery(userId, {uuid: {'$in': data.filmUuids}})
    }
})

bot.on('inline_query', query => {
    Film.find({}).then(films => {
        const results = films.map(f => {
            const caption = `Название: ${f.name}
Год: ${f.year}
Страна: ${f.country}
Рейтинг: ${f.rate}
Длина: ${f.length}`
            return {
                id: f.uuid,
                type: 'photo',
                photo_url: f.picture,
                thumb_url: f.picture,
                caption: caption,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `Кинопоиск: ${f.name}`,
                                url: f.link
                            }
                        ]
                    ]
                }
            }
        })
        bot.answerInlineQuery(query.id, results, {
            cache_time: 0
        })
    })
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
    const chatId = msg.chat.id
    Promise.all([
        Film.findOne({uuid: filmUuid}),
        User.findOne({telegramid: msg.from.id})
    ]).then(([film, user]) => {
    let isFav = false
    if(user) {
        isFav = user.films.indexOf(film.uuid) !== -1
    }
    const favText = isFav ? 'Удалить из избранного' : 'Добавить в избранное'
    const caption = `Название: ${film.name}
Год: ${film.year}
Страна: ${film.country}
Рейтинг: ${film.rate}
Длина: ${film.length}
`
    bot.sendPhoto(chatId, film.picture, {
            caption: caption,
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: favText,
                        callback_data: JSON.stringify({
                            type: ACTION_TYPE.TOGGLE_FAV_FILM,
                            filmUuid: film.uuid,
                            isFav: isFav
                        })
                    },{
                        text: 'Показать кинотеатры',
                        callback_data: JSON.stringify({
                            type: ACTION_TYPE.SHOW_CINEMAS,
                            cinemaUuids: film.cinemas
                        })
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
                            callback_data: JSON.stringify({
                                type: ACTION_TYPE.SHOW_CINEMAS_MAP,
                                lat: cinema.location.latitude,
                                lon: cinema.location.longitude
                            })
                        }
                    ],
                    [
                        {
                            text: 'Показать фильмы ',
                            callback_data: JSON.stringify({
                                type: ACTION_TYPE.SHOW_FILMS,
                                filmUuids: cinema.films
                            })
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
    const options = {
        parse_mode: 'HTML'
    }
    if (kbName) {
        options['reply_markup'] = {
            keyboard: keyboard[kbName]
        }
    }
    bot.sendMessage(chatId, html, options)
}

function getCinemasInCoord(chatId, location) {
    Cinema.find({}).then(cinemas => {
        cinemas.forEach(c => {
            c.distance = geolib.getDistance(location, c.location)/1000
        })
        cinemas = _.sortBy(cinemas, 'distance')
        const html = cinemas.map((c, i) => {
            return `<b>${i + 1}</b> ${c.name}. <em>Расстояние</em> - <strong>${c.distance}</strong> км. /c${c.uuid}`
        }).join('\n')
        sendHTML(chatId, html, 'home')
    })
}

function toggleFavouriteFilm(userId, queryId, {filmUuid, isFav}) {
    let userPromise
    User.findOne({telegramid: userId})
        .then(user => {
            if (user) {
                if (isFav) {
                    user.films = user.films.filter(fUuid => fUuid !== filmUuid)
                } else {
                    user.films.push(filmUuid)
                }
                userPromise = user
            } else {
                userPromise = new User({
                    telegramid: userId,
                    films: [filmUuid]
                })
            }
            const answerText = isFav ? 'Удален из избранного' : 'Добавлен в избранное'
            userPromise.save().then(_ => {
                bot.answerCallbackQuery({
                    callback_query_id: queryId,
                    text: answerText
                })
            }).catch(err => console.log(1, err))
        }).catch(err => console.log(2, err))
}

function showFavouriteFilms(chatId, userId) {
    User.findOne({telegramid: userId})
        .then(user => {
            let html = 'Вы ничего не добавили'
            if (user) {
                Film.find({uuid: {'$in': user.films}}).then(films => {
                    if (films.length) {
                        html = films.map((f, i) => {
                            return `<b>${i +1}</b> ${f.name} - <b>${f.rate}</b> (/f${f.uuid})`
                        }).join('\n')
                    }
                    sendHTML(chatId, html, 'home')
                }).catch(e => console.log(e))
            } else {
                sendHTML(chatId, html, 'home')
            }
        }).catch(e => console.log(e))
}

function sendCinemasByQuery(userId, query) {
    Cinema.find(query).then(cinemas => {
        const html = cinemas.map((c, i) => {
            return `<b>${i+1}</b> ${c.name} - /c${c.uuid}`
        }).join('\n')
        sendHTML(userId, html, 'home')
    })
}