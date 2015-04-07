'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

var debug = require('debug')('rpc rpc server.js');

var _debug = true;
if (!_debug)
    debug = function () {};

var Server = require('socket.io'),
    ServerSingleSocket = require('./rpc-server-single.js');

//
// RPC library, server side.
// 

/*
SERVER RPC OPTIONS: (defaults are mentioned)
    - pingTimeout: 6000
        timeout from client to receive new heartbeat from server (value shipped to client).
    - pingInterval: 2500
        timeout when server should send heartbeat to client.
    - defaultRpcTimeout: Infinity
        default delay before an RPC call should have its reply. Infinity = no timeout
*/

var getSocketOptions = function (options) {
    //see server options
    //https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
    var opts = {};
    opts.pingTimeout = options.pingTimeout || 6000;
    opts.pingInterval = options.pingInterval || 2500;

    return opts;
};


// SERVER RPC
var ServerRpc = function (serverHttp, opts) {
    var self = this;

    opts = opts || {};
    this.io = new Server(serverHttp, getSocketOptions(opts));
    this.clientChannels = {};
    this.exposedFunctions = {};
    this.onConnectionCallback = function () {};

    this.io.on('connection', function (socket) {


        console.log('Connection ', socket.id);
        console.log('== self.clientChannels: ', Object.keys(self.clientChannels).length);
        var serverSocket;

        socket.once('init', function (data) {
            var clientId = data.client || self.generateUID();
            var oldSocket = self._findById(clientId);

            if (oldSocket) {

                oldSocket._newSocket(socket);
                oldSocket.expose(self.exposedFunctions);
                serverSocket = oldSocket;

                console.log('oldSocket: ');

            } else {

                serverSocket = new ServerSingleSocket(socket, opts, self);
                serverSocket.expose(self.exposedFunctions);

                console.log('newSocket: ');
                self.clientChannels[clientId] = serverSocket;

            }
            serverSocket.id = clientId;
            socket.emit('init-ack', {
                'client': clientId,
                'recMsgCounter': serverSocket.RPC.recMsgCounter
            });

            serverSocket.RPC.sendMsgCounter = Math.max(data.recMsgCounter, serverSocket.RPC.sendMsgCounter);
            serverSocket.RPC.init();
            self.onConnectionCallback(serverSocket);

            console.log('== self.clientChannels: ', Object.keys(self.clientChannels).length);

        });


        //receive close
        socket.on('close', function () {
            socket.emit('close-ack');
            serverSocket._close();
        });

    });
};


ServerRpc.prototype.generateUID = function () {
    var userID = 'client-' + Math.floor((Math.random() * 1000) + 1) + '-' + Math.floor((Math.random() * 1000) + 1);
    var clients = this.clientChannels;

    for (var id in clients) {
        if (clients[id].id === userID) {
            return this.generateUID();
        }
    }

    return userID;
};

ServerRpc.prototype._findById = function (clientId) {
    var clients = this.clientChannels;

    for (var id in clients) {
        console.log(' - ', clients[id].id);
        if (clients.hasOwnProperty(id)) {

            //find previous socket used
            if (clients[id].id === clientId) {
                return clients[id];
            }
        }
    }

    return false;
};


ServerRpc.prototype.expose = function (o) {
    this.exposedFunctions = o;
};


//broadcast
ServerRpc.prototype.rpc = function (name, args, callback) {

    var clients = this.clientChannels;
    if (Object.keys(clients).length === 0)
        debug('RPC CALL, but no connections.');

    for (var id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].rpc(name, args, callback);
        }
    }
};


//call a specific client
ServerRpc.prototype.rpcTo = function (receiverClient, name, args, callback, due) {
    var serverSocket = this._findById(receiverClient);
    return serverSocket.rpc(name, args, callback, due);
};


ServerRpc.prototype.deleteChannel = function (id) {
    debug('deleting ', id);

    delete this.clientChannels[id];
    debug('== self.clientChannels: ', Object.keys(this.clientChannels).length);
};


//Close all open sockets...
ServerRpc.prototype.close = function () {

    var clients = this.clientChannels;
    for (var id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].close();
        }
    }
    this.io.eio.ws.close();
};


//Callback will be invoked on every new connection
ServerRpc.prototype.onConnection = function (callback) {
    this.onConnectionCallback = callback;
};



////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ServerRpc;