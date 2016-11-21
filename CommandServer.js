
var ws = require('nodejs-websocket');
var os = require('os');

var ifaces = os.networkInterfaces();
var NAME = 'commander';
var objective = 256;

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
                var sent = false;
                console.log('depth', message.depth.length, message.depth[0].length);
                var dt = calcDT(message.depth);
                server.connections.forEach(function(connection) {
                    if (connection.dev === 'robot') {
                        connection.sendText(JSON.stringify({'dev': NAME, 'dt': dt}));
                        sent = true;
                    }
                });
                if (!sent) {
                    console.error("Cannot find robot");
                }
            } else if (message.command) {
                if (message.command === 'trajectory') {
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
}).listen(port)
console.log('listening on ' + ip + ':' + port);

function calcDT(depthArry){
  depthSum = [];
  depthFrame = depthArry;
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
          if (d !== 0) {
            return s + MAX - d;
          } else {
              return s;
          }
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
  objective = objective - dt;
  console.log(objective);
  return dt;
}
