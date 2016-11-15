// following code is from:
// http://www.webondevices.com/get-started-with-xbox-kinect-2-javascript-development/

// modify so that the method runs when it 
// recieves a request from the web socket
var Kinect2 = require('kinect2');
var kinect = new Kinect2();

{
    if(kinect.open()) 
    {
        console.log("Kinect Opened");
        //listen for body frames
        kinect.on('depthFrame', function(depthFrame)
        {
            bufferString = JSON.stringify(depthFrame.toJSON());
            console.log(JSON.parse(bufferString));
            kinect.close();
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

{
    
}