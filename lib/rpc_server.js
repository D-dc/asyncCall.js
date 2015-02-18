//
// RPC library, server side.
// 

var Server = require('socket.io'),
    ServerSingleSocket = require('./rpc_server_single.js');

var debug = true;
var log = function(msg){
    if(debug)
        console.log(msg);
}    


//see server options
//https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
var defaultOptions = function() {
    return {
        //heartbeat
        pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client)
        pingInterval: 2500, //timeout when server should send heartbeat to client
        defaultReplyTimeOut: Infinity   //default delay before an RPC call should have its reply. Infinity = no timeout
    };
}

var ServerRpc = function(serverHttp, opts) {
    var options = opts || defaultOptions();
    this.io = new Server(serverHttp, options);
    this.connectedClients = [];
    this.exposedFunctions = [];
    this.onConnectionCallback = function(){};
    var that = this;

    this.io.on('connection', function(socket) {
        var serverSocket = new ServerSingleSocket(socket, options);
        serverSocket.expose(that.exposedFunctions);
        
        console.log('OPEN CONNECTIONS:', that.connectedClients.length);


        //EVENTS called on server
        socket.on('disconnect', function(){console.log('disconnect!')}); // on disconnected        
        socket.on('error', function(d){ console.log('error', d)});

        socket.on('init', function(data){
            if (!data.client){   
                var clientId = serverSocket._generateUID('client');
                serverSocket.remoteClientId = clientId;
                console.log('new client set id ', serverSocket.remoteClientId, clientId);
                serverSocket.emit('init-reply', {'client':clientId})
            }else{
                serverSocket.remoteClientId = data.client;
                console.log('original client ', data.client);
                that._flushCalls(serverSocket, data.client);
            }
            that.connectedClients.push(serverSocket);
            that.onConnectionCallback();
            that.onConnectionCallback = function(){};
        });

    });       
}


ServerRpc.prototype._flushCalls = function(serverSocket, clientId){
    console.log('== this.connectedClients: ', this.connectedClients.length);
    var openFunctionCalls = [];
    for (var c in this.connectedClients){
        console.log("--- id", this.connectedClients[c].remoteClientId)
        //find previous socket used
        if (this.connectedClients[c].remoteClientId === clientId){ 

            openFunctionCalls = this.connectedClients[c].openCalls();
            delete this.connectedClients[c];
            this.connectedClients.splice(c, 1);

            break;
        }
    }

    //TODO let new socket handle this
    console.log('--> flushing mailbox: ', openFunctionCalls)
    for (var e in openFunctionCalls){
        
        var thunk = openFunctionCalls[e];
        console.log('Flush CALLING ', thunk.functionName)
        serverSocket.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation);//TODO Due functions...

    }
    console.log('== this.connectedClients: ', this.connectedClients.length);
}

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
}

ServerRpc.prototype.rpcCall = function(name, args, cb) {
    if (this.connectedClients.length === 0)
        throw new Error('RPC CALL, but no connections');

    for (var c in this.connectedClients){
        this.connectedClients[c].rpcCall(name, args, cb);
    }
};

/*Callback will be invoked on first new connection */
ServerRpc.prototype.onConnection = function(callback){
    this.onConnectionCallback = callback;
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////