var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var signal = require('simple-signal-server')(io)
var cfenv = require('cfenv')
var appEnv = cfenv.getAppEnv()
var Moniker = require('moniker')
var Models = require('./models.js')
var path = require('path')

var sockets = {}
var rooms = {}

var defaultChannel = {
  title: 'No channel name',
  summary: 'No summary',
  desc: 'Chrome Screenshare: http://bit.ly/1v9Xh7O.',
  image: '../assets/img/sparrowblue.png'
}

server.listen(appEnv.port)

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/land.html'))
})

app.get('/api/rooms', function (req, res) {
  res.send(JSON.stringify(rooms))
})

app.get('/browse', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

app.get('/watch', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/watch.html'))
})

app.get('/stream', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/watch.html'))
})

app.use(express.static('public'))

io.on('connection', function (socket) {
  sockets[socket.id] = socket
  socket.username = Moniker.choose()

  socket.emit('username', socket.username)

    // Peer disconnects
  socket.on('disconnect', function (metadata) {
    if (socket.room === socket.id) {
      io.to(socket.room + 'data').emit('datamessage', {
        channel: defaultChannel,
        title: 'No title'
      })
      delete rooms[socket.room]
    } else if (socket.room && rooms[socket.room]) {
      try {
        var reformPeers = rooms[socket.room].model.removePeer(socket.id)
        for (var i = 0; i < reformPeers.length; i++) {
          if (sockets[reformPeers[i]]) {
            sockets[reformPeers[i]].emit('reform')
          }
        }
      } catch (err) {}
      io.to(socket.room + 'data').emit('watchers', --rooms[socket.room].watchers)
    }
    delete sockets[socket.id]
  })

  socket.on('error', function (err) {
    console.log(err)
  })

    // Peer requests to broadcast
  socket.on('broadcast', function () {
    if (socket.room) {
      socket.leave(socket.room)
    }
    console.log('broadcast started', socket.id)
    socket.room = socket.id
    socket.join(socket.room + 'data')
    rooms[socket.room] = {
      model: new Models.TreeModel(2),
      watchers: 1,
      title: 'No title.',
      channel: {
        title: 'guest',
        summary: 'No summary.',
        desc: 'No description.',
        image: '../assets/img/sparrowblue.png'
      }
    }
    rooms[socket.room].model.setBroadcaster(socket.id)
    socket.broadcast.to(socket.room + 'data').emit('reform') // Demand the network reform
    socket.emit('broadcast', socket.id)
  })

  socket.on('datamessage', function (data) {
    if (data.type === 'desc') {
      if (socket.id === socket.room) {
        rooms[socket.room].title = data.title
        rooms[socket.room].channel = data.channel
        socket.username = data.channel.title
      } else {
        return // Prevent unauthorized description changes
      }
    }
    data.username = socket.username
    socket.broadcast.to(socket.room + 'data').emit('datamessage', data)
  })
})

// Peer requests peers
signal.on('discover', function (request) {
  const data = request.discoveryData
  const id = request.socket.id
  if (!data || !data.room || !rooms[data.room]) return

  if (sockets[id].room) {
    io.to(sockets[id].room + 'data').emit('watchers', --rooms[sockets[id].room].watchers)
    sockets[id].leave(sockets[id].room)
  }
  sockets[id].room = data.room
  sockets[id].join(data.room + 'data')
  io.to(sockets[id].room + 'data').emit('watchers', ++rooms[sockets[id].room].watchers)

  var targetPeers = rooms[data.room].model.addPeer(sockets[id].id)

  request.discover(id, targetPeers)
})

signal.on('request', function (request) {
  request.forward()
})

console.log('Server online at ' + appEnv.url)
