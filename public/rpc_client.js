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
    var io = require('../node_modules/socket.io/node_modules/socket.io-client');
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
        timeout: 20000,                 //time before connect_error, connect_timeout events
        autoConnect: true,              //automatically connect
        defaultReplyTimeOut: Infinity   //default delay before an RPC call should have its reply. Infinity = no timeout
    };
}

/*
    Constructor
*/
var ClientRpc = function(url, opts) {
    this.options = opts || defaultOptions();
    this.socket = io(url, this.options);
    
    this.defaultReplyTimeOut = this.options.defaultReplyTimeOut;
    this.exposedFunctions = [];
    this.openCalls = [];
    this.clientId = -1;
    
    var that = this;
    this.socket.on("error", function(err) {
        console.error("Client: iosocket error " + err);
    });

    this.socket.on('connect', function () {
        
        if(typeof module !== 'undefined' && module.exports) return; //ugly hack 
        
        var originalId = localStorage.getItem('rpcid');
        that.socket.emit('init', {'clientId':originalId});
        if(!originalId){
            that.socket.on('init1', function(data){
                localStorage.setItem('rpcid', data.clientId);
                that.clientId = data.clientId;
            })
        }
    });
}

/*
    Connection id of socket
*/
ClientRpc.prototype.id = function() {
    return this.socket.io.engine.id;
}

/*
    Expose RPC functions
*/
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

/*
    Generate ID (private)
    TODO
*/
ClientRpc.prototype._genId = function(name) {
    return name + Math.floor((Math.random() * 1000) + 1);
};

/*
    Expose a single function (private)
*/
ClientRpc.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
            
            //Call and reply
            var result = func.apply(this, args);
            log('REPLY', replyId, JSON.stringify(result));
            that.socket.emit(replyId, { //return value
                result: result,
            });

        } catch (err) { 
            // function call resulted in exception
            log('REPLY', replyId, JSON.stringify(err));
            that.socket.emit(replyId, {
                error: err
            });
        }
    };

    //push the closure
    this.exposedFunctions.push({
        name: name,
        closure: closure
    });
};

/*
    Perform an RPC
*/
ClientRpc.prototype.rpcCall = function(name, args, cb, due) {
    var replyId, listener, timer, socket;
    replyId = this._genId(name);

    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: cb
    }

    var savedCall = {
        replyId: replyId,
        thunk: thunk
    }

    this.openCalls.push(savedCall);

    var send = {
        name: name,
        args: args,
        reply: replyId
    };
    this.socket.emit("fix", send);//TODO rename
    log('SEND DATA' + JSON.stringify(send));
    
    removeOpenCall = function(){
        log('open calls ', that.openCalls.length)
        //console.log(that.openCalls);
        for (var i in that.openCalls){
            //console.log(replyId, that.openCalls[i].replyId)
            if (replyId === that.openCalls[i].replyId){
                that.openCalls.splice(i, 1);
            }
        }
    };

    if (!due) due = this.defaultReplyTimeOut;
    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new Error(name + " " + args +" call timed out");
            removeOpenCall();
            that.socket.removeListener(replyId, listener);
            cb(err); // ATM just continue with error argument set
        }, due);

    var that = this;

    listener = function(result) {
        var err = result.error, 
            res = result.result;

        if(timer) clearTimeout(timer);
        removeOpenCall();

        if (!err) {
            if (cb) cb(null, res); //everything ok 
        } else {
            if (cb) cb(err);
        }
    };

    //wait for reply
    this.socket.once(replyId, listener);
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientRpc;
}


////////////////////////////////////////////////////////////////////////////////////////////