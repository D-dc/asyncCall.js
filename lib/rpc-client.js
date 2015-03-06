'use strict';

var debug = true;
var log = function() {};
if (debug)
    log = function(data){ console.log(data)};

var io = require('../node_modules/socket.io/node_modules/socket.io-client'),
    RPC = require('./rpc.js'),
    Lease = require('./lease.js'),
    Storage = require('./storage.js');


//
// RPC library, client side.
//

/*
CLIENT RPC OPTIONS: (defaults are mentioned)
    - reconnection: true
        auto reconnect.
    - reconnectionAttempts: Infinity 
        amount of attempts before giving up.
    - reconnectionDelay: 1000
        how long to wait before reconnect (doubles + randomized by randomizationFactor).
    - reconnectionDelayMax: 5000
        max delay before reconnection.
    - randomizationFactor: 0.5
        for the reconnection attempts.
    - timeout: 2000
        time before connect_error, connect_timeout events.
    - autoConnect: true
        automatically connect.
    - defaultRpcTimeout: Infinity
        default delay before an RPC call should have its reply. Infinity = no timeout.
    - leaseRenewOnExpire: true
        when the server says the lease expires, extend the lease.
*/

var getSocketOptions = function(options){
    //clientside options see:
    //https://github.com/Automattic/socket.io-client/blob/master/lib/manager.js#L32
    var opts = {};
    opts.reconnection = false === options.reconnection ? false : (options.reconnection || true);
    opts.reconnectionAttempts = options.reconnectionAttempts || Infinity;
    opts.reconnectionDelay = options.reconnectionDelay || 1000;
    opts.reconnectionDelayMax = options.reconnectionDelayMax || 5000;
    opts.randomizationFactor = options.randomizationFactor || 0.5;
    opts.timeout = options.timeout || 2000;
    opts.autoConnect = false === options.autoConnect ? false : (options.autoConnect || true);
    
    return opts;
};

var getRPCOptions = function(options){
    var opts = {};
    opts.defaultRpcTimeout = options.defaultRpcTimeout || Infinity;
    
    return opts;
};

// CLIENT RPC
var ClientRpc = function(url, opts) {
    var self = this;
    if(!opts) opts = {};
    this.setClientOptions(opts);
    var socket = io(url, getSocketOptions(opts));
    this.lease = new Lease(Infinity);
    var onCallReceived = function(){self.lease.renewOnRpc();};
    var onReplyReceived = function(){self.lease.renewOnRpc();};
    this.RPC = new RPC(socket, getRPCOptions(opts), onCallReceived, onReplyReceived);
    this.onExpired = function(){
            console.log('5 seconds')
            self.closeExpire = setTimeout(function(){
                if(!self.lease.expired){
                    console.log('expired!');
                    self.RPC.failOpenCalls();
                    self.close();
                }
                
            }, 5000); //todo  
        };
    
    this.clientId = -1;
    this.storage = new Storage();
    this.url = url;
     
    this._setListeners(socket);
};

ClientRpc.prototype.setClientOptions = function(options){
    this.leaseRenewOnExpire = false === options.leaseRenewOnExpire ? false : (options.leaseRenewOnExpire || true);
};

ClientRpc.prototype._setListeners = function(socket){
    var self = this;
    socket.on('connect', function() {

        var originalId = self.storage.getItem('client');
        console.log('ID: ', originalId);

        //can be null
        if (!originalId) {
            socket.emit('init', {
                'client': null,
            }); 

            socket.once('init-ack', function(data) {
                self.storage.setItem('client', data.client);
                self.clientId = data.client;
                log('New id received: ', self.clientId);
                self.setLease(data.timeLeft, data.renewOnCall, data.renewalTime);
            });
        } else {
            self.clientId = originalId;
            socket.emit('init', {
                'client': originalId
            });  

            socket.once('init-ack', function(data) {
                self.setLease(data.timeLeft, data.renewOnCall, data.renewalTime);
            });
            
            log('Old id: ', self.clientId);
        }
    });

    //receive close
    socket.on('close', function() {
        //console.log(self.RPC.socket);
        if(self.RPC.socket.connected){
            socket.emit('close-ack');
            self._close();
        }
    });

    socket.on('lease-expire', function() {
        console.log('lease about to expire, renew', self.leaseRenewOnExpire);
        if(self.leaseRenewOnExpire){
            if(self.closeExpire) clearTimeout(self.closeExpire);
            socket.emit('lease-expire-reply');
            self.lease.renewOnExpire();
        }
    });
};

ClientRpc.prototype.setLease = function(timeLeft,renewOnCall,renewalTime){
    console.log('NEW LEASE', timeLeft,renewOnCall,renewalTime);
    this.lease.revoke();
    this.lease = new Lease (
        timeLeft, 
        this.onExpired, 
        renewOnCall, 
        renewalTime);
};

//give library user access to socket io events
ClientRpc.prototype.on = function(event, callback){
    return this.RPC.socket.on(event, callback);
};

ClientRpc.prototype.close = function() {
    this.RPC.socket.emit('close');
    this._close();
};

ClientRpc.prototype._close = function() {
    //if(this.RPC.socket.connected){
        log('Closing the connection');
        this.RPC.socket.close();
    //}
};

ClientRpc.prototype._open = function() {
   
   log('Opening the connection');
    this.RPC.socket.open();
};


ClientRpc.prototype.id = function() {
    return this.socket.io.engine.id;
};

ClientRpc.prototype.expose = function(o) {
    this.RPC.expose(o);
};

ClientRpc.prototype.rpcCall = function(name, args, callback, due) {
    this.RPC.rpcCall(name, args, callback, due);
};

////////////////////////////////////////////////////////////////////////////////////////////


module.exports = ClientRpc;
global.ClientRpc = ClientRpc;
