
var ws = require('nodejs-websocket');
var os = require('os');

var ifaces = os.networkInterfaces();
var NAME = 'commander';

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
                // TODO calc dt and send to robot;
                var dt = 0;
                console.log('depth', message.depth.length, message.depth[0].length);
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
