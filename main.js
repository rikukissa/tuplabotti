String.prototype.addSpaces = function (length) {
    if(this.length < length) {
        return ' '.repeat(length - this.length) + this;
    }
    return this;
};

const axios = require('axios'); // networking
const bb = require('bot-brother'); // telegram bot

let bot = bb({
  key: '479950408:AAEAnfw7wEkKmQRCCAEWWYdG4qLaGJPMNxo',
  sessionManager: bb.sessionManager.memory(),
  polling: { interval: 0, timeout: 1 }
});

// BTC
bot.command('btc')
.invoke(function (ctx) {
    axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
    .then(function (response) {
        const args = ctx.command.args;

        // Default values
        let value = 1;
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

bot.command('crypto')
.invoke(function (ctx) {
    axios.get('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,BCH&tsyms=USD,EUR')
    .then(function (response) {
        const data = response.data;
        let result = '';

        for (let p in data) {
            if(data.hasOwnProperty(p)) {
                const usd = (data[p].USD + '').addSpaces(9);
                const eur = (data[p].EUR + '').addSpaces(9);
                p = p.addSpaces(4);

                result += '`' + p + '` `' + usd + ' USD` `' + eur + ' EUR`\n';
            } 
        }
        return ctx.sendMessage(result, {
            parse_mode: 'Markdown',
            disable_notification: true,
            reply_markup: { }
        });
    })
    .catch(function (error) {
        console.log(error);
    });
});