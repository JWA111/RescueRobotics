
var ws = require('nodejs-websocket');
var os = require('os');
var math = require('mathjs');

var ifaces = os.networkInterfaces();
var NAME = 'commander';

// degrees per turn
var dpt = 13;

// Forward moving distance cm
var forwardDistance = 25.5;

// Number of forward movements when zone of confidence is clear
var clearForwardMovements = 3;

// Max readable depth in meters
const maxReadableDepth = 4.5;

// Pixels per degree at max distance
const ppd = 7;

// Depth range limit for obstacle avoidance in meters
const obstacleMaxDepth = 1.5;

// Max depth value for obstacle avoidance
var depthLimit = Math.floor(obstacleMaxDepth * 256 / maxReadableDepth);

// Pixels per bin
var ppb = Math.floor(obstacleMaxDepth * ppd / maxReadableDepth);

// Bearing degrees, location coordinates in cm
var objective = {
  'location': math.matrix([[5000], [0]])
};

// Global value storage
var robotReady = false;
var kinected = false;

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

function changeTrajectory(depthFrame) {
  const turns = calcTurning(depthFrame);
  const navigation = navigate(turns);
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

function rotation(degrees) {
  return math.matrix([
    [cos(degrees), -1*sin(degrees)],
    [sin(degrees), cos(degrees)]
  ]);
}

function calcTurning(depthFrame) {
  if (objective.location[0][0] <= 0) {
    const rotation = atan2(location[1][0]/location[0][0]) * 57.3;
    return Math.floor(rotation / dpt);
  }

  bins = [];

  for (var i=0; i<depthFrame.length; i++) {
    const sum = depthFrame[i].reduce(function(s, d) {
      if (d <= depthLimit) {
        s += d;
      }
      return s;
    }, 0);
    const binNumber = Math.floor(i/ppb);
    bins[binNumber] += sum;
  }

  const MIDDLE = Math.floor(bins.length/2);
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
  return trajectory - MIDDLE;
}

function navigate(t) {
  // TODO: Use dt to figure out how many turns are needed
  const turns = abs(t);
  var navigation = {
    'direction': undefined,
    'iterations': turns,
    'mode': 'navigation'
  };
  if (objective.location[0][0] <= 0) {
    navigation.mode = 'reorientation';
  }
  if (t < 0) {
    objective.location = math.multiply(rotation(turn*dpt), objective.location);
    objective.location = math.subtract(objective.location, math.matrix([[forwardDistance],[0]]));
    navigation.direction = 'left';
  } else if (t > 0) {
    objective.location = math.multiply(rotation(360 - turn*dpt), objective.location);
    objective.location = math.subtract(objective.location, math.matrix([[forwardDistance],[0]]));
    navigation.direction = 'right';
  } else {
    objective.location = math.subtract(objective.location, math.matrix([[forwardDistance*clearForwardMovements],[0]]));
    navigation.direction = 'forward';
    navigation.iterations = clearForwardMovements;
  }
  return navigation;
}
