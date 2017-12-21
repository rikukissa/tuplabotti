const bb = require('bot-brother');
let bot = bb({
    key: process.env.TOKEN,
    sessionManager: bb.sessionManager.memory(),
    polling: { interval: 0, timeout: 1 }
});

const axios = require('axios');

let messageOptions = {parse_mode: 'Markdown', disable_notification: true, reply_markup: {}};

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
            messageOptions
        );
    })
    .catch(function (error) {
        console.log(error);
    });
});

let notifications = [];

bot.command('notify')
.invoke(function (ctx) {
    axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
    .then(function (response) {
        const args = ctx.command.args;

        function showHelp() {
            ctx.sendMessage(
                '*Usage:* /notify <comparator><amount> <currency>\n' +
                '*Example:* /notify >150 eur\n\n' + 
                '*Currently notifying when:*\n' + 
                getNotifications(),
                messageOptions
            );
        }

        if (args.length == 1) {
            if (args[0] == "clear") {
                notifications = [];
            }
        }
        else if(args.length == 2) {
            const comparator = args[0][0];
            const rate = args[0].slice(1); // Slice removes < or > if there's any
            const currency = args[1].toUpperCase();

            // Add new notification if values are valid
            if([">", "<"].includes(comparator) && ["USD", "GBP", "EUR"].includes(currency)) {
                let notification = [];
                notification.comparator = comparator;
                notification.rate     = parseFloat(rate);
                notification.currency   = currency;
                notification.ctx        = ctx;

                notifications.push(notification);
            }

            ctx.sendMessage('*Currently notifying when:*\n' + 
                            getNotifications(), messageOptions);
        } else {
            showHelp();
        }
    })
    .catch(function (error) {
        console.log(error);
    });
});

function getNotifications() {
    // Returns a string containing all current notifications
    let currentlyNotifying;
    
    if (notifications.length > 0) {
        currentlyNotifying = "";

        notifications.forEach(notification => {
            currentlyNotifying +=   notification.comparator +
                                    notification.rate + " " +
                                    notification.currency + "\n";
        });

        // Remove trailing \n
        currentlyNotifying.slice(0, -1); 
    } else {
        currentlyNotifying = "Never";
    }

    return currentlyNotifying;
}

function checkNotifications() {
    axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
    .then(function (response) {
        notifications.forEach((notification, index, object) => {
            const currentRate = response.data.bpi[notification.currency].rate_float.toFixed(2);
            let showNotification = function() {
                let overOrUnder = (notification.comparator == ">") ? "over" : "under";

                notification.ctx.sendMessage(
                    "*1 BTC* is now " + overOrUnder + " *" + notification.rate + " " + notification.currency + "*\n\n" +
                    "*1 BTC:* " + currentRate + " " + notification.currency,
    
                    messageOptions
                );
    
                // Remove from notifications
                object.splice(index, 1);
            };
            
            // Check if current rate is over / under the notification rate
            if (notification.comparator === ">")
                if (notification.rate < currentRate)
                    showNotification();
            
            else if (notification.comparator === "<")
                if (notification.rate > currentRate)
                    showNotification();
        });
    });
}

//setInterval(checkNotifications, 1000 * 60 * 5); // Once every 5 minutes
setInterval(checkNotifications, 1000 * 3); // Once every 5 minutes