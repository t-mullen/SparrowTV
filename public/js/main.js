(function (Vue, SimplePeer) {
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
                main : {
                    src : '',
                    off : 'true'
                },
                small : {
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
            
            if (!SimplePeer.WEBRTC_SUPPORT) {
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
                ],
                videoWrapper = document.querySelector('.video-wrapper');

            var isStreamer = window.location.href.indexOf('stream') !== -1,
                room = getParameterByName('room'),
                isStreamCaptured = false,
                peers = [],
                streams = [null, null],
                socket = io();
            
            this.user.isStreamer=isStreamer;
            
            var connectToStreamer = function(peerID) {
                var options = {
                    initiator : true,
                    trickle : false,
                    offerConstraints : {
                        mandatory: { 
                            OfferToReceiveAudio: true, 
                            OfferToReceiveVideo: true
                        }
                    }
                };

                videoWrapper.addEventListener('click', function() {
                    requestFullscreen(videoWrapper);
                });

                // TODO: Two streams without needing two peers
                var multiPeers = [];
                for (var i=0; i<streams.length;i++){
                    multiPeers[i] = new SimplePeer(options);
                }

                var sendOffer = function sendOffer(i) {
                    
                    
                    multiPeers[i].on('signal', function (signal) {
                        if (peerID) {
                            console.log('offered');
                            socket.emit('signaloffer', {
                                id: peerID,
                                streamID : i,
                                signal : signal
                            });
                        }
                    });

                    multiPeers[i].on('stream', function (stream) {
                        console.log('got stream');
                        streams[i] = stream;
                        // FIXME
                        app.video[i === 0 ? 'main' : 'small'].src = window.URL.createObjectURL(stream);
                        app.video[i === 0 ? 'main' : 'small'].off = '';

                        setTimeout(function () {
                            videoElements[i].play();
                            app.video[i === 0 ? 'main' : 'small'].off = '';
                        });
                    });

                    peers.push({
                        id : peerID,
                        streamID : i,
                        peer : multiPeers[i]
                    });
                };
            

                for (var i=0; i<streams.length; i++){
                    sendOffer(i);
                }
            };
            
            socket.on('discover', function(peerList) { // Get list of peers
                if (isStreamer) return; //Streamer never discovers
                
                console.log('discovered peers: '+peerList);
                for (var i=0; i<peerList.length; i++){
                    connectToStreamer(peerList[i]);
                }
            });
            
            socket.on('signalanswer', function(data) { // Get webrtc response
                if (isStreamer) return; // Ignore fake answers
                
                console.log('got webrtc response');
                for (var i2=0; i2< peers.length; i2++){
                    if (peers[i2].id === data.id && peers[i2].streamID === data.streamID){
                        peers[i2].peer.signal(data.signal); // Finalize connection
                        break;
                    }
                }
            });
            
            socket.on('signaloffer', function(data) { // Get webrtc offer
                console.log('got webrtc offer');

                var options = {
                    initiator : false,
                    stream : streams[data.streamID],
                    trickle : false,
                    constraints : {
                        mandatory: { 
                            OfferToReceiveAudio: false, 
                            OfferToReceiveVideo: false 
                        }
                    }
                };

                var peer = new SimplePeer(options),
                    streamID = data.streamID;

                peer.signal(data.signal); // Open pending connection
                peer.on('signal', function(signal) { // Create webrtc response
                    console.log('generated webrtc response');
                    socket.emit('signalanswer', {
                        id: data.id,
                        streamID: streamID,
                        signal:signal
                    }); 
                });  

                peer.on('connect', function(){
                    console.log('connected');
                    sendDataMessage({
                        type : 'desc',
                        channel : app.channel,
                        title : app.video.title
                    });
                });


                peers.push({
                    id: data.id,
                    streamID : streamID,
                    peer : peer
                });
            });
            
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
                app.video.main.off = 'true';
                app.video.small.off = 'true';
                console.log('reformed');
                while (peers[0]){
                    peers[0].peer.destroy();
                    peers[0]=null;
                    peers.shift();
                }
                socket.emit('discover', {
                    room : room
                }); // Initiate discovery
            });
            
            socket.on('username', function(newUsername){
                app.username=newUsername;
            });
            
            socket.on('datamessage', function(data){
                //Chat msg
                if (data.type === 'chat') {
                    app.appendChatMessage(data);
                }else if (data.type === 'desc' && !isStreamer) {
                    app.channel = data.channel;
                    app.video.title = data.title;
                    app.username = data.channel.title;
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
                
                socket.on('connect', function() {
                    if (!isStreamCaptured) { //Only capture once
                        isStreamCaptured=true;
                        captureUserMedia(function(newStreams) {
                            streams=newStreams;

                            for (var i=0; i<streams.length; i++) {
                                if (streams[i]) {
                                    videoElements[i].src=window.URL.createObjectURL(streams[i]);
                                    videoElements[i].play();
                                    app.video[i===0 ? 'main' : 'small'].off='';
                                }
                            }
                            socket.emit('broadcast'); // Request to broadcast
                        });
                    } else {
                        socket.emit('broadcast'); // Request to broadcast
                    }
                });
            } else {
                socket.on('connect', function() { // Connect to signalling server 
                    socket.emit('discover', { // Initiate discovery (and join room)
                        room : room
                    }); 
                });
            }
        }
    });
}(Vue, SimplePeer));