var ws = require('nodejs-websocket');
var Rx = require('@reactivex/rxjs');
var Kinect2 = require('kinect2');

var kinect = new Kinect2();

var commandHost = 'ws://10.140.171.242:8001';
var NAME = 'kinect';
var depthArraySubject = new Rx.BehaviorSubject(undefined);

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
        connection.sendText(JSON.stringify({'dev': NAME, 'depth': depthArray})); 
    });

    kinect.on('bodyFrame', function(bodyFrame){
        connection.sendText(JSON.stringify({'dev': NAME, 'command': 'detected'})); 
    });

    //request Depth and Body frames
    kinect.openDepthReader();
    kinect.openBodyReader();

    var connection = ws.connect(commandHost);
    connection.on('error', function (err) {
        console.error(err);
    });

    connection.on('text', function (str) {
        const message = JSON.parse(str);
        if (!message || !message.command) {
            console.error("Recieved invalid message");
        } else if (message.command == 'trajectory') {
        }
    });

    connection.on('connect', function () {
        console.log('connected to command server');
        connection.sendText(JSON.stringify({'dev': NAME}));
    });
} else {
    console.error("Failed to open kinect");
}

function getFrame() {
    return depthArraySubject.asObservable().filter(function(dataFrame) {
        return dataFrame !== undefined;
    }).first();
}
