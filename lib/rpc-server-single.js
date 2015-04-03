'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

//
// RPC library, server side.
// 
var RPC = require('./rpc.js');

var debug = require('debug')('rpc rpc server single.js');

var _debug = true;
if (!_debug)
    debug = function() {};


var getRPCOptions = function(options){
    var opts = {};
    opts.defaultRpcTimeout = options.defaultRpcTimeout || Infinity;
    opts.throwNativeError = false === options.throwNativeError ? false : (options.throwNativeError || true);
    
    return opts;
};

function ServerSingleSocket(socket, options, server){//, executeOnExpired) {
    var self = this;

    debug('New connection ', socket.id);
    this.setServerOptions(options);

    this.id = -1;
    this.server = server;
    this.RPC = new RPC(socket, getRPCOptions(options));//, onCallReceived, onReplyReceived);
    this.id = this.RPC.socket.id;


    this.RPC.socket.once('init', function(data) {
        

        if (!data.client) { //new client
            
            var clientId = self.server.generateUID();
            self.id = clientId;
            //self.initLease(); //new client start with new lease
            debug('New client: ', self.id);
            
            socket.emit('init-ack', {
                    'client': clientId,
                });

            
        } else { //old client
            
            var oldClientId = data.client;
            self.id = oldClientId;
            debug('Old client: ', oldClientId);
            
            self.emit('init-ack', {});
            
        }

        if(!self.RPC.sendMsgCounter)
            self.RPC.sendMsgCounter = 1;
        if(!self.RPC.recMsgCounter)
            self.RPC.recMsgCounter = 1;

        self.server.clientChannels[self.id] = self;
        self.server.onConnectionCallback(self);
        
    });

}

ServerSingleSocket.prototype.setServerOptions = function(options){
    // this.leaseLifeTime = options.leaseLifeTime || 60000;
    // this.leaseRenewOnCall = false === options.leaseRenewOnCall ? false : (options.leaseRenewOnCall || true);
    // this.leaseRenewalTime = options.leaseRenewalTime || 60000;
};

ServerSingleSocket.prototype.transfer = function(OldSingleSocket){
    this._rpcCallFlush(OldSingleSocket.openCalls());
    //this.transferLease(OldSingleSocket.lease);
    OldSingleSocket.close();
};

ServerSingleSocket.prototype._rpcCallFlush = function(thunks) {
    for (var e in thunks) {

        var thunk = thunks[e];
        debug('Flush CALLING ', thunk.functionName);
        this.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation); //TODO Due functions...

    }
};

//give library user access to socket io events
ServerSingleSocket.prototype.on = function(event, callback){
    return this.RPC.socket.on(event, callback);
};

ServerSingleSocket.prototype.once = function(event, callback){
    return this.RPC.socket.once(event, callback);
};

ServerSingleSocket.prototype.close = function() {
    this.RPC.socket.emit('close');
    this._close();
};

ServerSingleSocket.prototype._close = function() {
    debug('Closing the connection');
    
    if(this.server)
      this.server.deleteChannel(this.id);
    
    this.server = null;
    //this.executeOnExpired(this.id);
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

ServerSingleSocket.prototype.rpc = function(name, args, cb, due) {
    return this.RPC.rpc(name, args, cb, due);
};

ServerSingleSocket.prototype.openCalls = function() {
    return this.RPC.openCalls;
};

////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ServerSingleSocket;