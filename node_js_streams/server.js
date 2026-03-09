/*
 * making a server usning http module and an endpoint /download
 * the endpoint should streams the file to the user without buffering it
 * 
 */

const fs = require('fs');
const http = require('http');
const pipeline = require('stream').pipeline


const server = http.createServer((req, res) => {
    
    if (req.url === '/download' && req.method == "GET") {
        
        const readStream = fs.createReadStream('big-log.txt');
        
        readStream.on('error', (err) => {
            console.log(err);
        })

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'transfer-encoding': 'chunked'
        });

        pipeline(readStream, res, (err) => {
            if (err) {
                console.log("pipeline error", err);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end("Internal Server Error");
                }
            }
        })
        
    }
});

server.listen(3000);
