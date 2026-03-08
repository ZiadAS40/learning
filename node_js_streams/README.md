# Node.js Streams - My Study Notes

> Sources: [Node.js Streams API docs](https://nodejs.org/api/stream.html) | [Stream Handbook by substack](https://github.com/substack/stream-handbook) | Async Iterators with Streams

---

## What is a Stream?

A stream is a way to handle data **piece by piece** instead of loading everything into memory at once.

Think of it like drinking water from a bottle vs. a firehose:
- **Without streams**: You load the ENTIRE file into memory, then process it. A 2GB file? 2GB of RAM gone.
- **With streams**: You read small chunks at a time. Even a 10GB file uses only a few KB of memory.

```
Without streams:  [====== entire file in memory ======] -> process

With streams:     [chunk1] -> process -> [chunk2] -> process -> [chunk3] -> ...
```

---

## The 4 Types of Streams

| Type | What it does | Example |
|------|-------------|---------|
| **Readable** | You read data FROM it | `fs.createReadStream()`, `process.stdin`, HTTP response (client) |
| **Writable** | You write data TO it | `fs.createWriteStream()`, `process.stdout`, HTTP request (client) |
| **Duplex** | Both readable AND writable | TCP socket, `net.Socket` |
| **Transform** | Duplex that modifies data passing through | `zlib.createGzip()`, crypto streams |

### Quick mental model

```
Readable  ----data flows out---->  (you consume it)

(you push data)  ---->  Writable

Readable  ---->  Transform  ---->  Writable
                 (modifies data in between)

Duplex = Readable + Writable in one object (independent channels)
```

---

## Readable Streams

A readable stream produces data that you can consume.

### Two modes: flowing vs paused

- **Flowing mode**: Data comes at you automatically (like a faucet turned on)
- **Paused mode**: You manually ask for each chunk (like using a ladle to scoop water)

```js
const fs = require('fs');

// create a readable stream from a file
const readable = fs.createReadStream('big-file.txt');

// --- FLOWING MODE (using 'data' event) ---
readable.on('data', (chunk) => {
  console.log(`Got ${chunk.length} bytes`);
});

readable.on('end', () => {
  console.log('No more data');
});

// --- PAUSED MODE (using .read()) ---
readable.on('readable', () => {
  let chunk;
  while ((chunk = readable.read()) !== null) {
    console.log(`Got ${chunk.length} bytes`);
  }
});
```

### Key events on Readable

| Event | When it fires |
|-------|--------------|
| `data` | A chunk of data is available (switches to flowing mode) |
| `end` | No more data to read |
| `readable` | There's data ready to be `.read()` |
| `error` | Something went wrong |
| `close` | Stream is fully closed |

---

## Writable Streams

A writable stream is a destination you send data to.

```js
const fs = require('fs');

const writable = fs.createWriteStream('output.txt');

writable.write('Hello ');
writable.write('World\n');
writable.end('Done!');  // signals no more data will be written

writable.on('finish', () => {
  console.log('All data written to file');
});
```

### Backpressure - the most important concept!

When you write data faster than the stream can handle, it builds up in an internal buffer. This is called **backpressure**.

`.write()` returns `false` when the buffer is full. You should **stop writing and wait for the `drain` event**.

```js
const writable = fs.createWriteStream('output.txt');

let i = 0;
function write() {
  let ok = true;
  while (i < 1000000 && ok) {
    ok = writable.write(`Line ${i}\n`);
    i++;
  }
  if (i < 1000000) {
    // buffer is full, wait for it to drain
    writable.once('drain', write);
  } else {
    writable.end();
  }
}
write();
```

**Why does this matter?**
Without handling backpressure, your app will eat up all available memory and crash. This is a super common bug.

### Key events on Writable

| Event | When it fires |
|-------|--------------|
| `drain` | Buffer was full, now it's ok to write again |
| `finish` | `.end()` was called and all data is flushed |
| `error` | Something went wrong |
| `close` | Stream is fully closed |

---

## .pipe() - Connecting Streams Together

`.pipe()` is the glue. It connects a readable stream to a writable stream and **handles backpressure automatically**.

```js
const fs = require('fs');

// copy a file using streams
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'));
```

### Why pipe is awesome

1. **Handles backpressure for you** - no need to listen for `drain`
2. **Clean and chainable syntax**
3. **Automatic cleanup** - stops reading when the writable is done

### Chaining pipes with Transform streams

```js
const fs = require('fs');
const zlib = require('zlib');

// read file -> compress it -> write compressed file
fs.createReadStream('big-file.txt')
  .pipe(zlib.createGzip())           // Transform stream
  .pipe(fs.createWriteStream('big-file.txt.gz'));
```

This reads the file in chunks, compresses each chunk, and writes the compressed output. The whole file never sits in memory at once.

### pipeline() - the safer pipe

`.pipe()` has a problem: if an error happens in the middle of a chain, streams might not close properly (memory leak!). Use `pipeline()` instead:

```js
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);
```

With `pipeline()`:
- Errors are forwarded properly
- All streams are destroyed/cleaned up on error
- The callback fires when done or on error

There's also a promise version:

```js
const { pipeline } = require('stream/promises');

async function compress() {
  await pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('input.txt.gz')
  );
  console.log('Done!');
}
```

---

## Creating Your Own Streams

### Custom Readable

```js
const { Readable } = require('stream');

const myReadable = new Readable({
  read(size) {
    // push data into the stream
    this.push('hello ');
    this.push('world\n');
    this.push(null);  // null = signal "no more data"
  }
});

myReadable.pipe(process.stdout);
// Output: hello world
```

### Custom Writable

```js
const { Writable } = require('stream');

const myWritable = new Writable({
  write(chunk, encoding, callback) {
    // chunk is a Buffer by default
    console.log('Received:', chunk.toString());
    callback();  // call when done processing this chunk
  }
});

process.stdin.pipe(myWritable);
```

### Custom Transform

```js
const { Transform } = require('stream');

const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    // modify the data and push it forward
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

process.stdin.pipe(upperCase).pipe(process.stdout);
// type "hello" -> outputs "HELLO"
```

---

## Async Iterators with Streams

This is the **modern way** to consume readable streams. Since Node.js v10+, readable streams are async iterables. You can use `for await...of` to read from them.

### Basic usage

```js
const fs = require('fs');

async function readFile() {
  const stream = fs.createReadStream('big-file.txt', { encoding: 'utf8' });

  for await (const chunk of stream) {
    console.log(`Chunk: ${chunk.length} chars`);
  }

  console.log('Done reading');
}

readFile();
```

### Why async iterators are great

1. **No event listeners** - cleaner code, no callback soup
2. **Automatic backpressure** - the loop waits for you to process each chunk
3. **Works with try/catch** - proper error handling
4. **You can use break** - stops reading immediately

### Error handling with try/catch

```js
async function processFile() {
  const stream = fs.createReadStream('maybe-missing.txt');

  try {
    for await (const chunk of stream) {
      // process chunk
    }
  } catch (err) {
    console.error('Stream error:', err.message);
    // stream is automatically destroyed
  }
}
```

### Line-by-line reading with async iterators

```js
const fs = require('fs');
const readline = require('readline');

async function countLines() {
  const stream = fs.createReadStream('big-log.txt');
  const rl = readline.createInterface({ input: stream });

  let count = 0;
  for await (const line of rl) {
    count++;
  }

  console.log(`Total lines: ${count}`);
}

countLines();
```

### Combining with pipeline (promise version)

```js
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const fs = require('fs');

async function filterErrors() {
  const errorFilter = new Transform({
    transform(chunk, enc, cb) {
      const lines = chunk.toString().split('\n');
      const errors = lines.filter(l => l.includes('ERROR'));
      if (errors.length) this.push(errors.join('\n') + '\n');
      cb();
    }
  });

  await pipeline(
    fs.createReadStream('big-log.txt'),
    errorFilter,
    fs.createWriteStream('errors-only.txt')
  );

  console.log('Filtered errors to file');
}
```

---

## Object Mode

By default, streams work with `Buffer` or `string`. But you can switch to **object mode** to stream any JavaScript value (objects, arrays, numbers, etc).

```js
const { Transform } = require('stream');

const parseJSON = new Transform({
  objectMode: true,  // <-- enable object mode
  transform(chunk, enc, cb) {
    try {
      const obj = JSON.parse(chunk);
      this.push(obj);  // push a JS object, not a string
      cb();
    } catch (e) {
      cb(e);
    }
  }
});
```

Object mode is useful when your data is structured (like parsing CSV rows into objects, or processing database records).

---

## Buffering & highWaterMark

Every stream has an internal buffer. The `highWaterMark` option controls how big that buffer can get (in bytes, or number of objects in object mode).

```js
// default highWaterMark is 16KB (16384 bytes) for file streams
const stream = fs.createReadStream('file.txt', {
  highWaterMark: 64 * 1024  // 64KB buffer
});
```

- **Bigger buffer** = fewer I/O operations, more memory usage
- **Smaller buffer** = more I/O operations, less memory usage

---

## Common Patterns & Recipes

### Copy a file

```js
fs.createReadStream('src.txt').pipe(fs.createWriteStream('dest.txt'));
```

### Compress a file

```js
fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));
```

### HTTP response streaming

```js
const http = require('http');

http.createServer((req, res) => {
  // stream a large file directly to the client
  // no need to load it all into memory
  fs.createReadStream('big-video.mp4').pipe(res);
}).listen(3000);
```

### Read from stdin, transform, write to stdout

```js
process.stdin
  .pipe(new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().toUpperCase());
    }
  }))
  .pipe(process.stdout);
```

---

## Practice

- **TASK_0:** Use a Readable stream to count lines in a large log file without loading it into memory.
  - Use `log_gen.js` to generate a 100k-line log file
  - Count total lines, and separately count lines containing `"WARN"` and `"ERROR"`.
  - Log the final counts when the stream ends
  - **BONUS:** Refactor using `for await...of` instead of events

- **ANSWER FILE:** `lineCounter.js`

---

## Key Takeaways

1. **Streams = process data piece by piece** instead of all at once
2. **4 types**: Readable, Writable, Duplex, Transform
3. **`.pipe()` connects streams** and handles backpressure automatically
4. **Use `pipeline()` over `.pipe()`** for proper error handling and cleanup
5. **Backpressure** is when data comes in faster than it goes out — always handle it
6. **Async iterators** (`for await...of`) are the cleanest way to consume readable streams
7. **Object mode** lets you stream JS objects, not just buffers/strings
8. Streams are everywhere in Node.js: files, HTTP, TCP, zlib, crypto, child processes

---

*Last updated: March 8, 2026*
