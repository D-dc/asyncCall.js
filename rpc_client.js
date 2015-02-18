//
// RPC library, client side.
//

var debug = false;

var log = function(msg){
    if(debug)
        console.log(msg);
}

//TODO: change this
if (typeof module !== 'undefined' && module.exports) {
    var io = require('./node_modules/socket.io/node_modules/socket.io-client');
    var RPC = require('./lib/rpc.js');
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
    var options = opts || defaultOptions();
    var socket = io(url, options);

    this.RPC = new RPC(socket, options);

    this.clientId = -1;
    
    var that = this;

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

            

    socket.on("error", function(err) {
        console.error("Client: iosocket error " + err);
    });

    socket.on('connect', function () {
        
        if(typeof module !== 'undefined' && module.exports) return; //ugly hack to skip id exchange if not run in browser
        
        var originalId = localStorage.getItem('client');
        socket.emit('init', {'client' : originalId});//can be null
        if(!originalId){

            socket.on('init-reply', function(data){
                localStorage.setItem('client', data.client);
                that.clientId = data.client;
                console.log('client id set', that.clientId)
            });
        }else{
            that.clientId = originalId;
        }
    });
}


ClientRpc.prototype.id = function() {
    return this.socket.io.engine.id;
}

ClientRpc.prototype.expose = function(o){
    this.RPC.expose(o);
}

ClientRpc.prototype.rpcCall = function(name, args, cb, due){
    this.RPC.rpcCall(name, args, cb, due);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientRpc;
}

/*
ClientRpc.prototype.expose = function(o) {
    var that = this;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {//reflection
            continue;
        }
        this._exposeFunction(prop, o[prop]);
    };

    //incoming function call
    this.socket.on("fix", function(data) {
        log('INCOMING DATA' + JSON.stringify(data));
        if (!data.reply) //TODO cleanly filter out replies
            return; // ignore replies

        var arr = that.exposedFunctions;
        
        //lookup and apply
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            if (obj.name === data.name) {
                obj.closure(data.args, data.reply);
                return;
            }
        }

        //function call for undefined function
        if (data.reply)
            that.socket.emit(data.reply, {
                error: new Error("function not found")
            });
    });
};


ClientRpc.prototype._genId = function(name) {
    return name + Math.floor((Math.random() * 1000) + 1);
};


ClientRpc.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
            
            //Call and reply
            var result = func.apply(this, args);
            log('REPLY', replyId, JSON.stringify(result));
            that.socket.emit(replyId, { //return value
                result: result,
                //replyId: replyId
            });

        } catch (err) { 
            // function call resulted in exception
            log('REPLY', replyId, JSON.stringify(err));
            that.socket.emit(replyId, {
                error: err,
                //replyId: replyId
            });
        }
    };

    //push the closure
    this.exposedFunctions.push({
        name: name,
        closure: closure
    });
};

ClientRpc.prototype._saveCall = function(name, args, cb, replyId){
    
    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: cb,
        replyId: replyId
    }
    
    this.openCalls.push(thunk);
    console.log('saved calls', this.openCalls.length);
    var that = this;

    return function(replyId){
        //console.log('removing ', replyId)
        //console.log('open calls ', that.openCalls.length, that.openCalls)
        //console.log(that.openCalls);
        for (var i in that.openCalls){
            //console.log(replyId, that.openCalls[i].replyId)
            if (replyId === that.openCalls[i].replyId){
                console.log(' REMOVING call replyid: ', that.openCalls[i].replyId);
                that.openCalls.splice(i, 1);
            }
        }
        //console.log('open calls AFTTER', that.openCalls.length)
    };
} 

ClientRpc.prototype.rpcCall = function(name, args, cb, due) {
    
    var replyId = this._genId(name);
    console.log("rpcCall ", name, args, ' for reply id ', replyId);    

    removeOpenCall = this._saveCall(name, args, cb, replyId);
    
    var send = {
        name: name,
        args: args,
        reply: replyId
    };
    
    this.socket.emit("fix", send);//TODO rename
    log('SEND DATA' + JSON.stringify(send));

    if (!due) due = this.defaultReplyTimeOut;
    if (due !== Infinity)
        var timer = setTimeout(function() {
            var err = new Error(name + " " + args + " call timed out");
            removeOpenCall(that.replyId);
            that.socket.removeListener(replyId, listener);
            cb(err); // ATM just continue with error argument set
        }, due);

    var that = this;

    var listener = function(result, replyId) {
        var err = result.error, 
            res = result.result;
            //console.log('REPLY LISTENER ', res)

        if(timer) clearTimeout(timer);
        removeOpenCall(replyId);

        if (!err) {
            if (cb) cb(null, res); //everything ok 
        } else {
            if (cb) cb(err);
        }
    };

    //wait for reply
    this.socket.once(replyId, 
        function(data){
            listener(data, replyId);
        });
};*/




////////////////////////////////////////////////////////////////////////////////////////////