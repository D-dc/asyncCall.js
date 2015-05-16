'use strict';

var express = require('express'),
    app = express(),
    ServerRpc = require('../../lib/rpc-server.js');

app.use('/client', express.static(__dirname + '/../../client/'));
app.use('/', express.static(__dirname + '/'));


var myServer = new ServerRpc(app);


//Exposed interface.
myServer.expose({
    'sayMsg': function (author, message, callback) {
        console.log('broadcasting to all clients listening');

        myServer.rpc('hearMsg', author, message);
    }
});