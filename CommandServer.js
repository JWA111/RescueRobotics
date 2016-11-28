
var ws = require('nodejs-websocket');
var os = require('os');
var math = require('mathjs');

var ifaces = os.networkInterfaces();
var NAME = 'commander';
// degrees per turn
var turn = 13;

// Forward moving distance cm
var forwardDistance = 25.5;

// Max readable depth in meters
const maxReadableDepth = 4.5;

// Depth range limit for obstacle avoidance in meters
const obstacleMaxDepth = 1.5;

// Max depth value for obstacle avoidance
var depthLimit = obstacleMaxDepth * 256 / maxReadableDepth;

// Bearing degrees, location coordinates in cm
var objective = {
    'location': math.matrix([[5000], [0]])
};

// Global value storage
var depthFrame;
var robotReady = false;
var kinected = false;

// Get ip
var ip;
var port = 8001;
Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
        } else if (!ip) {
            ip = iface.address
        }
    });
});

var server = ws.createServer(function (conn) {
    console.log("New connection")
    conn.on("text", function (str) {
        var message = JSON.parse(str);
        if (!message || !message.dev) {
            console.error("Received invalid message");
        } else {
            if (!conn.dev) {
                conn.dev = message.dev;
            }
            if (message.depth) {
                depthFrame = message.depth;
            } else if (message.command) {
                if (message.command === 'ready') {
                    if (conn.dev === 'robot') {
                        robotReady = true;
                    } else if (conn.dev === 'kinect') {
                        kinected = true;
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

// main
while (true) {
    if (kinected) {
        getFrame();
        if (robotReady) {
            changeTrajectory();
            robotReady = false;
        }
    }
}

function getFrame() {
    var sent = false;
    server.connections.forEach(function(connection) {
        if (connection.dev === 'kinect') {
            connection.sendText(JSON.stringify({'dev': NAME, 'command': 'trajectory'}));
            sent = true;
        }
    });
    if (!sent) {
        console.error("Cannot find kinect");
    }
}

function changeTrajectory() {
    const dt = calcDT();
    const navigation = navigate(dt);
    var sent = false;
    server.connections.forEach(function(connection) {
        if (connection.dev === 'robot') {
            connection.sendText(JSON.stringify({
                'dev': NAME,
                'command': 'navigate',
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

function rotation(degrees) {
    return math.matrix([
        [cos(degrees), -1*sin(degrees)],
        [sin(degrees), cos(degrees)]
    ]);
}

function calcDT() {
  depthSum = [];
  obj = objective;
  const MAX = depthFrame.length;
  const MIDDLE = MAX/2;

  var trajectory = obj;
  var leftIterator = obj;
  var rightIterator = obj;
  
  if (obj <= 0 || obj >= MAX) {
      const dt = MIDDLE - obj;
      objective = objective - dt;
      return dt;
  }

  for (var i=0; i<depthFrame.length; i++) {
      const sum = depthFrame[i].reduce(function(s, d) {
          if (d !== 0 && d <= depthLimit) {
            s += MAX - d;
          }
         return s;
      }, 0);
      depthSum[i] = sum;
  }

  while (leftIterator >= 0 && rightIterator <= depthSum.length) {
      if (depthSum[leftIterator] < depthSum[trajectory]) {
          trajectory = leftIterator;
      }
      if (depthSum[rightIterator] < depthSum[trajectory]) {
          trajectory = rightIterator;
      }
      leftIterator--;
      rightIterator++;
  }
  const dt = trajectory - MIDDLE;

  return dt;
}

function navigate(dt) {
  // TODO: Use dt to figure out how many turns are needed
  var navigation = {
      'direction': undefined,
      'iterations': undefined
  };
  if (dt < -10) {
      objective.location = math.multiply(rotation(turn), objective.location);
      objective.location = math.subtract(objective.location, math.matrix([[forwardDistance],[0]]));
      navigation.direction = 'left';
  } else if (dt > 10) {
      objective.location = math.multiply(rotation(360 - turn), objective.location);
      objective.location = math.subtract(objective.location, math.matrix([[forwardDistance],[0]]));
      navigation.direction = 'right';
  } else {
      objective.location = math.subtract(objective.location, math.matrix([[forwardDistance],[0]]));
      navigation.direction = 'forward';
  }
  return navigation;
}
