'use strict';

var express = require('express'),
    app = express(),
    ServerRpc = require('../../lib/rpc-server.js'),
    port = process.env.PORT || 80;

app.use('/client', express.static(__dirname + '/../../client/'));
app.use('/', express.static(__dirname + '/'));


//We Put calls (chat messages) in queues for 2 minutes.
var options = {
    pingTimeout: 120000, //client2server
    pingInterval: 25000,
    leaseLifeTime: 120000, //server2client
    leaseRenewOnCall: true,
    leaseRenewalTime: 120000,
    defaultRpcTimeout: Infinity
};

// make the ServerRpc by giving the http server, options
var myServer = new ServerRpc(app, port, options);


//Expose functions to be called from client
myServer.expose({
    'sayMsg': function (author, message) {
        console.log('broadcasting to all clients listening');

        myServer.rpcCall('hearMsg', [author, message]);
    }
});