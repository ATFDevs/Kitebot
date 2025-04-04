const pino = require('pino');
const fs = require('fs');
const path = require("node:path");

const logStream = fs.createWriteStream(path.join(__dirname, 'bot-logs.log'), {flags: 'a'});

const logger = pino({}, pino.transport({
        targets: [
            {
                target: require.resolve('pino-pretty'),
                options: { colorize: true },
                level: "trace"
            },
            {
                target: 'pino/file',
                options: { destination: path.join(__dirname, 'bot-logs.log') },
                level: 'info',
            }
        ]
}));

module.exports = logger;