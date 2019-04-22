var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');

var fileServer = new (nodeStatic.Server);
var app = http.createServer((req, res) => {
    fileServer.serve(req, res);
}).listen(8080);
console.log("file server bind to 8080");
