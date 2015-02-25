'use strict';

var debug = false;
var log = function() {};
if (debug)
    log = console.log;

var excpt = require('./exception.js');


//
// RPC library (Client + Server)
//

//RPC Constructor
var RPC = function(socket, options, onCallReceived, OnReplyReceived) {
    log('NEW RPC created');
    this.socket = socket;
    this.options = options;
    this.onCallReceived = onCallReceived || function(){};
    this.onReplyReceived = OnReplyReceived || function(){};
    this.exposedFunctions = {};
    this.openCalls = [];
};

//Expose functions to be called as RPCs
RPC.prototype.expose = function(o) {
    var that = this;
    var prop;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {
            continue;
        }
        this._exposeFunction(prop, o[prop]);
    }

    //incoming function call
    this.socket.on('CALL', function(data) {
        log('INCOMING DATA' + JSON.stringify(data));

        that.onCallReceived(data);

        //lookup and apply
        var saved = that.exposedFunctions[data.name];
        if (saved) {
            saved.closure(data.args, data.reply);
            return;
        }

        //only reply to actual functions not found
        var exception = new FunctionNotFoundError('Function not found.');
        that.socket.emit(data.reply, {
                error: excpt.serialize(exception)
            });
    });
};

//Generate a 'random' ID
RPC.prototype.generateID = function(name) {
    return name + Math.floor((Math.random() * 10000) + 1);
};

RPC.prototype.emit = function(ev, data) {
    this.socket.emit(ev, data);
};

//Expose a certain function
RPC.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
            //Call and reply
            var result = func.apply(that, args);
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

    if (this.exposedFunctions[name])
        throw new Error('No function overloading, overwriting previous ', name);

    //save the closure
    this.exposedFunctions[name] = {
        name: name,
        closure: closure
    };
};

//Save a function call, until we received the reply or timeout
RPC.prototype._saveCall = function(name, args, callback, replyId) {

    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: callback,
        replyId: replyId
    };

    this.openCalls.push(thunk);
    log('SAVING call', name, replyId, ' OpenCalls: ', this.openCalls.length);
    var that = this;

    return function(replyId) {
        var callsWaiting = that.openCalls;
        for (var i in callsWaiting){ 
            if (replyId === callsWaiting[i].replyId){        
                log(' REMOVING call replyId: ', callsWaiting[i].replyId);     
                callsWaiting.splice(i, 1);
    
                that.onReplyReceived(replyId);   
            }      
        }
    };
};

//Perform a Remote Procedure Call
// optionally take callback and due
RPC.prototype.rpcCall = function(name, args, callback, due) {
    var listener, timer, removeOpenCall;
    var replyId = this.generateID(name);
    callback = callback || function() {};
    due = due || this.options.defaultRpcTimeout;

    log('rpcCall ', name, args, ' for reply id ', replyId);

    removeOpenCall = this._saveCall(name, args, callback, replyId);

    var send = {
        name: name,
        args: args,
        reply: replyId
    };

    this.socket.emit('CALL', send);
    log('SEND DATA' + JSON.stringify(send));
    var that = this;

    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new TimeOutError(name + ' ' + args + ' call timed out.');
            removeOpenCall(replyId);
            that.socket.removeListener(replyId, listener);
            callback(err); //Timed out
        }, due);

    listener =
        function(data) {
            return function(result, replyId) {
                var err = result.error,
                    res = result.result;
                log('REPLY LISTENER ', res, replyId);

                if (timer) clearTimeout(timer);
                removeOpenCall(replyId);

                if (!err) {
                    callback(null, res); //Regular return, everything ok 
                } else {
                    log('Callback with exception');
                    callback(excpt.deserialize(err)); //Remote exception
                }
            }(data, replyId);
        };

    //wait for reply
    this.socket.once(replyId, listener);
};

////////////////////////////////////////////////////////////////////////////////////////////


module.exports = RPC;