const bb = require('bot-brother');
let bot = bb({
  key: process.env.TOKEN,
  sessionManager: bb.sessionManager.memory(),
  polling: { interval: 0, timeout: 1 }
});

const axios = require('axios');

// BTC
bot.command('btc')
.invoke(function (ctx) {
    axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
    .then(function (response) {
        const args = ctx.command.args;

        let value = 1; // defaults
        let currency = 'BTC';

        if(args[0]) {
            const parsedValue = args[0];
            if(parsedValue >= 0 && parsedValue <= 100000000) {
                value = parsedValue;
            }
        }
        if(args[1]) {
            const parsedCurrency = args[1].toUpperCase();
            if(['EUR', 'USD', 'GBP', 'BTC'].includes(parsedCurrency)) {
                currency = parsedCurrency;
            }
        }

        // X to BTC
        if(['EUR', 'USD', 'GBP'].includes(currency)) {
            const truevalue = (value / response.data.bpi[currency].rate_float).toFixed(8);

            return ctx.sendMessage(
                '*' + value + ' ' + currency + '* to *BTC*: `' + truevalue + '`',
                {parse_mode: 'Markdown', disable_notification: true, reply_markup: {}}
            );
        }

        // BTC to X
        const finalusd = (value * response.data.bpi['USD'].rate_float).toFixed(2);
        const finaleur = (value * response.data.bpi['EUR'].rate_float).toFixed(2);

        return ctx.sendMessage(
            '*' + value + ' BTC* to *USD*: `' + finalusd + '`\n' +
            '*' + value + ' BTC* to *EUR*: `' + finaleur + '`', 
            {parse_mode: 'Markdown', disable_notification: true, reply_markup: {}}
        );
    })
    .catch(function (error) {
        console.log(error);
    });
});

// Testings!