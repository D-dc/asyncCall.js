'use strict';
//
// RPC library, server side.
// 
var RPC = require('./rpc.js');
var Lease = require('./lease.js');

var debug = false;
var log = function() {};
if (debug)
    log = console.log;

function ServerSingleSocket(socket, options) {
    log('New connection ', socket.id);
    this.remoteClientId = -1;

    this.RPC = new RPC(socket, options);
    this.id = this.RPC.socket.id;
}

/*ServerSingleSocket.prototype.newLease = function(lease){
	this.RPC.newLease(lease);
}*/

ServerSingleSocket.prototype.close = function() {
    this.RPC.socket.emit('close');
};

ServerSingleSocket.prototype._close = function() {
    log('Closing the connection');
    return this.RPC.socket.conn.close();
};

ServerSingleSocket.prototype.expose = function(o) {
    return this.RPC.expose(o);
};

ServerSingleSocket.prototype.emit = function(e, d) {
    return this.RPC.emit(e, d);
};

ServerSingleSocket.prototype._generateUID = function(n) {
    return this.RPC._generateUID(n);
};

ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due) {
    return this.RPC.rpcCall(name, args, cb, due);
};
ServerSingleSocket.prototype.openCalls = function() {
    return this.RPC.openCalls;
};

module.exports = ServerSingleSocket;