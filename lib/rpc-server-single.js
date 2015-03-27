'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

//
// RPC library, server side.
// 
var RPC = require('./rpc.js');
var Lease = require('./lease.js');

var debug = true;
var log = function() {};
if (debug)
    log = console.log;


var getRPCOptions = function(options){
    var opts = {};
    opts.defaultRpcTimeout = options.defaultRpcTimeout || Infinity;
    
    return opts;
};

function ServerSingleSocket(socket, options, server){//, executeOnExpired) {
    var self = this;
    // var onCallReceived = function(){self.lease.renewOnRpc();};
    // var onReplyReceived = function(){self.lease.renewOnRpc();};
    log('New connection ', socket.id);
    this.setServerOptions(options);
    //this.lease = new Lease(Infinity);
    this.remoteClientId = -1;
    this.server = server;
    // this.onExpired = function(){
    //         var socket = self.RPC.socket;
    //         socket.emit('lease-expire');

    //         var actualExpire = setTimeout(function(){
    //             console.log('expired!');
    //             self.RPC.failOpenCalls();
    //             self.close();
    //         }, 5000); //todo

    //         socket.once('lease-expire-reply', function(){
    //             log('got lease-expire-reply');
    //             clearTimeout(actualExpire);
    //             self.lease.renewOnExpire();
    //         });
    //     };
    this.RPC = new RPC(socket, getRPCOptions(options));//, onCallReceived, onReplyReceived);
    this.id = this.RPC.socket.id;


    this.RPC.socket.once('init', function(data) {
        

        if (!data.client) { //new client
            
            var clientId = self.server.generateUID();
            self.remoteClientId = clientId;
            //self.initLease(); //new client start with new lease
            log('New client: ', self.remoteClientId);
            
            socket.emit('init-ack', {
                    'client': clientId,
                    //'timeLeft': self.lease.timeLeaseLeft(),
                    //'renewOnCall': self.lease.renewOnCall,
                    //'renewalTime': self.lease.renewalTime
                });

            
        } else { //old client
            
            var oldClientId = data.client;
            self.remoteClientId = oldClientId;
            log('Old client: ', oldClientId);
            // if(!self.server._transfer(self, oldClientId))
            //     self.initLease();
            
            self.emit('init-ack', {
                // 'timeLeft': self.lease.timeLeaseLeft(),
                // 'renewOnCall': self.lease.renewOnCall,
                // 'renewalTime': self.lease.renewalTime
            });
            
        }
        self.server.clientChannels[self.id] = self;
        self.server.onConnectionCallback(self);
        
    });

}

ServerSingleSocket.prototype.setServerOptions = function(options){
    // this.leaseLifeTime = options.leaseLifeTime || 60000;
    // this.leaseRenewOnCall = false === options.leaseRenewOnCall ? false : (options.leaseRenewOnCall || true);
    // this.leaseRenewalTime = options.leaseRenewalTime || 60000;
};

// ServerSingleSocket.prototype.initLease = function(){
//     console.log('New lease with ', this.leaseLifeTime, this.leaseRenewOnCall);

// 	this.lease = new Lease (
//         this.leaseLifeTime, 
//         this.onExpired, 
//         this.leaseRenewOnCall, 
//         this.leaseRenewalTime);
// };

ServerSingleSocket.prototype.transfer = function(OldSingleSocket){
    this._rpcCallFlush(OldSingleSocket.openCalls());
    //this.transferLease(OldSingleSocket.lease);
    OldSingleSocket.close();
};

// ServerSingleSocket.prototype.transferLease = function(lease){
//     log('Transfering Lease');
    

//     if(lease.isExpired){
//         log(' Lease expired while transfering');
//         lease.renewOnExpire();
//         lease.invokeOnExpire = this.onExpired;
//         this.lease = lease;

//     }else{
//         log(' Normal transfer of lease');
//         lease.renewOnRpc();
//         lease.invokeOnExpire = this.onExpired;
//         this.lease = lease;
//     }
// };

ServerSingleSocket.prototype._rpcCallFlush = function(thunks) {
    for (var e in thunks) {

        var thunk = thunks[e];
        console.log('Flush CALLING ', thunk.functionName);
        this.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation); //TODO Due functions...

    }
};

//give library user access to socket io events
ServerSingleSocket.prototype.on = function(event, callback){
    return this.RPC.socket.on(event, callback);
};

ServerSingleSocket.prototype.close = function() {
    this.RPC.socket.emit('close');
    this._close();
};

ServerSingleSocket.prototype._close = function() {
    console.log('Closing the connection');
    
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

ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due) {
    return this.RPC.rpcCall(name, args, cb, due);
};

ServerSingleSocket.prototype.openCalls = function() {
    return this.RPC.openCalls;
};

////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ServerSingleSocket;