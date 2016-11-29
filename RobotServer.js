var ws = require('nodejs-websocket');
var gpio = require('onoff');

// Relay inputs
const IN1 = 26;
const IN2 = 19; 
const IN3 = 13;
const IN4 = 6;

const forwardTime = 500;
const turnTime = 250;
const turnDelay = 1;

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
    connection.sendText(JSON.stringify({'dev': NAME, 'command': 'ready'}));
}

function driveWheels(wheel1, wheel2, duration, count, finisher) {
    var readyNextManuver = false;
    setTimeout(function() {
        wheel1.write(1, function() {
            setTimeout(function() {
                wheel1.write(0, function() {
                    if (!readyNextManuver) {
                        readyNextManuver = true;
                    } else {
                        if (count > 0) {
                            count--;
                            driveWheels(wheel1, wheel2, duration, count, finisher);
                        } else {
                            finisher();
                        }
                    }
                });
            }, duration);
        });
    }, turnDelay);
    setTimeout(function() {
        wheel2.write(1, function() {
            setTimeout(function() {
                wheel2.write(0, function() {
                    if (!readyNextManuver) {
                        readyNextManuver = true;
                    } else {
                        if (count > 0) {
                            count--;
                            driveWheels(wheel1, wheel2, duration, count, finisher);
                        } else {
                            finisher();
                        }
                    }
                });
            }, duration);
        });
    }, 0);
}

function forward(count) {
    if (!count) {
        count = 1;
    }
    driveWheels(leftFWD, rightFWD, forwardTime, count, signalReady);
}

function left(count, reorient) {
    if (reorient) {
        driveWheels(leftBWD, rightFWD, turnTime, count, signalReady);
    } else {
        driveWheels(leftBWD, rightFWD, turnTime, count, forward);
    }
}

function right(count, reorient) {
    if (reorient) {
        driveWheels(rightBWD, leftFWD, turnTime, count, signalReady);
    } else {
        driveWheels(rightBWD, leftFWD, turnTime, count, forward);
    }
}
