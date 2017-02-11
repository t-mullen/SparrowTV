var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    cfenv = require('cfenv'),
    appEnv = cfenv.getAppEnv(),
    Moniker = require('moniker'),
    Models = require('./models.js');

var sockets = {},
    rooms = {};

var defaultChannel = {
                        title : 'No channel name',
                        summary : 'No summary',
                        desc : 'Chrome Screenshare: http://bit.ly/1v9Xh7O. Firefox Screenshare: https://mzl.la/1U8tvLI',
                        image : '../assets/img/sparrowblue.png'
                    };

server.listen(appEnv.port);

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/public/index.html');
});

app.get('/api/rooms', function(req, res) {
    res.send(JSON.stringify(rooms));
});

app.get('/watch', function(req, res) {
    res.sendFile(__dirname+'/public/watch.html');
});

app.get('/stream', function(req, res) {
    res.sendFile(__dirname+'/public/watch.html'); // Same app
});

app.use(express.static('public'));


io.on('connection', function(socket) {
    
    sockets[socket.id] = socket;
    socket.username = Moniker.choose();
    
    socket.emit('username', socket.username);
    
    // Peer disconnects
    socket.on('disconnect', function() {
        if (socket.room === socket.id) {
            io.to(socket.room).emit('datamessage', {
                channel : defaultChannel,
                title : 'No title'
            });
            delete rooms[socket.room];

        } else if (socket.room && rooms[socket.room]) {
            var reformPeers = rooms[socket.room].model.removePeer(socket.id);
            for (var i=0; i<reformPeers.length; i++) {
                if (sockets[reformPeers[i]]){
                    sockets[reformPeers[i]].emit('reform');
                }
            }
            io.to(socket.room).emit('watchers', --rooms[socket.room].watchers);
        }
        delete sockets[socket.id];
    });
    
    socket.on('error', function(err) {
        console.log(err);
    });
    
    // Peer requests to broadcast
    socket.on('broadcast', function() {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.room = socket.id;
        rooms[socket.room] = {
            model : new Models.TreeModel(2),
            watchers : 1,
            title : 'No title.',
            channel : {
                title : 'guest',
                summary : 'No summary.',
                desc : 'No description.',
                image : '../assets/img/sparrowblue.png'
            }
        };
        rooms[socket.room].model.setBroadcaster(socket.id);
        socket.to(socket.room).broadcast.emit('reform'); // Demand the network reform
        socket.emit('broadcast', socket.id);
    });
    
    // Peer requests peers
    socket.on('discover', function(data) {
        if (!data || !data.room || !rooms[data.room]) return;

        if (socket.room){
            io.to(socket.room).emit('watchers', --rooms[socket.room].watchers);
            socket.leave(socket.room);
        }
        socket.room = data.room;
        socket.join(data.room);
        io.to(socket.room).emit('watchers', ++rooms[socket.room].watchers);
        
        var targetPeers = rooms[data.room].model.addPeer(socket.id);
        socket.emit('discover', targetPeers);
    });
    
     // First peer provides initial offer
    socket.on('signaloffer', function(data) {
        if (!data || !data.id || !data.signal) return;
        
        if (sockets[data.id] && sockets[data.id].room === socket.room){
            sockets[data.id].emit('signaloffer', {
                id : socket.id,
                streamID : data.streamID,
                signal : data.signal
            });
        }
    });
    
    // Peer responds to offer
    socket.on('signalanswer', function(data) {
        if (!data || !data.id || !data.signal) return;
        
        if (sockets[data.id] && sockets[data.id].room === socket.room){
            sockets[data.id].emit('signalanswer', {
                id : socket.id,
                streamID : data.streamID,
                signal : data.signal
            });
        }
    });
    
    
    socket.on('datamessage', function(data) {
        if (data.type === 'desc') {
            if (socket.id === socket.room) {
                rooms[socket.room].title = data.title;
                rooms[socket.room].channel = data.channel;
            } else{
                return; // Prevent unauthorized description changes
            }
        }
        data.username = socket.username;
        socket.to(socket.room).broadcast.emit('datamessage', data);
    });
    
});

console.log('Server online at '+appEnv.url);