// following code is from:
// http://www.webondevices.com/get-started-with-xbox-kinect-2-javascript-development/

// modify so that the method runs when it 
// recieves a request from the web socket
var Kinect2 = require('kinect2');
var kinect = new Kinect2();
var fs = require('fs');
var _ = require('lodash');

var file_name = 'depth_data.json';
var file = fs.createWriteStream(file_name);

var file_name2 = 'depth_sum_data.json';
var file2 = fs.createWriteStream(file_name2);


{
    if(kinect.open()) 
    {
        console.log("Kinect Opened");
        //listen for body frames
        kinect.on('depthFrame', function(depthFrame)
        {

            bufferJson = depthFrame.toJSON();
            bufferString = JSON.stringify(bufferJson);
            
            bufferArray = JSON.parse(bufferString);
            depthArray = [];
            //console.log(bufferString);
            while (bufferArray.data.length) {
                depthArray.push(bufferArray.data.splice(0,512));
            }
            obj = {data: depthArray};

            // var rowSums = [];
            // depthArray.forEach( function(row) {
            //     var rowSum = _.reduce(row, function(sum, n) {
            //         return sum + n;
            //     }, 0)
            //     rowSums.push(rowSum);
            // });
            // file.write(rowSums.join('\t'));

            // var out = [];
            // depthArray.forEach( function(row) {
            //     out.push('[' + row.join(',') + ']');
            // });
            // var outjson = '{ "data": [' + out.join(',') + ']}';
            // file.write(outjson);
            
            trajChange = calcPath(depthArray, 256);
            console.log(trajChange);
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

function calcPath(depthArry, objective){
  depthSum = [];
  depthFrame = depthArry;
  obj = objective;
  const MAX = depthFrame.length;
  const MIDDLE = MAX/2;

  var trajectory = obj;
  var leftIterator = obj;
  var rightIterator = obj;
  
  if(obj<=0 || obj>=MAX){
      return obj - MIDDLE;
  }

  for(row of depthFrame) {
      for(var i = 0; i < row.length; i++){
          if(row[i] == 0){
              depthSum[i] = 0;
          }
          else depthSum[i] = MAX - row
      }
  }

    // var out = [];
    
    // var outjson = '{ "data": [' + depthSum.join(',') + ']}';
    // file2.write(outjson);
console.log(depthSum[trajectory]);
  while(leftIterator >=0 && rightIterator <= depthFrame[0].length){
      if(depthSum[leftIterator]<=depthSum[trajectory]){
          trajectory = leftIterator;
      }
      if(depthSum[rightIterator]<=depthSum[trajectory]){
          trajectory = rightIterator;
      }
      if(depthSum[trajectory] == 0){
          break;
      }
      leftIterator--;
      rightIterator++;
  }
  return trajectory-MIDDLE;
}
