var connection;
const NAME = 'feed';
window.addEventListener("load", function () {
    document.getElementById("status").innerHTML = "Connecting to Command Server...";
    document.getElementById("data").innerHTML = "No data received";
    startWSS();
});

function startWSS() {
    connection = new WebSocket("ws://"+window.location.hostname+":8001");
    connection.onopen = function () {
        console.log("Connection opened");
        document.getElementById("status").innerHTML = "Connected to Command Server";
        connection.send(JSON.stringify({'dev': NAME, 'command': 'ready'}));
    }
    connection.onclose = function () {
        document.getElementById("status").innerHTML = "Connecting to Command Server...";
        console.log("Connection closed");
        setTimeout(startWSS, 5000);
    }
    connection.onerror = function () {
        document.getElementById("status").innerHTML = "Connecting to Command Server...";
        console.error("Connection error");
        setTimeout(startWSS, 5000);
    }
    connection.onmessage = function (event) {
        document.getElementById("data").innerHTML = "Data: " + event.data;
        console.log('New image', event.data);
        document.getElementById("feed").src = '/images/' + JSON.parse(event.data);
    }
}
