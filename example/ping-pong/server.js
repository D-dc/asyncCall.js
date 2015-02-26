'use strict';

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../../lib/rpc-server.js'),
    port = process.env.PORT || 80;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});

app.use('/client', express.static(__dirname + '/../../client/'));
app.use('/', express.static(__dirname + '/'));


//various options
var options = {
    defaultRpcTimeout: 1000 //default delay before an RPC call should have its reply. Infinity = no timeout
};

// make the ServerRpc by giving the http server, options
var myServer = new ServerRpc(serverHttp, options);
//Expose functions to be called from client
myServer.expose({
    'ping': function(counter) {
        counter++;
        var that = this; 
        // this points to the call originator.
        // thus, this.rpcCall(...) will perform the rpc only to the originator! not broadcast as with myServer.rpcCall.
        // which makes a lot of sense at the server-side.

        setTimeout(function(){
            that.rpcCall('pong', [counter]);//broadcast
        }, 2000);


        var now = new Date();
        return now;
    }
});

