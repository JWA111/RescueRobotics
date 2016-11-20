var ws = require('nodejs-websocket');
var Rx = require('@reactivex/rxjs');
var Kinect2 = require('kinect2');

var kinect = new Kinect2();

var commandHost = 'ws://10.140.171.242:8001';
var NAME = 'kinect';
var depthArraySubject = new Rx.BehaviorSubject([[]]);

if (kinect.open()) {
    console.log("Kinect Opened");
    //listen for body frames
    kinect.on('depthFrame', function(depthFrame) {

        bufferJson = depthFrame.toJSON();
        bufferString = JSON.stringify(bufferJson);
        
        bufferArray = JSON.parse(bufferString);
        depthArray = [];
        while (bufferArray.data.length) {
            depthArray.push(bufferArray.data.splice(0,512));
        }
        depthArraySubject.next(depthArray);
    });

    //request body frames
    kinect.openDepthReader();

    setTimeout(function() {
        var connection = ws.connect(commandHost);
        connection.on('error', function (err) {
            console.error(err);
        });

        connection.on('text', function (str) {
            const message = JSON.parse(str);
            if (!message || !message.command) {
                console.error("Recieved invalid message");
            } else if (message.command == 'trajectory') {
                getFrame().subscribe(function(df) {
                    connection.sendText(JSON.stringify({'dev': NAME, 'depth': df}));
                });
            }
        });

        connection.on('connect', function () {
            console.log('connected to command server');
            connection.sendText(JSON.stringify({'dev': NAME}));
        });
    }, 5000);
} else {
    console.error("Failed to open kinect");
}

function getFrame() {
    return depthArraySubject.asObservable().first();
}
