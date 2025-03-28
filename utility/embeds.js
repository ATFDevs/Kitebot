const {EmbedBuilder} = require("discord.js");

let nonPermittedAction = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Permission denied')
    .setDescription('You are not authorized to perform this action!');

module.exports = {
    nonPermittedAction: nonPermittedAction
}