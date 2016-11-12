// following code is from:
// http://www.webondevices.com/get-started-with-xbox-kinect-2-javascript-development/

var Kinect2 = require('kinect2');
var kinect = new Kinect2();
var fs = require('fs');

{
    if(kinect.open()) 
    {
        console.log("Kinect Opened");
        //listen for body frames
        kinect.on('depthFrame', function(depthFrame)
        {
            fs.writeFile('out.jpg', depthFrame, function(error) {
                console.error(error);
            });
            kinect.close();
            process.exit();
        });

        //request body frames
        kinect.openDepthReader();

        //close the kinect after 5 seconds
        setTimeout(function(){
            kinect.close();
            console.log("Kinect Closed");
        }, 60000);
    }
}