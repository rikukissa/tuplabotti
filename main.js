const keys = require('./config');
const bb = require('bot-brother');
const axios = require('axios');
const interval = require('interval-promise')

// Create bot object
bot = bb({
    key: keys.telegram,
    sessionManager: bb.sessionManager.memory(),
    polling: { interval: 0, timeout: 1 }
});

// List of supported currencies throughout the app
supportedCurrencies = ['USD', 'EUR', 'GBP'];
supportedCryptos = ['BTC', 'ETH', 'BCH'];
supportedAll = supportedCurrencies.concat(supportedCryptos);

// Build API url
apiUrl =    'https://min-api.cryptocompare.com/data/pricemulti?fsyms=' + 
            supportedAll.join(',') +
            '&tsyms=' +
            supportedAll.join(',');

// Default message options
messageOptions = {parse_mode: 'Markdown', disable_notification: true, reply_markup: {}};

// Check notifications every 3 seconds
// TODO: Change to greater interval, load notifications from file?
notifications = {};

interval(async () => {
    await checkNotifications()
}, 1000 * 3)


/*
* Returns help text
**/
function getHelpText(command) {
    if (command == 'help') {
        return  '*Commands*' + 
                '```\n/help [command]\n' + 
                '/crypto\n' +
                '/notify```';
    }

    if (command === 'crypto') {
        return  '*Usage:*\n' +
                '/crypto <amount> <from> to <to>\n' +
                '/crypto'

    }

    if (command === 'notify') {
        return  '*Usage:*\n' + 
                '/notify <comparator><amount> <currency>\n' +
                '/notify clear\n' + 
                '/notify\n\n' +
                '*Example:* /notify btc >150 eur\n\n' +
                getNotifications();
    }

    return false;
}

function isNumber(num) {
    return !isNaN(num);
}

/*
* Creates listeners for commands
**/

/* bot.command('debug')
.invoke(function (ctx) {
    console.log(ctx.message.chat.id);
}); */

// Show help
bot.command('help')
.invoke(function (ctx) {
    const args = ctx.command.args;

    if (args.length === 0) {
        ctx.sendMessage(getHelpText('help'), messageOptions);
    }
    if (args.length == 1) {
        const text = getHelpText(args[0]);

        if (text) {
            ctx.sendMessage(text, messageOptions);
        } else {
            ctx.sendMessage('`Command not found`', messageOptions);
        }
    }
});

/*
* Crypto command
*/
bot.command('crypto')
.invoke(function (ctx) {
    axios.get(apiUrl)
    .then(function (response) {
        const args = ctx.command.args;
        const data = response.data;
        
        // No arguments
        if (args.length === 0) {
            let result = '';

            supportedCryptos.forEach(crypto => {
                const usd = (data[crypto]['USD']);
                const eur = (data[crypto]['EUR']);

                result += `*1 ${crypto}* to *USD*: \`${usd}\`\n`
                result += `*1 ${crypto}* to *EUR*: \`${eur}\``

                result += '\n\n';
            });

            result.slice(0, -2);
            result += '';

            ctx.sendMessage(result, messageOptions);
        }

        // Example: 1 btc to eur
        if (args.length === 4) {
            if (isNumber(args[0]) && supportedAll.includes(args[1].toUpperCase()) &&
                args[2] === "to"  && supportedAll.includes(args[3].toUpperCase())) {
                
                const fromAmount = args[0];
                const fromCurrency = args[1].toUpperCase();
                const toCurrency = args[3].toUpperCase();

                let result = `*${fromAmount} ${fromCurrency}* to *${toCurrency}*: ` +
                             `\`${fromAmount * data[fromCurrency][toCurrency]}\``;

                ctx.sendMessage(result, messageOptions);
            } else {
              // TODO: Show help for this command  
            }
        }
    })
    .catch(function (error) {
        console.log(error);
    });
});

/*
* Notify command
*/
bot.command('notify')
.invoke(function (ctx) {
    axios.get(apiUrl)
    .then(function (response) {
        const args = ctx.command.args;

        // Show list of current notifications
        if (args.length == 0) {
            ctx.sendMessage(getNotifications(), messageOptions);
            
        } else if (args.length == 1) {
            if (args[0] == 'clear') {
                notifications = [];
                ctx.sendMessage("Cleared notifying list!", messageOptions);
            } else {
                ctx.sendMessage(getHelpText('notify'), messageOptions);
            }

        // Example: /notify btc >15000 eur
        } else if(args.length == 3) {
            const crypto = args[0].toUpperCase();
            const comparator = args[1][0];
            const rate = args[1].slice(1); // Slice removes < or > if there's any
            const currency = args[2].toUpperCase();

            // Add new notification if values are valid
            if( ['>', '<'].includes(comparator) &&
                supportedCryptos.includes(crypto) &&
                supportedCurrencies.includes(currency) &&
                isNumber(rate)) {
                
                const chatId = ctx.message.chat.id;
                let notification = [];

                notification.crypto     = crypto;
                notification.comparator = comparator;
                notification.rate       = parseFloat(rate);
                notification.currency   = currency;
                notification.ctx        = ctx;

                // Create chat "group" if it doesn't exist
                if (notifications[chatId] === undefined) {
                    notifications[chatId] = [];
                }

                notifications[chatId].push(notification);

                ctx.sendMessage('Added new notification!\n\n' +
                                getNotifications(chatId), messageOptions);
            } else {
                ctx.sendMessage(getHelpText('notify'), messageOptions);
            }

        } else {
            ctx.sendMessage(getHelpText("notify"), messageOptions);
        }
    })
    .catch(function (error) {
        console.log(error);
    });
});

/*
* Check notifications
*/
function checkNotifications() {
    if (Object.keys(notifications).length > 0) {
        return axios.get(apiUrl)
        .then(function (response) {
            const data = response.data;

            // Loop through each chat
            for (let chatId in notifications) {

                // Loop through each notification
                notifications[chatId].forEach((notification, index, object) => {

                    // Get current rate of crypto
                    const currentRate = data[notification.crypto][notification.currency].toFixed(2);

                    // Check if current rate is over / under the notification rate
                    if (notification.comparator === '>') {
                        if (notification.rate < currentRate) {
                            // Show notification and remove it
                            showNotification(notification, currentRate);
                            object.splice(index, 1);
                        }
                    }
                    
                    else if (notification.comparator === '<') {
                        if (notification.rate > currentRate) {
                            // Show notification and remove it
                            showNotification(notification, currentRate);
                            object.splice(index, 1);
                        }
                    }
                });
            }
        })
        .catch(function (error) {
            console.log(error);
        });
    }
    return Promise.resolve();
}

/*
* Send notification message
*/
function showNotification(notification, currentRate) {
    const overOrUnder = (notification.comparator === ">") ? "over" : "under";

    notification.ctx.sendMessage(
        `*1 ${notification.crypto}* is now ${overOrUnder} *${notification.rate} ${notification.currency}*\n\n` + 
        `*1 ${notification.crypto}:* ${currentRate} ${notification.currency}`,
        messageOptions
    );
}

/*
* Returns a string containing all current notifications
*/
function getNotifications(chatId) {
    let currentlyNotifying = '*Currently notifying when:*\n';

    // No notifications for current chat
    if (notifications[chatId] === undefined) {
        currentlyNotifying += 'Never';
    
    // Chat has notifications
    } else if (notifications[chatId].length > 0) {
        notifications[chatId].forEach(notification => {

            currentlyNotifying +=   notification.crypto + " " +
                                    notification.comparator + notification.rate + " " +
                                    notification.currency + "\n";

        });

        // Remove trailing \n
        currentlyNotifying.slice(0, -1); 
    }

    return currentlyNotifying;
}
