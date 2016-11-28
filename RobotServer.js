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
    if (!message || !message.hasOwnProperty('command')) {
        console.error("Recieved invalid message");
        signalReady();
    } else if (message.command === 'forward') {
        forward();
    } else if (message.command === 'reverse') {
        reverse();
    } else if (message.command === 'right') {
        right();
    } else if (message.command === 'left') {
        left();
    } else {
        console.error("Unknown command received", message);
        signalReady();
    }
});

connection.on('connect', function () {
    console.log('connected to command server');
    signalReady();
});

function signalReady() {
    connection.sendText(JSON.stringify({'dev': NAME, 'command': 'ready'}));
}

function forward() {
    leftFWD.write(1, function() {
        setTimeout(function() {
            leftFWD.write(0, function() {});
        }, 500);
    });
    rightFWD.write(1, function() {
        setTimeout(function() {
            rightFWD.write(0, function() {
                signalReady();
            });
        }, 500);
    });
}

function reverse() {
    leftBWD.write(1, function() {
        setTimeout(function() {
            leftBWD.write(0, function() {});
        }, 500);
    });
    rightBWD.write(1, function() {
        setTimeout(function() {
            rightBWD.write(0, function() {
                signalReady();
            });
        }, 500);
    });
}

function left() {
    leftBWD.write(1, function() {
        setTimeout(function() {
            leftBWD.write(0, function() {});
        }, 250);
    });
    rightFWD.write(1, function() {
        setTimeout(function() {
            rightFWD.write(0, function() {
                signalReady();
            });
        }, 250);
    });
}

function right() {
    rightBWD.write(1, function() {
        setTimeout(function() {
            rightBWD.write(0, function() {});
        }, 250);
    });
    leftFWD.write(1, function() {
        setTimeout(function() {
            leftFWD.write(0, function() {
                signalReady();
            });
        }, 250);
    });
}
