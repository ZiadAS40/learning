// generate-log.js
const fs = require("fs");
const path = require("path");

// Output file path
const filePath = path.join(__dirname, "big-log.txt");

// Number of lines
const TOTAL_LINES = 100_000;

// Some sample words to generate random log content
const words = [
  "server", "connection", "database", "request", "response",
  "timeout", "user", "client", "authentication", "cache",
  "data", "fetch", "update", "delete", "insert", "query"
];

// Helper: get random integer between min and max (inclusive)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: get a random log level with small probability
function getLogLevel() {
  const r = Math.random();
  if (r < 0.02) return "ERROR";   // ~2% chance
  if (r < 0.05) return "WARN";    // ~3% chance
  return null;
}

// Helper: generate a random line
function generateLine() {
  const numWords = randInt(5, 12);
  let line = [];

  // Add words
  for (let i = 0; i < numWords; i++) {
    line.push(words[randInt(0, words.length - 1)]);
  }

  // Maybe insert ERROR or WARN randomly in line
  const level = getLogLevel();
  if (level) {
    const pos = randInt(0, line.length - 1);
    line.splice(pos, 0, level);
  }

  return line.join(" ");
}

// Create write stream
const stream = fs.createWriteStream(filePath, { flags: "w" });

let i = 0;

function write() {
  let ok = true;
  while (i < TOTAL_LINES && ok) {
    const line = generateLine() + "\n";
    i++;
    ok = stream.write(line);
  }
  if (i < TOTAL_LINES) {
    // If the internal buffer is full, wait for 'drain' event
    stream.once("drain", write);
  } else {
    stream.end();
  }
}

write();

stream.on("finish", () => {
  console.log(`Generated ${TOTAL_LINES} lines in ${filePath}`);
});

// run with 'node log_gen'
