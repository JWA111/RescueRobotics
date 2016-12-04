const spawn = require('child_process').spawn;
var playingSound = false;

function playTune() {
    if (playingSound) {
        return;
    }
    playingSound = true;
    var sound = spawn('python', ['./sound.py']);
    sound.on('close', (code) => {
        playingSound = false;
    });
}

playTune();
playTune();
playTune();
playTune();
playTune();