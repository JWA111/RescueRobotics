
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
                var dt = calcDT(message.depth, objective);
                server.connections.forEach(function(connection) {
                    if (connection.dev === 'robot') {
                        connection.sendText(JSON.stringify({'dev': NAME, 'dt': dt}));
                        sent = true;
                    }
                });
                if (!sent) {
                    console.error("Cannot find robot");
                }
            } else if (message.command && message.command === 'trajectory') {
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

function calcDT(depthArry, objective){
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
