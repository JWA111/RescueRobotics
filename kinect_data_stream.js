// following code is from:
// http://www.webondevices.com/get-started-with-xbox-kinect-2-javascript-development/

// modify so that the method runs when it 
// recieves a request from the web socket
var Kinect2 = require('kinect2');
var kinect = new Kinect2();
var jsonfile = require('jsonfile');

var file = 'data.json';
var file2 = 'data2.json';
{
    if(kinect.open()) 
    {
        console.log("Kinect Opened");
        //listen for body frames
        kinect.on('depthFrame', function(depthFrame)
        {

            bufferJson = depthFrame.toJSON();
            
            jsonfile.writeFile(file,bufferJson, function (err) {
                console.error(err);
            });
            jsonfile.readFile(file, function(err, bufferJson) {
                console.dir(bufferJson);
            });

            bufferString = JSON.stringify(bufferJson);

            jsonfile.writeFile(file2,bufferString, function (err) {
                console.error(err);
            });
            jsonfile.readFile(file, function(err, bufferString) {
                console.dir(bufferSting);
            });
            //bufferString = JSON.stringify(depthFrame.toJSON());

            bufferArray = JSON.parse(bufferString);
            /*array = [];
            for (var i = 0; i < bufferArray.length; ++i) {
                array.push(callback(bufferArray[i]));
            }
            console.log(array);*/
            depthArray = [];
            console.log();
            while (bufferArray.length) {
                depthArray.push(bufferArray.splice(0,512));
            }
            console.log(depthArray);
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