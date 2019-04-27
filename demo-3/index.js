var os = require('os');
var nodeStatic = require('node-static');
var fs = require('fs');
var https = require('https');
var socketIO = require('socket.io');

var privateKey  = fs.readFileSync('certs/private.pem', 'utf8');
var certificate = fs.readFileSync('certs/file.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var fileServer = new (nodeStatic.Server);
var app = https.createServer(credentials, (req, res) => {
    fileServer.serve(req, res);
}).listen(8080);
console.log("file server bind to 8080");

var io = socketIO.listen(app);
console.log("socket io bind to 8080");

io.sockets.on('connection', socket => {

    // 打印 log 到客户端
    function log() {
        var array = ['服务器消息:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('message', message => {
        log('客户端消息：', message);

        // 广播消息，真正的使用应该只发到指定的 room 而不是广播
        socket.broadcast.emit('message', message);
    });

    socket.on("create or join", room => {
        log('接受到创建或者加入房间请求：' + room);

        var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log('Room ' + room + ' 现在有 ' + numClients + ' 个客户端');

        if (numClients === 0) {
            socket.join(room);
            log('客户端 ID: ' + socket.id + ' 创建了房间：' + room);
            socket.emit('created', room, socket.id);
        } else if (numClients === 1) {
            log('客户端 ID: ' + socket.id + ' 加入了房间： ' + room);
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        } else { // 一个房间只能容纳两个客户端
            socket.emit('full', room);
        }
    });

    socket.on('ipaddr', () => {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });

    socket.on('bye', function(){
        console.log('received bye');
    });

});
