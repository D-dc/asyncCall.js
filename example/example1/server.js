'use strict';

var express = require('express'),
    app = express(),
    ServerRpc = require('../../lib/rpc-server.js'),
    port = process.env.PORT || 3000;


app.use('/client', express.static(__dirname + '/../../client/'));
app.use('/', express.static(__dirname + '/'));


var options = {
    debugMode:false
};


// make the ServerRpc by giving the http server, options
var myServer = new ServerRpc(app, port, options);

var c = 1;

//Expose functions to be called from client
myServer.expose({
     'testRemote': function(a, b, d, callback) {
         //excess arguments are accessible via 'arguments' variable
         var args = Array.prototype.slice.call(arguments);
         console.log('testRemote called');
         c++;
         callback(null, a + b + c);
     },
     'triggerException': function(callback){
        var d;
        d.getA; // will trigger TypeError
        callback(null, d);
     }
});

var d = 0;


//to retrieve the 'client', send RPCs to a single client.
myServer.onConnection(function(client){

    //EVENTS called on server
    client.on('disconnect', function(){ console.log('disconnect!');}); // on disconnected        
    client.on('error', function(d) { console.log('error', d);});
    client.on('reconnect', function(d) { console.log('reconnect', d);});

    //To RPC a specific client use client.rpc
    //To broadcast to all clients use server.rpc 
});


//perform broadcast from server.
var callClient = function() {
    console.log('testClient ' + d);

    //We call the testclient function on every connected client.
    //temporarily disconnected clients will receive the call upon reconnection.
    myServer.rpc('testClient', d, function(err, res) {
        console.log('testClient reply ', err, res);
        d++;    
    });

    //keep on calling the 'testClient' function on every connected client.
    setTimeout(function(){callClient();}, 5000);
};
callClient();
