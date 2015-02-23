'use strict';

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('./lib/rpc-server.js'),
    port = process.env.PORT || 80;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use('/', express.static(__dirname + '/'));



var options = {
    pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client)
    pingInterval: 2500, //timeout when server should send heartbeat to client
    
    leaseLifeTime: 60000, //default lifetime of lease, after connection, this is the time the connection lasts
    leaseRenewOnCall: false, //when a successful RPC is performed (or received), renew lease lifetime.
    leaseRenewalTime: 60000, //renew lease by this time when successful RPC send/received

    connectionRemoveTime: 120000, //time before a disconnected socket is cleared
    defaultRpcTimeout: Infinity //default delay before an RPC call should have its reply. Infinity = no timeout
};

var myServer = new ServerRpc(serverHttp, options);

var c = 1;

myServer.expose({
     'testRemote': function(a, b) {
         //excess arguments are accessible via 'arguments'
         var args = Array.prototype.slice.call(arguments);
         console.log('testRemote called, args: ' + args);
         c++;
         return a + b + c;
     },
     'pong': function(b) {
         b = b + 1;
         console.log('pong ' + b);
         setTimeout(function() {
             myServer.rpcCall('ping', [b])
         }, 2000);
     },
     'slow': function() {
        //pausecomp(10000);
     },
     'triggerException': function(){
        var d;
        d.getA;
     }
});


var d = 0;


myServer.onConnection(function(client){
    console.log('CLIENT')
    //To RPC a specific client use client.rpcCall
    //To broadcast to all clients use server.rpcCall 

});

var callClient = function() {
        console.log('testClient ' + d);

        //This is considered a broadcast!
        myServer.rpcCall('testClient', [d], function(err, res) {
            console.log('testClient reply ' + d);
            d++;
            
        });


        setTimeout(function(){callClient();}, 5000);
    };
callClient();




/*var e =0;
callClientFast = function() {
    console.log('testClient ' + d, e);
    if(e>20)return
        e++;
    myServer.rpcCall('testClient', [d], function(err, res) {
        console.log('testClient reply ' + d);
        d++;
        
    });
    setTimeout(callClientFast(), 50);};


setTimeout(function(){callClientFast();}, 10000);;*/
//console.log('testClient')