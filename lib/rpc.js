'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError*/

var debug = require('debug')('rpc rpc.js');

var _debug = true;
if (!_debug)
    debug = function() {};

var excpt = require('./exception.js');



//
// RPC library (Client + Server)
//

//RPC Constructor
var RPC = function(socket, options){
    var self = this;
    debug('NEW RPC created', options);
    this.socket = socket;
    this.defaultRpcTimeout = options.defaultRpcTimeout;
    this.throwNativeError = options.throwNativeError;
    this.exposedFunctions = {};
    
    this.openCalls = [];
    this.currentCall = null;

    this.sendMsgCounter = null;
    this.recMsgCounter = null;
    this.lastResults = {};

    
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
        debug('INCOMING DATA', JSON.stringify(data));

       
        var saved = self.exposedFunctions[data.name];

         //lookup and apply
        if(!data.name || !data.args || !saved){
            var exception = new FunctionNotFoundError('Function not found.');
            self.socket.emit(data.reply, {
                    error: excpt.serialize(exception)
                });
            self.recMsgCounter++;
        }else{
            saved.closure(data.args, data.reply, data.msgId);
        }
        
    });
};

//Generate a 'random' ID
RPC.prototype.generateID = function(name) {
    return name + Math.floor((Math.random() * 1000000) + 1);
};

RPC.prototype.emit = function(ev, data) {
    this.socket.emit(ev, data);
};

//Expose a certain function
RPC.prototype._exposeFunction = function(name, func) {
    var self = this;

    var closure = function(args, replyId, recMsgCounter) {
        var oldMsg =self.lastResults[recMsgCounter];

        if(oldMsg){
            debug('REPLY OLD', oldMsg);
            self.socket.emit(replyId, oldMsg);
            //todo remove old results
            return;
        }

        if(recMsgCounter > self.recMsgCounter){
            var serializedError = excpt.serialize(new MsgOutOfOrderError('Expected '+self.recMsgCounter+' received'+recMsgCounter));
            self.socket.emit(replyId, {
                    error: serializedError,
                });
            debug('REPLY ERROR ORDER', replyId, serializedError);

            self.lastResults[self.recMsgCounter] = {error:serializedError};
        }

        try {
            //Call and reply
            var result = func.apply(self, args);
            var serializedResult = JSON.stringify(result);
           

            self.socket.emit(replyId, {
                    result: result,
                });
            debug('REPLY RESULT', replyId, serializedResult);

            self.lastResults[self.recMsgCounter] = {result:result};

        } catch (err) {
            var serializedError = excpt.serialize(err);
            // if the function throws an exception, indicate this
            self.socket.emit(replyId, {
                    error: serializedError,
                });
            debug('REPLY ERROR', replyId, serializedResult);

            self.lastResults[self.recMsgCounter] = {error:serializedError};

            debug('throw native', self.throwNativeError)

            //for debugging, retrow native exceptions like ReferenceError, SyntaxError etc,
            if(self.throwNativeError && excpt.isNativeError(err))
                throw err;
            
        }
        self.recMsgCounter++;
        
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
    debug('SAVING call', name, replyId, ' OpenCalls: ', JSON.stringify(this.openCalls));
    var self = this;

    return function(replyId) {
        var callsWaiting = self.openCalls;
        for (var i in callsWaiting){ 
            if (replyId === callsWaiting[i].replyId){        
                debug(' REMOVING call replyId: ', callsWaiting[i].replyId);     
                callsWaiting.splice(i, 1);
            }      
        }
    };
};
RPC.prototype._doSend = function(){
    if(!this.currentCall){
        this.currentCall = true;
        var nextCall = this.openCalls[0];

        if(nextCall){

            var toSend = {
                name: nextCall.functionName,
                args: nextCall.actualParameters,
                reply: nextCall.replyId,
                msgId: this.sendMsgCounter
            };

            //console.log(JSON.stringify(toSend));
            this.socket.emit('CALL', toSend);
            debug('SEND DATA', JSON.stringify(toSend));
        }else{
            this.currentCall = false;
        }
    }
    
};

//Perform a Remote Procedure Call
// optionally take callback and due
RPC.prototype.rpc = function(name, args, callback, due) {
    var self = this;
    var listener, timer, removeOpenCall;

    args = args || [];
    callback = callback || function() {};
    due = due || this.defaultRpcTimeout;
    
    if(!name) throw new Error('Undefined function name');
    if(!this.connected) return callback(new NoConnectionError('No connection error'));
    
    
    var replyId = this.generateID(name);

    debug('rpc ', name, args, ' for reply id ', replyId);

    removeOpenCall = this._saveCall(name, args, callback, replyId);

    self._doSend(); 

    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new TimeOutError(name + ' ' + args + ' call timed out.');
            removeOpenCall(replyId);
            self.socket.removeListener(replyId, listener);
            //TODO call from socket buffer
            callback(err); //Timed out

            self.currentCall = false;
            self._doSend();
        }, due);

    listener =
        function(data) {
            return function(result, replyId) {
                var err = result.error,
                    res = result.result;
                debug('REPLY LISTENER ', res, replyId);


                if (timer) clearTimeout(timer);
                removeOpenCall(replyId);

                if (!err) {
                    callback(null, res); //Regular return, everything ok 
                } else {
                    debug('Callback with exception', err);
                    callback(excpt.deserialize(err)); //Remote exception
                }

                //continue sending
                self.sendMsgCounter++;
                self.currentCall = false;
                self._doSend();
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
        
        debug('failing open call', openCall.replyId);
        
        openCall.continuation(err);
        this.openCalls.splice(0, 1);
    }
    //TODO delete them in socket as well, remove timers
};
////////////////////////////////////////////////////////////////////////////////////////////


module.exports = RPC;