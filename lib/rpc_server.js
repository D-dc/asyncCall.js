//
// RPC library, server side.
// 

var Server = require('socket.io'),
    ServerSingleSocket = require('./rpc.js');

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
    this.options = opts || defaultOptions();
    this.io = new Server(serverHttp, this.options);
    this.connectedClients = [];
    var that = this;

    this.io.on('connection', function(socket) {
        var s = new ServerSingleSocket(socket, that.options);
        s.expose(that.exposedFunctions);
        that.connectedClients.push(s);
        log('Open connections', that.connectedClients.length);

        socket.on('init', function(data){ //TODO cleanup
            
            if (!data.clientId){
                //console.log('newId');
                var clientId = s._genId('client');
                s.remoteClientId=clientId;
                //console.log('remoteClientId:', s.remoteClientId);
                socket.emit('init1', {'clientId':clientId})
            }else{
                //console.log('gotId', data.clientId);
                var openFunctionCalls=[];
                for (var c in that.connectedClients){
                    //console.log('AAA', that.connectedClients[c].remoteClientId, data.clientId);
                    if (that.connectedClients[c].remoteClientId === data.clientId){
                        //console.log('waiting calls', that.connectedClients[c].openCalls);
                        openFunctionCalls=that.connectedClients[c].openCalls;

                        that.connectedClients.splice(c, 1);

                        //FLUSH em
                        break;
                    }
                }

                for (var e in openFunctionCalls){
                    var thunk = openFunctionCalls[e].thunk;
                    //console.log('calling' + thunk.replyId, thunk.thunk.functionName, thunk.thunk.continuation)
                    s.rpcCall(thunk.functionName, thunk.actualParameters, thunk.continuation);//TODO Due functions...
                }
            }
        })
    });
}

ServerRpc.prototype.expose = function(o) {
    this.exposedFunctions = o;
}

ServerRpc.prototype.rpcCall = function(name, args, cb) {
    for (var c in this.connectedClients){
        this.connectedClients[c].rpcCall(name, args, cb);
    }
}

module.exports = ServerRpc;

////////////////////////////////////////////////////////////////////////////////////////////






