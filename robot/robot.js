var gpio = require('onoff');

// Relay inputs
const IN1 = 26;
const IN2 = 19; 
const IN3 = 6;
const IN4 = 13;

const forwardTime = 240;
const turnTime = [0, 120, 160, 200, 260];
const turningLimit = 4;

// Setup pins
var GPIO = require('onoff').Gpio,
    leftFWD = new GPIO(IN1, 'low'),
    leftBWD = new GPIO(IN2, 'low'),
    rightFWD = new GPIO(IN3, 'low'),
    rightBWD = new GPIO(IN4, 'low');

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
            }, 800);
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
            }, 800);
        });
    } else if (reorient) {
        driveWheels(leftBWD, rightFWD, duration, signalReady);
    } else {
        driveWheels(leftBWD, rightFWD, duration, forward);
    }
}

function right(count, reorient) {
    var duration = turnTime[count];
    if (count > turningLimit) {
        duration = turnTime[turningLimit];
       driveWheels(rightBWD, leftFWD, duration, function() {
            setTimeout(function() {
                right(count-turningLimit, reorient);
            }, 800);
        });
    } else if (reorient) {
        driveWheels(rightBWD, leftFWD, duration, signalReady);
    } else {
        driveWheels(rightBWD, leftFWD, duration, forward);
    }
}

function signalReady() {
    
}

right(2, true);