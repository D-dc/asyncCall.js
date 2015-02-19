//
// RPC library.
//
if (typeof module !== 'undefined' && module.exports) 
    var excpt = require('./exception.js');

var debug = false;
var log = function(msg){ }
if(debug)
     log = console.log;


//RPC Constructor
var RPC = function (socket, options){
    log("NEW RPC created")
    this.socket = socket;
    this.exposedFunctions = [];
    this.openCalls = {};
    this.options = options; //TODO
};


//Expose functions to be called as RPCs
RPC.prototype.expose = function(o) {
    var that = this;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {//reflection
            continue;
        }
        this._exposeFunction(prop, o[prop]);
    };

    //incoming function call
    this.socket.on("CALL", function(data) {
        log('INCOMING DATA' + JSON.stringify(data));
        if (!data.reply) //TODO cleanly filter out replies
            return;

        var arr = that.exposedFunctions;
        
        //lookup and apply
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            if (obj.name === data.name) {
                obj.closure(data.args, data.reply);
                return;
            }
        }

        //only reply to actual functions not found
        if (data.reply)
            var exception = new Error("Function not found.");
            that.socket.emit(data.reply, {
                error: excpt.serialize(exception)
            });
    });
};

//Generate a 'random' ID
RPC.prototype._generateUID = function(name) {
    return name + Math.floor((Math.random() * 10000) + 1);
};


RPC.prototype.emit = function (ev, data){
    this.socket.emit(ev, data);
}

//Expose a certain function
RPC.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
            
            //Call and reply
            var result = func.apply(this, args);
            log('REPLY ', replyId, JSON.stringify(result));

            that.socket.emit(replyId, {
                result: result,
            });

        } catch (err) { 
            // if the function throws an exception, indicate this
            that.socket.emit(replyId, {
                error: excpt.serialize(err),
            });
        }
    };

    //push the closure
    this.exposedFunctions.push({
        name: name,
        closure: closure
    });
};

//Save a function call, until we received the reply or timeout
RPC.prototype._saveCall = function(name, args, cb, replyId){
    
    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: cb,
        replyId: replyId
    }
    
    this.openCalls[replyId] = thunk;
    log('SAVING call', name, replyId, " OpenCalls: ", Object.keys(this.openCalls).length);
    var that = this;

    return function(replyId){
        var thunk = that.openCalls[replyId];
        log(' REMOVING call replyId: ', replyId);
        delete that.openCalls[replyId];
    };
}; 

//Perform a Remote Procedure Call
// optionally take callback and due
RPC.prototype.rpcCall = function(name, args, cb, due) {
    var listener, timer, removeOpenCall;
    var replyId = this._generateUID(name);
    log("rpcCall ", name, args, ' for reply id ', replyId);    

    removeOpenCall = this._saveCall(name, args, cb, replyId);
    
    var send = {
        name: name,
        args: args,
        reply: replyId
    };
    
    this.socket.emit("CALL", send);//TODO rename
    log('SEND DATA' + JSON.stringify(send));
    var that = this;

    if (!due) due = this.options.defaultReplyTimeOut;
    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new Error(name + " " + args + " call timed out " + replyId);
            removeOpenCall(replyId);
            that.socket.removeListener(replyId, listener);
            if (cb) cb(err); //Timed out
        }, due);

    listener = 
        function (data){
            return function (result, replyId) {
                var err = result.error, 
                    res = result.result;
                    log('REPLY LISTENER ', res, replyId)

                if(timer) clearTimeout(timer);
                removeOpenCall(replyId);

                if (!err) {
                    if (cb) cb(null, res); //Regular return, everything ok 
                } else {
                    log("Callback with exception")
                    if (cb) cb(excpt.deserialize(err)); //Remote exception
                }
            }(data, replyId);
        };

    //wait for reply
    this.socket.once(replyId, listener);
};


if (typeof module !== 'undefined' && module.exports)
    module.exports = RPC;