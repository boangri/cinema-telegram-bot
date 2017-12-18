module.exports = {
    logStart() {
        console.log('Bot has been started')
    },
    getChatId(msg) {
        return msg.chat.id
    },
    getItemUuid(s) {
        return s.substr(2,s.length)
    }
};
