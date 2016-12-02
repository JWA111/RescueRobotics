var fs = require('fs');
var ws = require('nodejs-websocket');
var os = require('os');
var gd = require('node-gd');
var express = require('express')
var app = express();
var path = require("path");

// Init express server for data feed
app.use(express.static(__dirname));
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/data-feed.html'));
});
app.listen(3000, function () {
  console.log('Data Feed on port 3000');
});

var ifaces = os.networkInterfaces();
var NAME = 'commander';

// degrees per turn
const dpt = 5;

// Depth of Field
const dof = 95;

// Number of bins
const totalBins = Math.round(dof / dpt);

// Forward moving distance cm
const forwardDistance = 10;

// Number of forward movements when zone of confidence is clear
const clearForwardMovements = 1;

// Max readable depth in meters
const maxReadableDepth = 4.5;

// Depth range limit for obstacle avoidance in meters
const obstacleMaxDepth = 1;

// Max depth value for obstacle avoidance
const depthLimit = Math.floor(obstacleMaxDepth * 256 / maxReadableDepth);

// Pixels per bin
const ppb = 512 / totalBins;

// Max depth value
const maxDepth = 255;

// Ignore the ceiling
const FRAME_HEIGHT_LIMIT = Math.round(512/3);

// Distance to be considered blocking in meters
const BLOCKING_DISTANCE = .25;

// Value of the blocking distance
const BLOCKING_LIMIT = Math.round(BLOCKING_DISTANCE * 256 / maxReadableDepth);

// Forward movement minimum required distance
const FORWARD_LIMIT = (512)*BLOCKING_LIMIT*ppb;
console.log('forward limit', FORWARD_LIMIT);

// Bearing degrees, location coordinates in cm
var objective = [5000, 0];

// Global value storage
var robotReady = false;
var blocked = false;
var kinected = false;
var dataFeedReady = false;
var imageName;

// Get ip
var ip;
var port = 8001;
Object.keys(ifaces).forEach(function(ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function(iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    } else if (!ip) {
      ip = iface.address;
    }
  });
});

var server = ws.createServer(function(conn) {
  console.log("New connection");
  conn.on("text", function (str) {
    var message = JSON.parse(str);
    if (!message || !message.dev) {
      console.error("Received invalid message");
    } else {
      if (!conn.dev) {
        conn.dev = message.dev;
      }
      if (message.depth) {
        if (robotReady) {
          changeTrajectory(message.depth);
          robotReady = false;
        }
      } else if (message.command) {
        if (message.command === 'ready') {
          if (conn.dev === 'robot') {
            console.log('\nRobot is ready.\n');
            robotReady = true;
          } else if (conn.dev === 'kinect') {
            console.log('Kinect is ready.');
            kinected = true;
          } else if (conn.dev === 'feed') {
            dataFeedReady = true;
          }
        } else if (message.command === 'detected') {
          console.log('SURVIVOR FOUND!!!!!!!!!!!!!!!!!!');
        }
      }
    }
  });
  conn.on("close", function (code, reason) {
    console.log(conn.dev, "Connection closed")
  });
  conn.on('error', function (err) {
    console.error(err);
  });
}).listen(port);
console.log('listening on ' + ip + ':' + port);

function changeTrajectory(depthFrame) {
  const df = transposeFrame(depthFrame);
  const trajectory = calcTurning(df);
  console.log('trajectory', trajectory);
  generateImage(depthFrame, trajectory);
  const navigation = navigate(trajectory);
  console.log('Navigation:', navigation);
  var sent = false;
  server.connections.forEach(function(connection) {
    if (connection.dev === 'robot') {
      connection.sendText(JSON.stringify({
        'dev': NAME,
        'command': navigation.mode,
        'direction': navigation.direction,
        'iterations': navigation.iterations
      }));
      sent = true;
    }
  });
  if (!sent) {
    console.error("Cannot find robot");
  }
}

function rotatePoint(point, rotation) {
  return [
    point[0]*Math.cos(rotation)-point[1]*Math.sin(rotation),
    point[1]*Math.cos(rotation)+point[0]*Math.sin(rotation)
  ];
}

function calcTurning(depthFrame) {
  // if (objective[0] < 0) {
  //   const rotation = Math.atan2(objective[1], objective[0]) * 57.3;
  //   return Math.round(rotation / dpt);
  // }

  bins = initBins(depthFrame.length);
  for (var i=0; i<depthFrame.length; i++) {
    const sum = depthFrame[i].reduce(function(s, d, index) {
      if (index >= FRAME_HEIGHT_LIMIT) {
        if (d > depthLimit) {
          s += depthLimit;
        } else {
          s += d;
        }
      }
      return s;
    }, 0);
    const binNumber = Math.round(i/ppb);
    bins[binNumber] += sum;
  }
  bins = smoothBins(bins);
  console.log('bins', bins);

  const MIDDLE = Math.floor(totalBins/2);
  var trajectory = MIDDLE;
  var leftIterator = MIDDLE;
  var rightIterator = MIDDLE;

  while (leftIterator >= 0 && rightIterator < bins.length) {
    if (bins[leftIterator] > bins[trajectory]) {
      trajectory = leftIterator;
    }
    if (bins[rightIterator] > bins[trajectory]) {
      trajectory = rightIterator;
    }
    leftIterator--;
    rightIterator++;
  }

  // Handle dead ends
  if (bins[trajectory] < FORWARD_LIMIT) {
    blocked = true;
    // If blocked, favor turning left as the right has a blind spot
    return 12;
  }

  return trajectory - MIDDLE;
}

function navigate(t) {
  // TODO: Use dt to figure out how many turns are needed
  const turns = Math.abs(t);
  var navigation = {
    'direction': undefined,
    'iterations': turns,
    'mode': 'navigation'
  };
  if (blocked ) { // || objective[0] <= 0) {
    if (blocked) {
      console.log('Path is blocked');
      blocked = false;
    }
    navigation.mode = 'reorientation';
  }
  if (t > 0) {
    objective = rotatePoint(objective, (360-turns*dpt)/57.3);
    if (navigation.mode === 'navigation') {
      objective[0] -= forwardDistance;
    }
    navigation.direction = 'left';
    // Slightly favor left turns to avoid right side blind spot
    navigation.iterations++;
  } else if (t < 0) {
    objective = rotatePoint(objective, turns*dpt/57.3);
    if (navigation.mode === 'navigation') {
      objective[0] -= forwardDistance;
    }
    navigation.direction = 'right';
  } else {
    objective[0] -= forwardDistance*clearForwardMovements;
    navigation.direction = 'forward';
    navigation.iterations = clearForwardMovements;
  }
  console.log('Objective Location: ['+objective[0]+', '+objective[1]+']');
  
  return navigation;
}

function initBins()  {
  var bins = [];
  for(var i = 0; i < totalBins; i++) {
    bins[i] = 0;
  }
  return bins;
}

function transposeFrame(depthFrame) {
  var frame_t = [];
  for (var i=0; i<depthFrame.length; i++) {
    for (var j=0; j<depthFrame[i].length; j++) {
      if (!frame_t[j]) {
        frame_t[j] = [];
      }
      frame_t[j][i] = depthFrame[i][j];
    }
  }
  return frame_t;
}

function generateImage(depthFrame, turns) {
  const turnColumn = Math.round(depthFrame.length * ((turns + 7) / 14));
  gd.createTrueColor(depthFrame[0].length, depthFrame.length, function(error, img) {
      if (error) throw error;

      for (var i=0; i<depthFrame.length; i++) {
          for (var j=0; j<depthFrame[i].length; j++) {
            if (j === turnColumn) {
              img.setPixel(depthFrame[i].length-j-1, i, gd.trueColor(255, 0, 0));
            } else if (j === 255) {
              img.setPixel(depthFrame[i].length-j-1, i, gd.trueColor(0, 255, 0));
            } else {
              const color = Math.round(depthFrame[i][j] * 200/255) + 55;
              if (color > 255) color = 255;
              img.setPixel(depthFrame[i].length-j-1, i, gd.trueColor(color, color, color));
            }
          }
      }
      imageName = 'depth' + new Date().getTime() + '.jpg';
      img.saveJpeg('./images/' + imageName, 100, function(err) {
        if (err) {
            console.error(err);
        } else if (dataFeedReady) {
            server.connections.forEach(function(connection) {
            if (connection.dev === 'feed') {
              connection.sendText(JSON.stringify(imageName));
              sent = true;
            }
          });
        }
        img.destroy();
      });
  });
}

function smoothBins(bins) {
  var newBins = initBins();
  newBins[0] = (bins[0] + bins[1])/2;
  for (var i=1; i<totalBins-1; i++) {
    leftAvg = (bins[i-1] + bins[i])/2;
    rightAvg = (bins[i] + bins[i+1])/2;
    newBins[i] = (leftAvg + rightAvg)/2;
  }
  newBins[totalBins-1] = (bins[totalBins-2] + bins[totalBins-1])/2;

  return newBins;
}
