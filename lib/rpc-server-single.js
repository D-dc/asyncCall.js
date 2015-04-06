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
    debug = function () {};


var getRPCOptions = function (options) {
    var opts = {};
    opts.defaultRpcTimeout = options.defaultRpcTimeout || Infinity;
    opts.throwNativeError = false === options.throwNativeError ? false : (options.throwNativeError || true);

    return opts;
};


function ServerSingleSocket(socket, options, server) {
    debug('New connection ', socket.id);

    this.id = -1;
    this.server = server;
    this.RPC = new RPC(socket, getRPCOptions(options));
}


ServerSingleSocket.prototype._newSocket = function (socket) {
    this.RPC.newSocket(socket);
};


//give library user access to socket io events
ServerSingleSocket.prototype.on = function (event, callback) {

    return this.RPC.socket.on(event, callback);

};


ServerSingleSocket.prototype.once = function (event, callback) {

    return this.RPC.socket.once(event, callback);

};


ServerSingleSocket.prototype.close = function () {

    this.RPC.socket.emit('close');
    this._close();

};


ServerSingleSocket.prototype._close = function () {

    debug('Closing the connection');

    if (this.server)
        this.server.deleteChannel(this.id);

    this.server = null;
    return this.RPC.socket.conn.close();

};


ServerSingleSocket.prototype.expose = function (o) {

    return this.RPC.expose(o);

};


ServerSingleSocket.prototype.emit = function (e, d) {

    return this.RPC.emit(e, d);

};


ServerSingleSocket.prototype.generateID = function (n) {

    return this.RPC.generateID(n);

};


ServerSingleSocket.prototype.rpc = function (name, args, cb, due) {

    return this.RPC.rpc(name, args, cb, due);

};


ServerSingleSocket.prototype.openCalls = function () {

    return this.RPC.openCalls;

};


module.exports = ServerSingleSocket;