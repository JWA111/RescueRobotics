var ws = require('nodejs-websocket');
var gpio = require('onoff');

// Relay inputs
const IN1 = 26;
const IN2 = 19; 
const IN3 = 6;
const IN4 = 13;

const forwardTime = 240;
const turnTime = [0, 160, 200, 260, 320];
const turningLimit = 4;
const movementDelay = 600;
const readyDelay = 2000;

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
    } else if (message.command === 'navigation' || message.command === 'reorientation') {
        const reorient = (message.command === 'reorientation');
        if (!message.hasOwnProperty('direction') || !message.hasOwnProperty('iterations')) {
            console.error("Missing navigation parameters", message);
            signalReady();
        } else if (message.direction === 'right') {
            right(message.iterations, reorient);
        } else if (message.direction === 'left') {
            left(message.iterations, reorient);
        } else if (message.direction === 'forward') {
            forward(message.iterations);
        }
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
    setTimeout(function() {
        connection.sendText(JSON.stringify({'dev': NAME, 'command': 'ready'}));
    }, readyDelay);
}

function driveWheels(wheel1, wheel2, duration, finisher) {
    setTimeout(function() {
        wheel1.write(1, function() {
            setTimeout(function() {
                wheel1.write(0, function() {});
            }, duration);
        });
    }, 0);
    setTimeout(function() {
        wheel2.write(1, function() {
            setTimeout(function() {
                wheel2.write(0, function() {
                    finisher();
                });
            }, duration);
        });
    }, 0);
}

function forward(count) {
    if (count && count > 1) {
        driveWheels(leftFWD, rightFWD, forwardTime, function() {
            setTimeout(function() {
                forward(count-1);
            }, movementDelay);
        });
    } else {
        driveWheels(leftFWD, rightFWD, forwardTime, signalReady);
    }
}

function left(count, reorient) {
    var duration = turnTime[count];
    if (count > turningLimit) {
        duration = turnTime[turningLimit];
        driveWheels(leftBWD, rightFWD, duration, function() {
            setTimeout(function() {
                left(count-turningLimit, reorient);
            }, movementDelay);
        });
    } else if (reorient) {
        driveWheels(leftBWD, rightFWD, duration, signalReady);
    } else {
        driveWheels(leftBWD, rightFWD, duration, function() {
            setTimeout(function() {
                forward();
            }, movementDelay);
        });
    }
}

function right(count, reorient) {
    var duration = turnTime[count];
    if (count > turningLimit) {
        duration = turnTime[turningLimit];
       driveWheels(rightBWD, leftFWD, duration, function() {
            setTimeout(function() {
                right(count-turningLimit, reorient);
            }, movementDelay);
        });
    } else if (reorient) {
        driveWheels(rightBWD, leftFWD, duration, signalReady);
    } else {
        driveWheels(rightBWD, leftFWD, duration, function() {
            setTimeout(function() {
                forward();
            }, movementDelay);
        });
    }
}
