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

function ServerSingleSocket(socket, options, onExpired) {
    var that = this;
    var onCallReceived = function(){that.lease.renewOnRpc();};
    var onReplyReceived = function(){that.lease.renewOnRpc();};
    log('New connection ', socket.id);
    this.lease = new Lease(Infinity);
    this.remoteClientId = -1;
    this.options = options;
    this.onExpired = onExpired;
    this.RPC = new RPC(socket, this.options, onCallReceived, onReplyReceived);
    this.id = this.RPC.socket.id;
    
}

ServerSingleSocket.prototype.initLease = function(){
    var that = this;
    log('New lease with ', this.options.leaseLifeTime, this.options.leaseRenewOnCall);
    var lease = new Lease (
        this.options.leaseLifeTime, 
        function(){
            console.log('expired!');
            that.close();
            that.onExpired(that.id);

        }, 
        this.options.leaseRenewOnCall, 
        this.options.leaseRenewalTime);

	this.lease = lease;
};

ServerSingleSocket.prototype.transfer = function(OldSingleSocket){
    this._rpcCallFlush(OldSingleSocket.openCalls());
    this.transferLease(OldSingleSocket.lease);
};

ServerSingleSocket.prototype.transferLease = function(lease){
    var that = this;
    console.log('Transfering Lease ');
    lease.renewOnRpc();
    lease.invokeOnExpire = function(){ //overwrite
            console.log('expired!');
            that.close();
            that.onExpired(that.id);
        };
    
    this.lease = lease;
};

ServerSingleSocket.prototype._rpcCallFlush = function(thunks) {
    for (var e in thunks) {

        var thunk = thunks[e];
        console.log('Flush CALLING ', thunk.functionName);
        this.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation); //TODO Due functions...

    }
};

ServerSingleSocket.prototype.close = function() {
    return this.RPC.socket.emit('close');
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

ServerSingleSocket.prototype.generateID = function(n) {
    return this.RPC.generateID(n);
};

ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due) {
    return this.RPC.rpcCall(name, args, cb, due);
};

ServerSingleSocket.prototype.openCalls = function() {
    return this.RPC.openCalls;
};

////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ServerSingleSocket;