const mongoose = require('mongoose')
const Schema = mongoose.Schema
const UserSchema = new Schema({
    telegramid: {
        type: Number,
        required: true
    },
    films: {
        type: [String],
        default: []
    }
},{
    usePushEach: true
})

mongoose.model('users', UserSchema)