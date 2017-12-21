const bb = require('bot-brother');
const axios = require('axios');

// Create bot object
bot = bb({
    key: Process.env.key,
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

// Create listeners for all commands
createCommandListeners();

// Check notifications every 3 seconds
// TODO: Change to greater interval, load notifications from file?
notifications = [];
setInterval(checkNotifications, 1000 * 3);


/*
* Returns help text
**/
function getHelpText(command) {
    if (command === "notify") {
        return  '*Usage:* /notify <comparator><amount> <currency>\n' +
                '*Example:* /notify >150 eur\n\n' + 
                '*Currently notifying when:*\n' + 
                getNotifications();
    }
}

/*
* Creates listeners for commands
* Available commands: btc, notify
**/
function createCommandListeners() {

    // BTC
    bot.command('btc')
    .invoke(function (ctx) {
        axios.get(apiUrl)
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
                if(supportedCurrencies.includes(parsedCurrency)) {
                    currency = parsedCurrency;
                }
            }
    
            // X to BTC
            if(supportedCurrencies.includes(currency)) {
                console.log(currency);
                const truevalue = (value / response.data['BTC'][currency]).toFixed(8);
    
                return ctx.sendMessage(
                    `*${value} ${currency}* to *BTC*: ${truevalue}`,
                    messageOptions
                );
            }
    
            // BTC to X
            const finalusd = (value * response.data['BTC']['USD']).toFixed(2);
            const finaleur = (value * response.data['BTC']['EUR']).toFixed(2);
    
            return ctx.sendMessage(
                `*${value} BTC* to *USD*: ${finalusd}\n` +
                `*${value} BTC* to *EUR*: ${finaleur}\n`,
                messageOptions
            );
        })
        .catch(function (error) {
            console.log(error);
        });
    });

    // Notify
    bot.command('notify')
    .invoke(function (ctx) {
        axios.get(apiUrl)
        .then(function (response) {
            const args = ctx.command.args;
    
            if (args.length == 1) {
                if (args[0] == 'clear') {
                    notifications = [];
                }
            }
            
            else if(args.length == 2) {
                const comparator = args[0][0];
                const rate = args[0].slice(1); // Slice removes < or > if there's any
                const currency = args[1].toUpperCase();
    
                // Add new notification if values are valid
                if(['>', '<'].includes(comparator) && supportedCurrencies.includes(currency)) {
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
                ctx.sendMessage(getHelpText("notify"), messageOptions);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
    });
}

/*
* Check notifications
*/
function checkNotifications() {
    if (notifications.length > 0) {
        axios.get(apiUrl)
        .then(function (response) {
    
            // Loop through each notification
            notifications.forEach((notification, index, object) => {

                // Get current rate of crypto
                const currentRate = response.data["BTC"][notification.currency].toFixed(2);
                
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
        })
        .catch(function (error) {
            console.log(error);
        });
    }
}

/*
* Send notification message
*/
function showNotification(notification, currentRate) {
    const overOrUnder = (notification.comparator === ">") ? "over" : "under";

    notification.ctx.sendMessage(
        `*1 BTC* is now ${overOrUnder} * ${notification.rate} ${notification.currency}\n\n` + 
        `*1 BTC:* ${currentRate} ${notification.currency}`,
        messageOptions
    );
}

/*
* Returns a string containing all current notifications
*/
function getNotifications() {
    let currentlyNotifying;
    
    if (notifications.length > 0) {
        currentlyNotifying = '';

        notifications.forEach(notification => {
            currentlyNotifying += `${notification.comparator + notification.rate} ${notification.currency}\n`;
        });

        // Remove trailing \n
        currentlyNotifying.slice(0, -1); 
    } else {
        currentlyNotifying = 'Never';
    }

    return currentlyNotifying;
}
