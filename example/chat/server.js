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
    pingTimeout: 30000, //timeout from client to receive new heartbeat from server (value shipped to client) = time client to server calls are buffered!                 //
    pingInterval: 2500, //timeout when server should send heartbeat to client
    leaseLifeTime: 30000, //default lifetime of lease, after connection, this is the time the connection lasts
    leaseRenewOnCall: true, //when a successful RPC is performed (or received), renew lease lifetime.
    leaseRenewalTime: 15000, //renew lease by this time when successful RPC send/received
    defaultRpcTimeout: Infinity //default delay before an RPC call should have its reply. Infinity = no timeout
};

// make the ServerRpc by giving the http server, options
var myServer = new ServerRpc(serverHttp, options);


//Expose functions to be called from client
myServer.expose({
     'sayMsg': function(author, message) {
        console.log('broadcasting to all clients listening');
        
        myServer.rpcCall('hearMsg', [author, message]);
    }
});