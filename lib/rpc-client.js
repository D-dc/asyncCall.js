'use strict';

var debug = false;
var log = function() {};
if (debug)
    log = console.log;

var io = require('../node_modules/socket.io/node_modules/socket.io-client'),
    RPC = require('./rpc.js'),
    Storage = require('./storage.js');


//see clientside options
//https://github.com/Automattic/socket.io-client/blob/master/lib/manager.js#L32
var defaultOptions = function() {
    return {
        reconnection: true, //auto reconnect
        reconnectionAttempts: Infinity, //attempts before giving up
        reconnectionDelay: 1000, //how long to wait before reconnect (doubles + randomized by randomizationFactor)
        reconnectionDelayMax: 5000, //max delay before reconnection
        randomizationFactor: 0.5,
        timeout: 2000, //time before connect_error, connect_timeout events
        autoConnect: true, //automatically connect
        defaultRpcTimeout: Infinity, //default delay before an RPC call should have its reply. Infinity = no timeout

        leaseRenewOnExpire: true
    };
};

//
// RPC library, client side.
//

var ClientRpc = function(url, opts) {
    
    this.options = opts || defaultOptions();
    var socket = io(url, this.options);
    this.RPC = new RPC(socket, this.options);
    this.clientId = -1;
    this.storage = new Storage();
    this.url = url;
    
    this._setListeners(socket);
};


ClientRpc.prototype._setListeners = function(socket){
    var that = this;
    socket.on('connect', function() {

        var originalId = that.storage.getItem('client');
        console.log('ID: ', originalId);

        //can be null
        if (!originalId) {
            socket.emit('init', {
                'client': null,
            }); 

            socket.on('init-ack', function(data) {
                that.storage.setItem('client', data.client);
                that.clientId = data.client;
                log('New id received: ', that.clientId);
            });
        } else {
            that.clientId = originalId;
            socket.emit('init', {
                'client': originalId,
                'requestLeaseInfo': ''
            });  

            socket.on('init-ack', function() {});
            
            log('Old id: ', that.clientId);
        }
    });

    socket.on('close', function() {
        socket.emit('close-ack');
        that._close();
    });

    socket.on('lease-expire', function() {
        console.log('lease about to expire, renew', that.options.leaseRenewOnExpire);
        if(that.options.leaseRenewOnExpire)
            socket.emit('lease-expire-reply');
    });
};

//give library user access to socket io events
ClientRpc.prototype.on = function(event, callback){
    return this.RPC.socket.on(event, callback);
};

ClientRpc.prototype.close = function() {
    var that = this;
    this.RPC.socket.emit('close');
    this.RPC.socket.on('close-ack', function() {
        that._close();
    });
};

ClientRpc.prototype._close = function() {
    console.log('Closing the connection');
    this.RPC.socket.close();
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
