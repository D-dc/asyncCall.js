'use strict';

var debug = true;
var log = function() {};
if (debug)
    log = console.log;

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
    - leaseLifeTime: 60000
        default lifetime of lease, after connection, this is the time the connection lasts.
    - leaseRenewOnCall: true
        when a successful RPC is performed (or received), renew lease lifetime.
    - leaseRenewalTime: 60000
        renew lease by this time when successful RPC send/received
    - defaultRpcTimeout: Infinity
        default delay before an RPC call should have its reply. Infinity = no timeout
*/

var getSocketOptions = function(options){
    //see server options
    //https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
    var opts = {};
    opts.pingTimeout = options.pingTimeout || 6000;
    opts.pingInterval = options.pingInterval || 2500;
    
    return opts;
};


// SERVER RPC
var ServerRpc = function(serverHttp, opts) {
    var self = this;
    if(!opts) opts = {};
    this.io = new Server(serverHttp, getSocketOptions(opts));
    this.clientChannels = {};
    this.exposedFunctions = {};
    this.onConnectionCallback = function() {};

    this.io.on('connection', function(socket) {
        var onExpired = function(id){
            log('deleting ', id);
            delete self.clientChannels[id];
            log('ClientChannels ', Object.keys(self.clientChannels).length);
        };

        var serverSocket = new ServerSingleSocket(socket, opts, onExpired);
        serverSocket.expose(self.exposedFunctions);

        console.log('Connection ', serverSocket.id);

        socket.on('init', function(data) {
            log('== this.clientChannels: ', Object.keys(self.clientChannels).length);

            if (!data.client) {
                
                var clientId = self.generateUID();
                serverSocket.remoteClientId = clientId;
                log('New client: ', serverSocket.remoteClientId, clientId);
                
                serverSocket.emit('init-ack', {
                        'client': clientId
                    });

                serverSocket.initLease(); //new client start with new lease
            } else {
                
                var oldClientId = data.client;
                serverSocket.remoteClientId = oldClientId;
                log('Old client: ', oldClientId);
                if(!self._transfer(serverSocket, oldClientId))
                    serverSocket.initLease();
                
                serverSocket.emit('init-ack');
                
            }

            self.clientChannels[serverSocket.id] = serverSocket;
            self.onConnectionCallback(serverSocket);

            log('== this.clientChannels: ', Object.keys(self.clientChannels).length);
        });
        
        //receive close
        socket.on('close', function() {
            socket.emit('close-ack');
            serverSocket._close();
        });

    });
};

ServerRpc.prototype.generateUID = function(){
    var userID = 'client-' + Math.floor((Math.random() * 1000) + 1) + '-' + Math.floor((Math.random() * 1000) + 1);
    var clients = this.clientChannels;

    for (var id in clients) {
        if (clients[id].remoteClientId === userID) {
            return this.generateUID();
        }
    }

    return userID;
};

ServerRpc.prototype._transfer = function(serverSocket, clientId){
    var oldClient;
    var clients = this.clientChannels;

    for (var id in clients) {
        if (clients.hasOwnProperty(id)) {

            //find previous socket used
            if (clients[id].remoteClientId === clientId) {
                oldClient =  clients[id];
                serverSocket.transfer(oldClient);
                delete clients[id];
                return true;
            }
        }
    }

    return false;
};

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
};

ServerRpc.prototype.rpcCall = function(name, args, callback) {

    var clients = this.clientChannels;
    if (Object.keys(clients).length === 0)
        console.log('RPC CALL, but no connections.');

    for (var id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].rpcCall(name, args, callback);
        }
    }
};

//Close all open sockets...
ServerRpc.prototype.close = function() {

    var clients = this.clientChannels;
    for (var id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].close();
        }
    }
    this.io.eio.ws.close();
};

//Callback will be invoked on every new connection
ServerRpc.prototype.onConnection = function(callback) {
    this.onConnectionCallback = callback;
};



////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ServerRpc;