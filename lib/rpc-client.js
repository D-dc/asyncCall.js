'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

var debug = require('debug')('rpc rpc client.js');

var _debug = true;
if (!_debug)
    debug = function () {};

var io = require('../node_modules/socket.io/node_modules/socket.io-client'),
    RPC = require('./rpc.js'),
    Storage = require('./storage.js');

require('./lease.js');


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
*/

var getSocketOptions = function (options) {
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


var getRPCOptions = function (options) {
    var opts = {};
    opts.defaultRpcTimeout = options.defaultRpcTimeout || Infinity;
    opts.throwNativeError = false === options.throwNativeError ? false : (options.throwNativeError || true);

    return opts;
};


// CLIENT RPC
var ClientRpc = function (url, opts, storage) {
    opts = opts || {};

    var socket = new io(url, getSocketOptions(opts));
    this._setListeners(socket);
    this.RPC = new RPC(socket, getRPCOptions(opts));

    //this.onConnectionCallback = function () {};
    this.id = -1;
    this.storage = storage || new Storage();
    this.url = url;


};


ClientRpc.prototype._setListeners = function (socket) {
    var self = this;
    socket.on('connect', function () {

        var originalId = self.storage.getItem('client') || null;
        console.log('ID: ', originalId, self.RPC.recMsgCounter);

        socket.emit('init', {
            'client': originalId,
            'recMsgCounter': self.RPC.recMsgCounter
        });

        socket.once('init-ack', function (data) {
            self.storage.setItem('client', data.client);
            self.id = data.client;

            self.RPC.sendMsgCounter = Math.max(data.recMsgCounter, self.RPC.sendMsgCounter);

            console.log('New id received: ', self.id, self.RPC.sendMsgCounter);

            //Only now everything is initialized
            self.RPC.init();
        });


        //self.onConnectionCallback(self);


    });

    //receive close
    // socket.on('close', function () {

    //     if (self.RPC.socket.connected) {
    //         socket.emit('close-ack');
    //         self._close();
    //     }
    // });

};


//Give library user access to socket io events
ClientRpc.prototype.on = function (event, callback) {

    return this.RPC.socket.on(event, callback);

};


ClientRpc.prototype.once = function (event, callback) {

    return this.RPC.socket.once(event, callback);

};


// ClientRpc.prototype.close = function () {

//     this.RPC.socket.emit('close');
//     this._close();

// };


ClientRpc.prototype._close = function () {

    debug('Closing the connection');
    this.RPC.socket.close();

};


ClientRpc.prototype._open = function () {

    debug('Opening the connection');
    this.RPC.socket.open();

};


ClientRpc.prototype.id = function () {

    return this.socket.io.engine.id;

};


ClientRpc.prototype.expose = function (o) {

    this.RPC.expose(o);

};


ClientRpc.prototype.rpc = function (name, args, callback, due) {

    this.RPC.rpc(name, args, callback, due);

};


//Callback will be invoked on every new connection
// ClientRpc.prototype.onConnection = function (callback) {

//     this.onConnectionCallback = callback;

// };

ClientRpc.prototype.onConnected = function (callback) {

    this.RPC.onConnectedExec(callback);

};


ClientRpc.prototype.onDisconnected = function (callback) {

    this.RPC.onDisconnectedExec(callback);

};


ClientRpc.prototype.onceConnected = function (callback) {

    this.RPC.onceConnectedExec(callback);

};


ClientRpc.prototype.onceDisconnected = function (callback) {

    this.RPC.onceDisconnectedExec(callback);

};


module.exports = ClientRpc;
global.ClientRpc = ClientRpc;