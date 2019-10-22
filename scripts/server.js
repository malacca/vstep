const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');

const port = process.argv[2] || 3333;
const map = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
};
const router = (req, res) => {
    const urls = url.parse(req.url);
    const ext = path.parse(urls.pathname).ext;
    if (!ext && urls.pathname.substr(-1) !== '/') {
        res.statusCode = 301;
        res.setHeader('Location',  urls.pathname + '/');
        res.end();
        return;
    }
    const file = path.resolve(__dirname, './../') + urls.pathname + (ext ? '' : 'index.html');
    fs.exists(file, function (exist) {
        if(!exist) {
            res.statusCode = 404;
            res.end(`File ${file} not found!`);
            return;
        }
        fs.readFile(file, function(err, data){
            if(err){
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                res.setHeader('Content-type', map[ext] || 'text/html' );
                res.end(data);
            }
        });
    });
};

// start server
http.createServer(router).listen(parseInt(port));
console.log(`Server is running: http://localhost:${port}`);