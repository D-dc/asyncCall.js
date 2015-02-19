//
// RPC library, client side.
//

var debug = false;
var log = function(msg){ }
if(debug)
     log = console.log;

//TODO: change this
if (typeof module !== 'undefined' && module.exports) {
    var io = require('../node_modules/socket.io/node_modules/socket.io-client');
    var RPC = require('./rpc.js');
}

//see clientside options
//https://github.com/Automattic/socket.io-client/blob/master/lib/manager.js#L32
var defaultOptions = function() {
    return {
        reconnection: true,             //auto reconnect
        reconnectionAttempts: Infinity, //attempts before giving up
        reconnectionDelay: 1000,        //how long to wait before reconnect (doubles + randomized by randomizationFactor)
        reconnectionDelayMax: 5000,     //max delay before reconnection
        randomizationFactor: 0.5, 
        timeout: 2000,                 //time before connect_error, connect_timeout events
        autoConnect: true,              //automatically connect
        //CUSTOM
        defaultReplyTimeOut: Infinity   //default delay before an RPC call should have its reply. Infinity = no timeout
    };
}



var ClientRpc = function(url, opts) {
    var that = this;
    var options = opts || defaultOptions();
    var socket = io(url, options);

    this.RPC = new RPC(socket, options);
    this.clientId = -1;
    
    //EVENTS called on client side
    socket.on('connect', function(){console.log('connect')}); // on connected (CLIENT)
    socket.on('disconnect', function(){console.log('disconnect!')}); // on disconnected (CLIENT)        
    socket.on('reconnect_attempt', function(){console.log('reconnect_attempt')}); //on start reconnnection (CLIENT)
    socket.on('reconnecting', function(){console.log('reconnecting')}); //on reconnecting (CLIENT)
    socket.on('connect_error', function(){console.log('connect_error')}); // (CLIENT)
    socket.on('reconnect_error', function(){console.log('reconnect_error')}); // (CLIENT)
    socket.on('reconnect_failed', function(){console.log('reconnect_failed')}); //(CLIENT)
    
    socket.on('error', function(d){ console.log('error', d)});
    socket.on('connecting', function(){console.log('connecting')});        
    socket.on('connect_failed', function(){console.log('connect_failed')});       
    socket.on('reconnect', function(){console.log('reconnect')});       
    socket.on('connect_timeout', function(){console.log('connect_timeout')});

    socket.on('connect', function() {

        if(typeof module !== 'undefined' && module.exports) return; //ugly hack to skip id exchange if not run in browser
            
        var originalId = localStorage.getItem('client');
        socket.emit('init', {'client' : originalId});//can be null
            if(!originalId){
                socket.on('init-ack', function(data){
                    
                    localStorage.setItem('client', data.client);
                    that.clientId = data.client;
                    log('New id received: ', that.clientId);
                });
            }else{
                log('Old id: ', that.clientId);
                that.clientId = originalId;
            }
    });

    socket.on('close', function(){
        socket.emit('close-ack');
        that._close();
    });
};

ClientRpc.prototype.close = function() {
    var that = this;
    this.RPC.socket.emit('close')
    this.RPC.socket.on('close-ack', function(){
        that._close();
    });
}

ClientRpc.prototype._close = function() {
    log("Closing the connection");
    this.RPC.socket.close();
}

/*ClientRpc.prototype.id = function() {
    return this.socket.io.engine.id;
}*/

ClientRpc.prototype.expose = function(o){
    this.RPC.expose(o);
}

ClientRpc.prototype.rpcCall = function(name, args, callback, due){
    this.RPC.rpcCall(name, args, callback, due);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientRpc;
}