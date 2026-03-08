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

let asyncCounter = 0;
let asyncWarnCounter = 0;
let asyncErrorCounter = 0;

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

// the BONUS point, refactor the event-based code to [ for await ... of ] syntax

(async () => {
	for await (const line of rl) {
		asyncCounter++;
		if (line.includes("WARN")) {
			asyncWarnCounter++;
		} else if (line.includes("ERROR")) {
			asyncErrorCounter++;
		}


	}
}) ();


rl.on('close', () => {
	console.log(`total lines is ${counter}`);
	console.log(`tolal lines with WARN is ${warnCounter}`);
	console.log(`total lines with ERROR is ${errorCounter}`);
})

rl.on('close', () => {
	console.log(`*async version* total lines is ${asyncCounter}`);
	console.log(`*async version* tolal lines with WARN is ${asyncWarnCounter}`);
	console.log(`*async version* total lines with ERROR is ${asyncErrorCounter}`);
})




