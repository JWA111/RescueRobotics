var ws = require('nodejs-websocket');

var commandHost = 'ws://10.140.171.242:8001';
var connection = ws.connect(commandHost);
var NAME = 'kinect';

connection.on('error', function (err) {
    console.error(err);
});

connection.on('text', function (str) {
    const message = JSON.parse(str);
    if (!message || !message.command) {
        console.error("Recieved invalid message");
    } else if (message.command == 'trajectory') {
        const df = [[1,1,1,1]]; // TODO get df from kinect
        connection.sendText(JSON.stringify({'dev': NAME, 'depth': df}));
    }
});

connection.on('connect', function () {
    console.log('connected to command server');
    connection.sendText(JSON.stringify({'dev': NAME}));
});
