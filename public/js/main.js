(function (Vue, Io, SimpleSignalClient, Util) {
  'use strict'

  var socket = new Io()
  var room = Util.getParameterByName('room')
  var signal = new SimpleSignalClient(socket)
  var peers = []

  var sendDataMessage = function (data) {
    socket.emit('datamessage', data)
  }

  var videoElements
  var videoWrapper = document.querySelector('.video-wrapper')
  var isStreamer = window.location.href.indexOf('stream') !== -1
  var streams = [null, null]

  var v = new Vue({
    el: '#app',
    data: {
      user: {
        isStreamer: true
      },
      channel: {
        title: 'No channel name',
        summary: 'No summary',
        desc: 'Chrome Screenshare: http://bit.ly/1v9Xh7O.',
        image: '../assets/img/sparrowblue.png'
      },
      video: {
        title: 'nothing'
      },
      username: 'guest',
      chat: {
        workingMessage: '',
        flashStyle: '',
        messages: []
      },
      counts: {
        watchers: 1
      }
    },
    methods: {
      sendChatMessage: function () {
        var app = this

        // TODO: Implement chat via P2P
        app.appendChatMessage({
          username: app.username,
          message: app.chat.workingMessage
        })
        sendDataMessage({
          type: 'chat',
          message: app.chat.workingMessage
        })
        app.chat.workingMessage = ''
      },
      raiseHand: function () {
        var app = this

        app.chat.flashStyle = '#ff6565'
        setTimeout(function () {
          app.chat.flashStyle = ''
        }, 500)
        sendDataMessage({
          type: 'hand'
        })
      },
      updateStreamInfo: function () {
        var app = this

        sendDataMessage({
          type: 'desc',
          channel: app.channel,
          title: app.video.title
        })
        app.username = app.channel.title
      },
      appendChatMessage: function (data) {
        var app = this

        app.chat.messages.push({
          time: Util.FormattedTime.now(),
          username: data.username,
          text: data.message
        })
      }
    },
    mounted: function () {
      var app = this

      videoElements = [
        document.querySelector('video.main'),
        document.querySelector('video.small')
      ]

      if (!SimpleSignalClient.SimplePeer.WEBRTC_SUPPORT) {
        app.appendChatMessage({
          username: 'sparrowtv',
          message: 'SparrowTV is powered by WebRTC. Your browser is old or non-standard and does not support WebRTC.'
        })
        return window.alert('Your browser does not support WebRTC.')
      }

      app.user.isStreamer = isStreamer

      app.appendChatMessage({
        username: 'sparrowtv',
        message: 'Welcome to SparrowTV, an open-source P2P streaming platform. Enjoy the stream!'
      })

      videoWrapper.addEventListener('click', function () {
        window.requestFullscreen(videoWrapper)
      })

      var options = {}

      if (!isStreamer) {
        signal.on('discover', async function (peerList) { // Get list of peers
          if (isStreamer) return // Streamer never discovers
          console.log(peerList)
          for (var i = 0; i < peerList.length; i++) {
            signal.connect(peerList[i], 0, { trickle: false}).then(peer => onPeer(peer))
            signal.connect(peerList[i], 1, { trickle: false}).then(peer => onPeer(peer))
          }
        })
        signal.discover({room: room})
      }

      function onPeer ({ peer, metadata }) {
        console.log('got peer', peer, metadata)
        if (!isStreamer) {
          peer.on('stream', function (stream) {
            console.log('got stream')
            streams[metadata] = stream
            videoElements[metadata].srcObject = stream
            videoElements[metadata].play() 
            videoElements[metadata].setAttribute('data-off', '')

            setTimeout(function () {
              videoElements[metadata].play()
            })

            peers.push(peer)
          })
        }

        if (isStreamer) {
          sendDataMessage({
            type: 'desc',
            channel: app.channel,
            title: app.video.title
          })
        }
      }

      signal.on('request', async function (request) {
        console.log('got request', request.metadata, streams[request.metadata])
        if (streams[request.metadata]) {
          const peer = await request.accept(request.metadata, {
            trickle: false,
            stream: streams[request.metadata]
          })
          onPeer(peer)
          console.log('accept')
        } else {
          request.reject()
        }
      })

      socket.on('broadcast', function (roomID) {
        room = roomID
        app.video.title = 'something'
        app.channel.title = 'guest'
        app.channel.summary = 'Stream summary not set.'
        app.channel.desc = 'Chrome Screenshare: http://bit.ly/1v9Xh7O.'
        sendDataMessage({
          type: 'desc',
          channel: app.channel,
          title: app.video.title
        })

        app.appendChatMessage({
          username: 'sparrowtv',
          message: 'Your room ID is ' + roomID
        })
        signal.discover({ room })
      })

      socket.on('reform', function () { // On network restructure
        if (isStreamer) {
          window.location = '/watch'
        }
        videoElements[0].setAttribute('data-off', 'true')
        videoElements[1].setAttribute('data-off', 'true')
        while (peers[0]) {
          peers[0].peer.destroy()
          peers[0] = null
          peers.shift()
        }
        signal.discover({room: room})
      })

      socket.on('username', function (newUsername) {
        app.username = newUsername
      })

      socket.on('datamessage', function (data) {
        // Chat msg
        if (data.type === 'chat') {
          app.appendChatMessage(data)
        } else if (data.type === 'desc' && !isStreamer) {
          app.channel = data.channel
          app.video.title = data.title
        } else if (data.type === 'hand') {
          app.chat.flashStyle = '#ff6565'
          setTimeout(function () {
            app.chat.flashStyle = ''
          }, 500)
        }
      })

      // Update watch count
      socket.on('watchers', function (numWatchers) {
        app.counts.watchers = numWatchers
      })

      if (isStreamer) {
        videoElements[0].muted = true
        videoElements[1].muted = true

        var isStreamCaptured = false

        socket.on('connect', function () {
          if (!isStreamCaptured) { // Only capture once
            isStreamCaptured = true
            function onClick() {
              Util.captureUserMedia(function (newStreams) {
                streams = newStreams

                for (var i = 0; i < streams.length; i++) {
                  if (streams[i]) {
                    videoElements[i].srcObject = streams[i]
                    videoElements[i].play()
                    videoElements[i].setAttribute('data-off', '')
                  }
                }
                socket.emit('broadcast') // Request to broadcast
              })
              window.removeEventListener('click', onClick)
            }
            window.addEventListener('click', onClick)
            alert('Click anywhere to start!')
          } else {
            socket.emit('broadcast') // Request to broadcast
          }
        })
      }
    }
  })

  return v
}(window.Vue, window.io, window.SimpleSignalClient, window.Util))
