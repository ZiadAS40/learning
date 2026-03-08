/*
 * making a line counter script using fs.createReadStream
 * counting the total lines and the lines with WARN & ERROR
 * 
 * */

const fs = require('fs');
const readline = require('readline');

const readable = fs.createReadStream('big-log.txt');

let counter = 0;
let warnCounter = 0;
let errorCounter = 0;

// readline.createInterface uses events to track the lines
// readable -> is the readable stream ( the big-log.txt file )

const rl = readline.createInterface({
	input: readable,
	terminal: false
});

rl.on('line', (line) => {
	counter++;
	if (line.includes("WARN")) {
		warnCounter++;
	} else if (line.includes("ERROR")) {
		errorCounter++;
	}
});

rl.on('close', () => {
	console.log(`total lines is ${counter}`);
	console.log(`tolal lines with WARN is ${warnCounter}`);
	console.log(`total lines with ERROR is ${errorCounter}`);
})




