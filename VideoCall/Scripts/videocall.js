function VideoCall() {
    var username, signaling, that = this;

    signaling = $.connection.videoCallHub;

    signaling.client.onMessage = function (message, sender) {
        that.onMessage(message, sender);
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

    this.onConnected = $.noop;
    this.onError = $.noop;
    this.onMessage = $.noop;
    this.onDisconnected = $.noop;

    this.connect = function (iduser) {
        var error;

        if (iduser) {
            $.connection.hub.qs = {
                user: iduser
            };

            $.connection.hub.start()
                .done(function () {
                    console.log('Connected. [' + $.connection.hub.transport.name + ']');
                    that.onConnected();
                })
                .fail(function (err) {
                    var error = {
                        message: 'Communication with signaling service could not be established.',
                        src: 'VideoCall::connect(iduser)',
                        stack: err
                    };

                    that.onError(error);
                });
        } else {
            error = {
                message: "The 'iduser' argument is null.",
                src: 'VideoCall::connect(iduser)',
                stack: null
            };

            that.onError(error);
        }
    };

    this.disconnect = function () {
        $.connection.hub.stop();
    };

    this.callTo = function (callee) {
        if (callee) {
            signaling.server.isOnline(callee)
                .done(function (result) {
                    if(result) {
                        // request camera and mic
                        
                    } else {
                        var error = {
                        message: callee + ' is offline.',
                        src: 'VideoCall::signaling.server.isConnected(callee)',
                        stack: err
                    };

                    that.onError(error);
                    }
                }).fail(function (err) {
                    var error = {
                        message: 'Communication with signaling service could not be established.',
                        src: 'VideoCall::signaling.server.isConnected(callee)',
                        stack: err
                    };

                    that.onError(error);
                })
        } else {
            error = {
                message: "The 'callee' argument is null.",
                src: 'VideoCall::connect(iduser)',
                stack: null
            };

            that.onError(error);
        }
    };
}
