(function (Vue, SimpleSignalClient) {
    'use strict';
    
    new Vue({
        el: '#app',
        data : {
            user : {
                isStreamer : true
            },
            channel : {
                title : 'No channel name',
                summary : 'No summary',
                desc : 'Chrome Screenshare: http://bit.ly/1v9Xh7O. Firefox Screenshare: https://mzl.la/1U8tvLI',
                image : '../assets/img/sparrowblue.png'
            },
            video : {
                title : 'nothing',
                0 : {
                    src : '',
                    off : 'true'
                },
                1 : {
                    src : '',
                    off : 'true'
                    
                }
            },
            username : 'guest',
            chat : {
                workingMessage : '',
                flashStyle : '',
                messages : [
                ]
            },
            counts : {
                watchers : 1
            }
        },
        methods : {
            sendChatMessage : function () {
                // TODO: Send to peers
                this.appendChatMessage({
                    username : this.username,
                    message : this.chat.workingMessage
                });
                sendDataMessage({
                    type : 'chat',
                    message : this.chat.workingMessage
                });
                this.chat.workingMessage = '';
                
            },
            raiseHand : function () {
                var self = this;
                self.chat.flashStyle = '#ff6565';
                setTimeout(function () {
                    self.chat.flashStyle = '';
                }, 500);
                sendDataMessage({
                    type : 'hand'
                });
            },
            updateStreamInfo : function () {
                sendDataMessage({
                    type : 'desc',
                    channel : this.channel,
                    title : this.video.title
                });
                this.username = this.channel.title;
            },
            setVideoURL : function (url) {
                if (!this.user.isStreamer) {
                    this.video.main.src = url;
                }
            },
            appendChatMessage : function (data) {
                
                this.chat.messages.push({
                    time : FormattedTime.now(),
                    username : data.username,
                    text : data.message
                });
            }
        },
        mounted : function () {
            var app = this;
            var socket = new io();
            var room = getParameterByName('room');
            var signal = new SimpleSignalClient(socket, {room: room});
            var peers = [];
            
            if (!SimpleSignalClient.SimplePeer.WEBRTC_SUPPORT) {
                app.appendChatMessage({
                    username: 'sparrowtv',
                    message : 'SparrowTV is powered by WebRTC. Your browser is old or non-standard and does not support WebRTC.'
                });
                return alert('Your browser does not support WebRTC.');
            }
            
            app.appendChatMessage({
                username: 'sparrowtv',
                message : 'Welcome to SparrowTV, an open-source P2P streaming platform. Enjoy the stream!'
            });
            
            var videoElements = [
                    document.querySelector('video.main'),
                    document.querySelector('video.small')
                ];
            var videoWrapper = document.querySelector('.video-wrapper');
            var isStreamer = window.location.href.indexOf('stream') !== -1;
            var streams = [null, null];
            
            this.user.isStreamer=isStreamer;
            
            videoWrapper.addEventListener('click', function() {
                requestFullscreen(videoWrapper);
            });

            var options = {
                offerConstraints: {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                }
            }
            
            if (!isStreamer) {
                console.log('start')
                signal.on('ready', function(peerList) { // Get list of peers
                    if (isStreamer) return; //Streamer never discovers
                    console.log(peerList);
                    for (var i=0; i<peerList.length; i++){
                        signal.connect(peerList[i], options, 0);
                        signal.connect(peerList[i], options, 1);
                    }
                });
            }

            signal.on('peer', function (peer) {   
                console.log('got peer')
                console.log(peer.metadata)
                peer.on('stream', function (stream) {
                    console.log('got stream')
                    console.log(peer.metadata)
                    streams[peer.metadata] = stream;
                    app.video[peer.metadata].src = window.URL.createObjectURL(stream);
                    app.video[peer.metadata].off = '';

                    setTimeout(function () {
                        videoElements[peer.metadata].play()
                    })
                    
                    peers.push(peer)
                })
                
                peer.on('connect', function () {
                    console.log('connected')
                    if (isStreamer) {
                        sendDataMessage({
                            type : 'desc',
                            channel : app.channel,
                            title : app.video.title
                        });
                    }
                })
            })

            signal.on('request', function (request) {
                console.log('got request')
                console.log(request.metadata)
                request.accept({
                    stream: streams[request.metadata],
                    answerConstraints: {
                        offerToReceiveAudio: false,
                        offerToReceiveVideo: false
                    }
                }, request.metadata)
            })
            
            socket.on('broadcast', function(roomID) {
                room = roomID;
                app.video.title = 'something';
                app.channel.title = 'guest';
                app.channel.summary = 'Stream summary not set.';
                app.channel.desc = 'Chrome Screenshare: http://bit.ly/1v9Xh7O. Firefox Screenshare: https://mzl.la/1U8tvLI';
                sendDataMessage({
                    type : 'desc',
                    channel : app.channel,
                    title : app.video.title
                });
                
                app.appendChatMessage({
                    username: 'sparrowtv',
                    message : 'Your room ID is '+roomID
                });
            });
            
            socket.on('reform', function(){ // On network restructure
                if (isStreamer){
                    window.location = '/watch';
                }
                app.video[0].off = 'true';
                app.video[1].off = 'true';
                console.log('reformed');
                while (peers[0]){
                    peers[0].peer.destroy();
                    peers[0]=null;
                    peers.shift();
                }
                signal.rediscover({room: room});
            });
            
            socket.on('username', function(newUsername){
                app.username = newUsername;
            });
            
            socket.on('datamessage', function(data){
                //Chat msg
                if (data.type === 'chat') {
                    app.appendChatMessage(data);
                }else if (data.type === 'desc' && !isStreamer) {
                    app.channel = data.channel;
                    app.video.title = data.title;
                }else if (data.type === 'hand') {
                    app.chat.flashStyle = '#ff6565';
                    setTimeout(function(){
                        app.chat.flashStyle = ''; 
                    },500);
                }
            });
            
             // Update watch count
            socket.on('watchers', function(numWatchers) {
                app.counts.watchers = numWatchers; 
            });
            
            window.sendDataMessage = function(data) {
                socket.emit('datamessage', data);
            };
                
            if (isStreamer) {                
                videoElements[0].muted=true;
                videoElements[1].muted=true;
                
                var isStreamCaptured = false;
                
                socket.on('connect', function() {
                    if (!isStreamCaptured) { //Only capture once
                        isStreamCaptured=true;
                        captureUserMedia(function(newStreams) {
                            streams = newStreams;

                            for (var i=0; i<streams.length; i++) {
                                if (streams[i]) {
                                    videoElements[i].src=window.URL.createObjectURL(streams[i]);
                                    videoElements[i].play();
                                    app.video[i].off='';
                                }
                            }
                            socket.emit('broadcast'); // Request to broadcast
                        });
                    } else {
                        socket.emit('broadcast'); // Request to broadcast
                    }
                });
            }
        }
    });
}(Vue, SimpleSignalClient));