const { Events } = require('discord.js');
const Database = require("../database/mysql");
const {join} = require("node:path");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const Database = require(join(__dirname, `/database/mysql`));

        const dbIp = process.env.MYSQL_DB_IP;
        const dbName = process.env.MYSQL_DB_NAME;
        const dbUsername = process.env.MYSQL_DB_USERNAME;
        const dbPassword = process.env.MYSQL_DB_PASSWORD;

        for (let item in [dbIp, dbName, dbUsername, dbPassword]) {
            if (item === '' || !item) {
                console.error(`Please provide valid entries for MySQL Connection Params.}`)
            }
        }

        let databaseConnection = new Database(dbIp, dbName, dbUsername, dbPassword);
        await databaseConnection.connect();
        console.log(`Ready! Logged into discord as ${client.user.tag}!`);
    }
}