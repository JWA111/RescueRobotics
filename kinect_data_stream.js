// following code is from:
// http://www.webondevices.com/get-started-with-xbox-kinect-2-javascript-development/

// modify so that the method runs when it 
// recieves a request from the web socket
var Kinect2 = require('kinect2');
var kinect = new Kinect2();
var jsonfile = require('jsonfile');

var file = 'data-frame.json';
var file2 = 'data2.json';
{
    if(kinect.open()) 
    {
        console.log("Kinect Opened");
        //listen for body frames
        kinect.on('depthFrame', function(depthFrame)
        {

            bufferJson = depthFrame.toJSON();

            bufferString = JSON.stringify(bufferJson);

            // TODO Send to command via wss

            bufferArray = JSON.parse(bufferString);

            depthArray = [];
            while (bufferArray.length) {
                depthArray.push(bufferArray.data.splice(0,512));
            }

            jsonfile.writeFile(file, { data: depthArray }, function (err) {
                console.error(err);
            });

            dpthIngData = require(file);

            process.exit();
        });

        //request body frames
        kinect.openDepthReader();
        console.log('Request Depth Frames')
        //close the kinect after 5 seconds
        setTimeout(function(){
            kinect.closeDepthReader();
            kinect.close();
            console.log("Kinect Closed");
        }, 12000);

    }
}
