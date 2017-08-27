function VideoCall(settings) {
    'use strict';
    var iduser,
        signaling,
        localStream,
        remoteStream,
        localVideo,
        remoteVideo,
        panelControls,
        callCtrl,
        micCtrl,
        volumeCtrl,
        peerConn,
        callee,
        singalConnected = false,
        isTalking = false,
        that = this;

    signaling = $.connection.videoCallHub;

    signaling.client.onMessage = function (message, sender) {
        switch (message.type) {
            case 'text':
                that.onMessage(message.data, sender);
                break;
            case 'call':
                callee = sender;
                that.onCall(sender);
                break;
            case 'hangup':
                hangup();

                that.onHangup();
                break;
            case 'response':
                if (message.data) {
                    peerConn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                        .then(function (offer) {
                            peerConn.setLocalDescription(offer);

                            var msg = {
                                type: 'offer',
                                data: offer
                            };

                            signaling.server.sendMessage(sender, msg)
                                .fail(function (err) {
                                    console.log('Offer could not be sent.', err);
                                });
                        })
                        .catch(function (err) {
                            console.log('Error creating offer.', err);
                        });
                } else {
                    var error = {
                        message: 'IceCandidate could not be sent.',
                        src: 'VideoCall::peerConn.onicecandidate(evt)',
                        stack: err
                    };

                    that.onError(error);
                }
                break;
            case 'answer':
                peerConn.setRemoteDescription(new RTCSessionDescription(message.data));
                break;
            case 'candidate':
                peerConn.addIceCandidate(new RTCIceCandidate(message.data));
                break;
            case 'offer':
                peerConn.setRemoteDescription(new RTCSessionDescription(message.data));

                peerConn.createAnswer()
                    .then(function (answer) {
                        peerConn.setLocalDescription(answer);

                        var msg = {
                            type: 'answer',
                            data: answer
                        };

                        signaling.server.sendMessage(sender, msg)
                            .fail(function (err) {
                                console.log('Answer could not be sent.', err);
                            });
                    })
                    .catch(function (err) {
                        console.log('Error creating answer.', err);
                    })
                break;
        }

    };

    signaling.client.disconnect = function () {
        $.connection.hub.stop();
    };

    $.connection.hub.disconnected(function () {
        if ($.connection.hub.lastError) {
            console.log('Disconnected:', $.connection.hub.lastError);
            that.onDisconnected(false);
        } else {
            console.log('Client explicitly close connection.');
            that.onDisconnected(true);
        }
    });

    function setupPeerConnection(stream) {
        var conf = {
            //iceServers: [{
            //    urls: ["stun:w2.xirsys.com"]
            //}, {
            //    urls: ['turn:w2.xirsys.com:80?transport=udp', 'turn:w2.xirsys.com:3478?transport=udp', 'turn:w2.xirsys.com:80?transport=tcp', 'turn:w2.xirsys.com:3478?transport=tcp'],
            //    username: '9fef6730-6805-11e7-8ccf-12cec95ee707',
            //    credential: '9fef67b2-6805-11e7-bb24-c7e23692bf1d',
            //}]
        };

        peerConn = new RTCPeerConnection(conf);

        peerConn.onaddstream = function (evt) {
            remoteStream = evt.stream;
            remoteVideo.srcObject = evt.stream;
            
            isTalking = true;
        };

        peerConn.onicecandidate = function (evt) {
            var msg;
            if (evt.candidate) {
                msg = {
                    type: 'candidate',
                    data: evt.candidate
                };

                signaling.server.sendMessage(callee, msg)
                    .fail(function (err) {
                        console.log('IceCandidate could not be sent.', err);
                    });
            }
        };

        peerConn.addStream(stream);
    }

    function hangup() {
        localStream.getTracks().forEach(function (track) {
            track.stop();
        });

        localStream = null;
        remoteStream = null;

        if (peerConn) {
            peerConn.close();
        }

        callee = null;

        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
    }

    function clickPhone() {
        if (singalConnected) {
            that.hangup();
        }
    }

    function clickMic() {
        if ($(micCtrl).hasClass('disabled')) {
            if (localStream && localStream.getAudioTracks().length > 0) {
                localStream.getAudioTracks()[0].enabled = true;
            }
        } else {
            if (localStream && localStream.getAudioTracks().length > 0) {
                localStream.getAudioTracks()[0].enabled = false;
            }
        }

        $(micCtrl).toggleClass('disabled');
    }

    function clickVolume() {
        if ($(volumeCtrl).hasClass('disabled')) {
            remoteVideo.muted = false;
        } else {
            remoteVideo.muted = true;
        }

        $(volumeCtrl).toggleClass('disabled');
    }

    this.onConnected = $.noop;
    this.onDisconnected = $.noop;
    this.onCall = $.noop;
    this.onError = $.noop;
    this.onHangup = $.noop;
    this.onMessage = $.noop;

    this.connect = function (id) {
        var error;

        if (id) {
            iduser = id;

            $.connection.hub.qs = {
                user: iduser
            };

            $.connection.hub.start()
                .done(function () {
                    console.log('Connected. [' + $.connection.hub.transport.name + ']');
                    singalConnected = true;
                    that.onConnected();
                })
                .fail(function (err) {
                    var error = {
                        message: 'Communication with signaling service could not be established.',
                        src: 'VideoCall::connect(iduser)',
                        type: 'ERR_CONNECTION',
                        stack: err
                    };

                    that.onError(error);
                });
        } else {
            error = {
                message: "The 'iduser' argument is null.",
                src: 'VideoCall::connect(iduser)',
                type: 'ERR_ARGUMENT',
                stack: null
            };

            that.onError(error);
        }
    };

    this.disconnect = function () {
        $.connection.hub.stop();

        that.hangup();
    };

    this.callTo = function (idcallee) {
        callee = idcallee
        if (callee) {
            signaling.server.isOnline(callee)
                .done(function (result) {
                    var constraints = { audio: true, video: true };

                    if (result) {
                        if (!!navigator.mediaDevices) {
                            navigator.mediaDevices.getUserMedia(constraints)
                                .then(function (stream) {
                                    var msg = {
                                        type: 'call',
                                        data: null
                                    };

                                    localStream = stream;

                                    localVideo.srcObject = stream;

                                    setupPeerConnection(stream);

                                    signaling.server.sendMessage(callee, msg)
                                        .fail(function (err) {
                                            console.log('Hangup could not be sent.', err);
                                        });
                                })
                                .catch(function (err) {
                                    var error = {
                                        message: 'Could not access camera and microphone.',
                                        src: 'VideoCall::navigator.mediaDevices.getUserMedia(constraints)',
                                        type: 'ERR_MEDIA_DEVICES',
                                        stack: err
                                    };

                                    that.onError(error);
                                });
                        } else {
                            var error = {
                                message: 'Browser not support MediaDevices.',
                                src: 'VideoCall::navigator.mediaDevices.getUserMedia(constraints)',
                                type: 'ERR_BROWSER_SUPPORT',
                                stack: err
                            };

                            that.onError(error);
                        }
                    } else {
                        var error = {
                            message: callee + ' is offline.',
                            src: 'VideoCall::callTo(idcallee)',
                            type: 'ERR_CONNECTION',
                            stack: null
                        };

                        that.onError(error);
                    }
                }).fail(function (err) {
                    var error = {
                        message: 'Communication with signaling service could not be established.',
                        src: 'VideoCall::signaling.server.isOnline(callee)',
                        type: 'ERR_CONNECTION',
                        stack: err
                    };

                    that.onError(error);
                })
        } else {
            error = {
                message: "The 'callee' argument is null.",
                src: 'VideoCall::connect(iduser)',
                type: 'ERR_ARGUMENT',
                stack: null
            };

            that.onError(error);
        }
    };

    this.hangup = function () {
        if (isTalking) {            
            var msg = {
                type: 'hangup',
                data: null
            };

            signaling.server.sendMessage(callee, msg)
                .fail(function (err) {
                    console.log('Hangup could not be sent.', err);
                });

            hangup();
        }
    };

    this.acceptCall = function () {
        var constraints = { audio: true, video: true };

        if (!!navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function (stream) {
                    var msg = {
                        type: 'response',
                        data: true
                    };

                    localStream = stream;

                    localVideo.srcObject = stream;

                    setupPeerConnection(stream);

                    signaling.server.sendMessage(callee, msg)
                        .fail(function (err) {
                            console.log('Accept call could not be sent.', err);
                        });
                })
                .catch(function (err) {
                    var error = {
                        message: 'Could not access camera and microphone.',
                        src: 'VideoCall::navigator.mediaDevices.getUserMedia(constraints)',
                        type: 'ERR_MEDIA_DEVICES',
                        stack: err
                    };

                    that.onError(error);
                });
        } else {
            var error = {
                message: 'Browser not support MediaDevices.',
                src: 'VideoCall::navigator.mediaDevices.getUserMedia(constraints)',
                type: 'ERR_BROWSER_SUPPORT',
                stack: err
            };

            that.onError(error);
        }
    };

    this.rejectCall = function () {
        var msg = {
            type: 'response',
            data: false
        };

        signaling.server.sendMessage(callee, msg)
            .fail(function (err) {
                console.log('Reject call could not be sent.', err);
            });

        callee = null;
    };

    this.sendMessage = function (receiver, message) {
        if (singalConnected) {
            signaling.server.sendMessage(receiver, message);
        }
    };

    localVideo = document.createElement('video');
    localVideo.className = 'localVideo';
    localVideo.setAttribute('muted', true);
    localVideo.setAttribute('autoplay', true);
    localVideo.setAttribute('poster', '/img/operator.png');
    localVideo.removeAttribute('controls');

    remoteVideo = document.createElement('video');
    remoteVideo.className = 'remoteVideo';
    remoteVideo.setAttribute('autoplay', true);
    remoteVideo.setAttribute('poster', '/img/client.png');
    remoteVideo.removeAttribute('controls');

    panelControls = document.createElement('div');
    panelControls.className = 'panelControls';

    callCtrl = document.createElement('div');
    callCtrl.id = 'callCtrl';
    callCtrl.onclick = clickPhone;

    micCtrl = document.createElement('div');
    micCtrl.id = 'micCtrl';
    micCtrl.onclick = clickMic;

    volumeCtrl = document.createElement('div');
    volumeCtrl.id = 'volumeCtrl';
    volumeCtrl.onclick = clickVolume;

    panelControls.appendChild(micCtrl);
    panelControls.appendChild(volumeCtrl);
    panelControls.appendChild(callCtrl);

    if (settings.target) {
        $(settings.target).append(remoteVideo);
        $(settings.target).append(localVideo);
        $(settings.target).append(panelControls);
    } else {
        document.appendChild(remoteVideo);
        document.appendChild(localVideo);
        document.appendChild(panelControls);
    }
}
