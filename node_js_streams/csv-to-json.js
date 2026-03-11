/*
 * Create a Custom Transform Stream that converts CSV row into JSON objects
 * on the fly
 *  
 */

const { Transform, pipeline } = require('stream');
const fs = require('fs');

const readStream = fs.createReadStream('data.csv');
const writeStream = fs.createWriteStream('data.json');

class CsvToJsonTransform extends Transform {
  constructor() {
    super({ readableObjectMode: true });

    this.headers = null;
    this.buffer = "";
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;

      if (!this.headers) {
        this.headers = line.split(',');
        continue;
      }

      const values = line.split(',');
      if (values.length !== this.headers.length) continue;

      const obj = {};

      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });

      this.push(JSON.stringify(obj) + '\n'); // writeStream expects text
    }

    callback();
  }

  _flush(callback) {
    if (this.buffer && this.headers) {
      const values = this.buffer.split(",");
      const obj = {};

      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });

      this.push(JSON.stringify(obj) + '\n');
    }

    callback();
  }
}

pipeline(
  readStream,
  new CsvToJsonTransform(),
  writeStream,
  (err) => {
    if (err) {
      console.error("Pipeline failed:", err);
    } else {
      console.log("Pipeline succeeded");
    }
  }
);