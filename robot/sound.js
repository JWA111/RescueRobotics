var gpio = require('onoff');

// Sound output
const SOUND_OUT = 21;
const CL = [0, 131, 147, 165, 175, 196, 211, 248]; // Frequency of Low C notes
const CM = [0, 262, 294, 330, 350, 393, 441, 495]; // Frequency of Middle C notes
const CH = [0, 525, 589, 661, 700, 786, 882, 990]; // Frequency of High C notes

const SONG1 = [

];
const BEAT1 = [

]

// Setup pins
var GPIO = require('onoff').Gpio,
    leftFWD = new GPIO(SOUND_OUT, 'low'),