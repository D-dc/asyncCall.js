'use strict';

var express = require('express'),
    app = express(),
    ServerRpc = require('../../lib/rpc-server.js');


app.use('/client', express.static(__dirname + '/../../client/'));
app.use('/', express.static(__dirname + '/'));


var myServer = new ServerRpc(app);

//Expose functions to be called from client
myServer.expose({
    'ping': function(counter, callback) {
        counter++;
        var that = this; 
        // this points to the call originator.
        // thus, this.rpc(...) will perform the rpc only to the originator! not broadcast as with myServer.rpc.
        // which makes a lot of sense at the server-side.

        setTimeout(function(){
            that.rpc('pong', [counter]);
        }, 2000);

        var now = new Date();
        
        callback(null, now);
    }
});