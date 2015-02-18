var RPC = require('./rpc.js');

var debug = false;

var log = function(msg){
    if(debug)
        console.log(msg);
}

function ServerSingleSocket(socket, options) {
    log("New connection ",socket.id);
    
    this.remoteClientId = -1;

    this.RPC = new RPC(socket, options);

    socket.on("error", function(err) {
        console.error("Server: iosocket error " + err);
    });  
};

ServerSingleSocket.prototype.id = function() {
    return this.socket.id;
}

ServerSingleSocket.prototype.expose = function(o){
	return this.RPC.expose(o);
}

ServerSingleSocket.prototype._generateUID = function(n){
	return this.RPC._generateUID(n);
}

ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due){
	return this.RPC.rpcCall(name, args, cb, due);
}
ServerSingleSocket.prototype.openCalls = function(){
	return this.RPC.openCalls;
}

module.exports = ServerSingleSocket;