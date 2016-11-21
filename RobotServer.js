var ws = require('nodejs-websocket');
var gpio = require('onoff');

// Relay inputs
const IN1 = 26;
const IN2 = 19; 
const IN3 = 13;
const IN4 = 6;

// Motion values
const FWD = 10;

// Setup pins
var GPIO = require('onoff').Gpio,
    leftFWD = new GPIO(IN1, 'low'),
    leftBWD = new GPIO(IN2, 'low'),
    rightFWD = new GPIO(IN3, 'low'),
    rightBWD = new GPIO(IN4, 'low');

var commandHost = 'ws://192.168.0.62:8001';
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
        const dt = message.dt;
        if (dt >= -30 && dt <= 30) {
            forward(1);
            console.log('fwd');
        } else if (dt > 30) {
            console.log('right');            
            right(1);
        } else if (dt < -30) {
            console.log('left');
            left(1);
        }
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

// time in seconds
function forward(time) {
    leftFWD.write(1, function() {
        setTimeout(function() {
            leftFWD.write(0, function() {});
        }, 1000 * time/2);
    });
    rightFWD.write(1, function() {
        setTimeout(function() {
            rightFWD.write(0, function() {});
        }, 1000 * time/2);
    });
}

// time in seconds
function reverse(time) {
    leftBWD.write(1, function() {
        setTimeout(function() {
            leftBWD.write(0, function() {});
        }, 1000 * time/2);
    });
    rightBWD.write(1, function() {
        setTimeout(function() {
            rightBWD.write(0, function() {});
        }, 1000 * time/2);
    });
}

function left(time) {
    leftBWD.write(1, function() {
        setTimeout(function() {
            leftBWD.write(0, function() {});
        }, 1000 * time/2);
    });
    rightFWD.write(1, function() {
        setTimeout(function() {
            rightFWD.write(0, function() {});
        }, 1000 * time/2);
    });
}

function right(time) {
    rightBWD.write(1, function() {
        setTimeout(function() {
            rightBWD.write(0, function() {});
        }, 1000 * time/2);
    });
    leftFWD.write(1, function() {
        setTimeout(function() {
            leftFWD.write(0, function() {});
        }, 1000 * time/2);
    });
}
