//
// RPC library, server side.
// 

var Server = require('socket.io'),
    Rpc = require('./public/rpc.js'),
    port = 80;


var ServerSingleSocket = function(socket, opts) {
    this.options = opts;
    Rpc.call(this, socket);
    socket.on("error", function(err) {
        console.error("Server: iosocket error " + err);
    });
}
ServerSingleSocket.prototype = new Rpc();



Rpc.prototype.id = function() {
    return this.socket.id;
}

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
    this.rpcList = [];
    this.exposedFunctions;
    var that = this;

    this.io.on('connection', function(socket) {
        console.log("SOCKET" + socket);
        var s = new ServerSingleSocket(socket, this.options);
        s.expose(that.exposedFunctions);
        that.rpcList.push(s);

    });
}

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////

/*var c=1;
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
             myServer.call("ping", [b])
         }, 2000);
     }
 });*/