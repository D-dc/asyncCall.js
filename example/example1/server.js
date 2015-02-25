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


var options = {
    pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client) = time client to server calls are buffered!                 //
    pingInterval: 2500, //timeout when server should send heartbeat to client
    leaseLifeTime: 15000, //default lifetime of lease, after connection, this is the time the connection lasts
    leaseRenewOnCall: false, //when a successful RPC is performed (or received), renew lease lifetime.
    leaseRenewalTime: 15000, //renew lease by this time when successful RPC send/received
    defaultRpcTimeout: Infinity //default delay before an RPC call should have its reply. Infinity = no timeout
};


// make the ServerRpc by giving the http server, options
var myServer = new ServerRpc(serverHttp, options);

var c = 1;

//Expose functions to be called from client
myServer.expose({
     'testRemote': function(a, b) {
         //excess arguments are accessible via 'arguments' variable
         var args = Array.prototype.slice.call(arguments);
         console.log('testRemote called, args: ' + args);
         c++;
         return a + b + c;
     },
     'triggerException': function(){
        var d;
        d.getA; // will trigger TypeError
     }
});

var d = 0;


//to retrieve the 'client', send RPCs to a single client.
myServer.onConnection(function(client){

    //EVENTS called on server
    client.on('disconnect', function(){ console.log('disconnect!');}); // on disconnected        
    client.on('error', function(d) { console.log('error', d);});
    client.on('reconnect', function(d) { console.log('reconnect', d);});

    
    //To RPC a specific client use client.rpcCall
    //To broadcast to all clients use server.rpcCall 
});


//perform broadcast from server.
var callClient = function() {
    console.log('testClient ' + d);

    //We call the testclient function on every connected client.
    //temporarily disconnected clients will receive the call upon reconnection.
    myServer.rpcCall('testClient', [d], function(err, res) {
        console.log('testClient reply ' + d);
        d++;    
    });

    //keep on calling the 'testClient' function on every connected client.
    setTimeout(function(){callClient();}, 5000);
};
callClient();