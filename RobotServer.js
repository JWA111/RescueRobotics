var ws = require('nodejs-websocket');

var commandHost = 'ws://10.140.171.242:8001';
var connection = ws.connect(commandHost);
var NAME = 'robot';

connection.on('error', function (err) {
    console.error(err);
});

connection.on('text', function (str) {
    const message = JSON.parse(str);
    if (!message) {
        console.error("Recieved invalid message");
    } else if (message.hasOwnProperty('dt')) {
        // TODO make trajectory changes
        console.log('dt', message.dt);
        setTimeout(function() {
            connection.sendText(JSON.stringify({'dev': NAME, 'command': 'trajectory'}));
        }, 3000);
    } else {
        console.error("Unknown command received", message);
    }
});

connection.on('connect', function () {
    console.log('connected to command server');
    connection.sendText(JSON.stringify({'dev': NAME, 'command': 'trajectory'}));
});
