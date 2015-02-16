//
// RPC library, server side.
// 

var Server = require('socket.io'),
    ServerSingleSocket = require('./public/rpc.js'),
    port = process.env.PORT || 80;




//see server options
//https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
var defaultOptions = function() {
    return {
        //heartbeat
        pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client)
        pingInterval: 2500, //timeout when server should send heartbeat to client
    };
}

var ServerRpc = function(serverHttp, opts) {
    this.options = opts || defaultOptions();
    this.io = new Server(serverHttp, this.options);
    this.connectedClients = [];
    this.exposedFunctions;
    var that = this;

    this.io.on('connection', function(socket) {
        console.log("SOCKET" + socket);
        var s = new ServerSingleSocket(socket, this.options);
        s.expose(that.exposedFunctions);
        that.connectedClients.push(s);


    });
}

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
}

ServerRpc.prototype.rpcCall = function(name, args, cb) {
    for (var c in this.connectedClients){
        this.connectedClients[c].rpcCall(name, args, cb);
    }
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////


var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    Rpc = require('./public/rpc.js');

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/public'));




var c=1;
var myServer = new ServerRpc(serverHttp);
myServer.expose({
     'testRemote': function(a, b) {
        console.log("testRemote called")
         //excess arguments are accessible via 'arguments'
         var args = Array.prototype.slice.call(arguments);
         console.log('received args' + args);
         console.log("testRemote called, args: " + a + " " + b);
         c++
         return a + b;
     },
     'pong': function(b) {
         b = b + 1;
         console.log("pong " + b);
         setTimeout(function() {
             myServer.rpcCall("ping", [b])
         }, 2000);
     }
 });



