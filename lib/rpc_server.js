//
// RPC library, server side.
// 

var Server = require('socket.io'),
    ServerSingleSocket = require('./rpc_server_single.js');

var debug = true;
var log = function(msg){ }
if(debug)
     log = console.log; 


//see server options
//https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
var defaultOptions = function() {
    return {
        //heartbeat
        pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client)
        pingInterval: 2500, //timeout when server should send heartbeat to client
        defaultReplyTimeOut: Infinity,   //default delay before an RPC call should have its reply. Infinity = no timeout
        leaseLifeTime: 10000,
        leaseRenewOnRPC: true
    };
}
//temp
var selfDestructTime = 30000;

var ServerRpc = function(serverHttp, opts) {
    var options = opts || defaultOptions();
    this.io = new Server(serverHttp, options);
    this.clientChannels = {};
    this.exposedFunctions = {};
    this.onConnectionCallback = function(){};
    var that = this;

    this.io.on('connection', function(socket) {
        var serverSocket = new ServerSingleSocket(socket, options);
        serverSocket.expose(that.exposedFunctions);
        
        console.log('Connection ', serverSocket.id)

        //EVENTS called on server
        //socket.on('disconnect', function(){console.log('disconnect!')}); // on disconnected        
        socket.on('error', function(d){ console.log('error', d)});
        socket.on('reconnect', function(d){ console.log('reconnect', d)});

        socket.on('init', function(data){
            log('== this.clientChannels: ', Object.keys(that.clientChannels).length);

            if (!data.client){   
                var clientId = serverSocket._generateUID('client');
                serverSocket.remoteClientId = clientId;
               log('New client: ', serverSocket.remoteClientId, clientId);
                serverSocket.emit('init-ack', {'client':clientId})
            }else{
                serverSocket.remoteClientId = data.client;
                log('Old client: ', data.client);
                that._flushCalls(serverSocket, data.client);
            }
            that.clientChannels[serverSocket.id] = serverSocket;
            that.onConnectionCallback();
            that.onConnectionCallback = function(){};

            log('== this.clientChannels: ',  Object.keys(that.clientChannels).length);

            socket.on('disconnect', function(){
                setTimeout(function(){
                    log('Self destruct ', serverSocket.id);
                    delete that.clientChannels[serverSocket.id];
                }, selfDestructTime);
            });            
        });

        socket.on('close', function(){
            socket.emit('close-ack');
            serverSocket._close();
            delete that.clientChannels[serverSocket.id];
            
        });

        socket.on('close-ack', function(){
            serverSocket._close();
            delete that.clientChannels[serverSocket.id];
        });

    });       
}


ServerRpc.prototype._flushCalls = function(serverSocket, clientId){
    
    var openFunctionCalls = [];
    var clients = this.clientChannels;
   
    for(var id in clients){
        if(clients.hasOwnProperty(id)) {
            console.log("--- id", clients[id].remoteClientId)
            //find previous socket used
            if (clients[id].remoteClientId === clientId){ 

                openFunctionCalls = clients[id].openCalls();
                delete clients[id];

                break;
            }
        }
    }

    //TODO let new socket handle this
    console.log('--> flushing mailbox: ', openFunctionCalls)
    for (var e in openFunctionCalls){
        
        var thunk = openFunctionCalls[e];
        console.log('Flush CALLING ', thunk.functionName)
        serverSocket.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation);//TODO Due functions...

    }
}

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
}

ServerRpc.prototype.rpcCall = function(name, args, cb) {

    var clients = this.clientChannels
    if(Object.keys(clients).length === 0)
        log('RPC CALL, but no connections');
   
    for(var id in clients){
        if(clients.hasOwnProperty(id)) {
            clients[id].rpcCall(name, args, cb);
        }
    }
};

/*Callback will be invoked on first new connection */
ServerRpc.prototype.onConnection = function(callback){
    this.onConnectionCallback = callback;
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////