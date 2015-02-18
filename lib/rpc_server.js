//
// RPC library, server side.
// 

var Server = require('socket.io'),
    ServerSingleSocket = require('./rpc_server_single.js');

var debug = false;

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
    var that = this;

    this.io.on('connection', function(socket) {
        //console.log(socket.server);
        var serverSocket = new ServerSingleSocket(socket, options);
        serverSocket.expose(that.exposedFunctions);
        that.connectedClients.push(serverSocket);
        console.log('OPEN CONNECTIONS:', that.connectedClients.length);


        //EVENTS called on server
        socket.on('disconnect', function(){console.log('disconnect!')}); // on disconnected        
        socket.on('error', function(d){ console.log('error', d)});

            socket.on('init', function(data){ //TODO cleanup

                if (!data.client){   
                    var clientId = serverSocket._generateUID('client');
                    serverSocket.remoteClientId = clientId;
                    console.log('new client set id ', serverSocket.remoteClientId, clientId);
                    socket.emit('init-reply', {'client':clientId})
                }else{
                    console.log('original client ', data.client);
                    that._flushCalls(serverSocket, data.client);
                }
            })
        });
        
}

ServerRpc.prototype._flushCalls = function(serverSocket, clientId){
    console.log('== this.connectedClients: ', this.connectedClients.length);
    var openFunctionCalls = [];
    for (var c in this.connectedClients){

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
    //console.log("connectedClients ", this.connectedClients.length)
    for (var c in this.connectedClients){
        //console.log('- calling', name, this.connectedClients[c].id())
        this.connectedClients[c].rpcCall(name, args, cb);
    }
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////






