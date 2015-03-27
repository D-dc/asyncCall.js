'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

var debug = false;
var log = function() {};
if (debug)
    log = console.log;

var excpt = require('./exception.js');


//
// RPC library (Client + Server)
//

//RPC Constructor
var RPC = function(socket, options){//, onCallReceived, OnReplyReceived) {
    var self = this;
    log('NEW RPC created', options);
    this.socket = socket;
    this.defaultRpcTimeout = options.defaultRpcTimeout;
    // this.onCallReceived = onCallReceived || function(){};
    // this.onReplyReceived = OnReplyReceived || function(){};
    this.exposedFunctions = {};
    this.openCalls = [];
    
    this.error = null;
    this.connected = true;

    socket.on('connect', function (){
        self.connected = true;
    });
    socket.on('disconnect', function (){
        self.connected = false;
        self.failOpenCalls();
    });
    socket.on('error', function (o){
        self.error = o;
    });
};

//Expose functions to be called as RPCs
RPC.prototype.expose = function(o) {
    var self = this;
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

       
        var saved = self.exposedFunctions[data.name];

         //lookup and apply
        if(!data.name || !data.args || !saved){
            
            var exception = new FunctionNotFoundError('Function not found.');
            self.socket.emit(data.reply, {
                    error: excpt.serialize(exception)
                });
        
        }else{
            //self.onCallReceived(data);
            saved.closure(data.args, data.reply);
        }
       
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
    var self = this;

    var closure = function(args, replyId) {
        try {
            //Call and reply
            var result = func.apply(self, args);
            log('REPLY ', replyId, JSON.stringify(result));

            self.socket.emit(replyId, {
                    result: result,
                });

        } catch (err) {
            // if the function throws an exception, indicate this
            self.socket.emit(replyId, {
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
    log('SAVING call', name, replyId, ' OpenCalls: ', JSON.stringify(this.openCalls));
    var self = this;

    return function(replyId) {
        var callsWaiting = self.openCalls;
        for (var i in callsWaiting){ 
            if (replyId === callsWaiting[i].replyId){        
                log(' REMOVING call replyId: ', callsWaiting[i].replyId);     
                callsWaiting.splice(i, 1);
    
                //self.onReplyReceived(replyId);   
            }      
        }
    };
};

//Perform a Remote Procedure Call
// optionally take callback and due
RPC.prototype.rpcCall = function(name, args, callback, due) {
    var listener, timer, removeOpenCall;

    if(!name) throw new Error('Undefined function name');
    if(!this.connected) return callback(new NoConnectionError('No connection error'));
    
    args = args || [];
    callback = callback || function() {};
    due = due || this.defaultRpcTimeout;
    var replyId = this.generateID(name);

    log('rpcCall ', name, args, ' for reply id ', replyId);

    removeOpenCall = this._saveCall(name, args, callback, replyId);

    var send = {
        name: name,
        args: args,
        reply: replyId
    };

    this.socket.emit('CALL', send);
    log('SEND DATA' + JSON.stringify(send));
    var self = this;

    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new TimeOutError(name + ' ' + args + ' call timed out.');
            removeOpenCall(replyId);
            self.socket.removeListener(replyId, listener);
            //TODO call from socket buffer
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


RPC.prototype.failOpenCalls = function() {
    this.socket.sendBuffer = [];

    //fail open calls, older calls before newer
    while(this.openCalls.length !== 0){
        var openCall = this.openCalls[0];
        var err = new NoConnectionError('No connection error');//new LeaseExpiredError();
        
        log('failing open call', openCall.replyId);
        
        openCall.continuation(err);
        this.openCalls.splice(0, 1);
    }
    //TODO delete them in socket as well, remove timers
};
////////////////////////////////////////////////////////////////////////////////////////////


module.exports = RPC;