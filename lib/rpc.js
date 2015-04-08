'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, MsgOutOfOrderError*/

var debug = require('debug')('rpc rpc.js');

var _debug = true;
if (!_debug)
    debug = function () {};

var excpt = require('./exception.js');

//
// RPC library (Client + Server)
//

//RPC Constructor
var RPC = function (socket, options) {
    debug('NEW RPC created', options);

    this.socket = socket;
    this.defaultRpcTimeout = options.defaultRpcTimeout;
    this.throwNativeError = options.throwNativeError;

    this.exposedFunctions = {};
    this.openCalls = [];
    this.currentCall = null;
    this.sendMsgCounter = 1;
    this.recMsgCounter = 1;
    this.lastResults = {};

    this.initialized = false;
    this.error = null;
    this.connected = true;

    this.onConnected = [];
    this.onDisconnected = [];
    this.onceConnected = [];
    this.onceDisconnected = [];

    this._initListeners(socket);
};

RPC.prototype.newSocket = function (socket) {
    this.socket = socket;
    this.initialized = false;
    this.error = null;
    this.connected = true;
    this.exposedFunctions = {};

    this._initListeners(socket);
};

RPC.prototype._initListeners = function (socket) {
    var self = this;
    socket.on('connect', function () {
        self.connected = true;
    });

    socket.on('disconnect', function () {
        self.connected = false;
        self.failOpenCalls();

        self._executeEvents(self.onDisconnected);
        self._executeEvents(self.onceDisconnected);
        self.onceDisconnected = [];
    });

    socket.on('error', function (o) {
        console.error(o.stack);
        self.error = o;
    });
};

RPC.prototype.init = function () {
    debug('RPC INIT');
    this.initialized = true;

    this._executeEvents(this.onConnected);
    this._executeEvents(this.onceConnected);
    this.onceConnected = [];

    //We can now start sending
    this._doSend();
};

//Expose functions to be called as RPCs
RPC.prototype.expose = function (o) {
    var self = this;
    var prop;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {
            continue;
        }
        this._exposeFunction(prop, o[prop]);
    }

    //incoming function call
    this.socket.on('CALL', function (data) {
        debug('INCOMING DATA', JSON.stringify(data));

        var saved = self.exposedFunctions[data.name];

        if (!data.name || !data.args || !saved) {

            var exception = new FunctionNotFoundError('Function not found.');
            self.socket.emit(data.reply, {
                error: excpt.serialize(exception)
            });

            self.recMsgCounter++;
        } else {
            //lookup and apply
            saved.closure(data.args, data.reply, data.msgId);

        }

    });
};

//Generate a 'random' ID
RPC.prototype.generateID = function (name) {

    return name + Math.floor((Math.random() * 1000000) + 1);

};

RPC.prototype.emit = function (ev, data) {

    this.socket.emit(ev, data);

};

//Expose a certain function
RPC.prototype._exposeFunction = function (name, func) {
    var self = this;

    var closure = function (args, replyId, recMsgCounter) {
        console.log('send ctr', recMsgCounter, 'self recMCtr', self.recMsgCounter);
        debug('msg', replyId, recMsgCounter);
        var oldMsg = self.lastResults[recMsgCounter];

        //we received a counter for which we already computed the result.
        //we have to be sure it is for the same function though, hence
        //their replyId's must match as well.
        //This corner case can happen when client sends an RPC, does not get the result (no msgCtr++)
        //decides not to try again but perform another RPC later with the same msgCtr.
        if (oldMsg) {
            if (oldMsg.replyId === replyId) {
                console.log('REPLY OLD RESULT', replyId, oldMsg.outcome);

                self.socket.emit(replyId, oldMsg.outcome);

                //todo remove old results
                return;
            }
            console.log('REPLY UPDATED OLD');
            self.recMsgCounter--;
        }

        if (recMsgCounter > self.recMsgCounter) {
            console.log('Expected ' + self.recMsgCounter + ' received' + recMsgCounter);
            self.recMsgCounter = recMsgCounter;
            // var serializedError = excpt.serialize(new MsgOutOfOrderError('Expected ' + self.recMsgCounter + ' received' + recMsgCounter));

            // debug('REPLY ERROR ORDER', replyId);

            // self.socket.emit(replyId, {
            //     error: serializedError,
            // });

            // //save result for possible later retransmission
            // self.lastResults[self.recMsgCounter] = {
            //     replyId: replyId,
            //     outcome: {
            //         error: serializedError
            //     }
            // };
        }

        var rpcReply, error;
        try {
            //Call and reply
            var result = func.apply(self, args);

            console.log('REPLY NORMAL RESULT', replyId, result);

            rpcReply = {
                result: result
            };

        } catch (e) {
            error = e;

            console.log('REPLY NORMAL ERROR', replyId, error);

            rpcReply = {
                error: excpt.serialize(e),
            };

        }

        self.socket.emit(replyId, rpcReply);

        //save result for possible later retransmission
        self.lastResults[recMsgCounter] = {
            replyId: replyId,
            outcome: rpcReply
        };

        self.recMsgCounter++;

        //for debugging, rethrow native exceptions like ReferenceError, SyntaxError etc,
        if (error && self.throwNativeError && excpt.isNativeError(error))
            throw error;

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
RPC.prototype._saveCall = function (thunk) {
    var self = this;

    this.openCalls.push(thunk);

    debug('SAVING call', thunk.functionName, thunk.replyId, ' OpenCalls: ', JSON.stringify(this.openCalls));

    return function (replyId) {
        var callsWaiting = self.openCalls;
        for (var i in callsWaiting) {
            if (replyId === callsWaiting[i].replyId) {
                debug(' REMOVING call replyId: ', callsWaiting[i].replyId);
                return callsWaiting.splice(i, 1)[0];
            }
        }
    };
};

//Do the actual RPC
RPC.prototype._doSend = function () {
    if (!this.currentCall && this.initialized) {
        this.currentCall = true;
        var nextThunk = this.openCalls[0];
        //todo maybe pick the one with the lowest sendCounter

        if (nextThunk) {
            var toSend = {
                name: nextThunk.functionName,
                args: nextThunk.actualParameters,
                reply: nextThunk.replyId
            };

            debug('SEND DATA', JSON.stringify(toSend));

            //if it is a resend (use existing id), else use current.
            toSend.msgId = (nextThunk.msgCtr) ? nextThunk.msgCtr : this.sendMsgCounter;
            this.openCalls[0].msgCtr = toSend.msgId;

            if (!this.connected) {
                nextThunk.msgCtr = toSend.msgId;
                this.openCalls.splice(0, 1);
                debug('failing call', nextThunk.msgCtr);

                nextThunk.continuation(new NoConnectionError('No connection error'), undefined, this._retryRPC(nextThunk));
                this.currentCall = false;
                return;
            }

            this.socket.emit('CALL', toSend);
        } else {
            //nothing to send ATM, indicate that we are ready to send any new RPC.
            this.currentCall = false;

        }
    }

};

//Perform a Remote Procedure Call optionally take callback and due
RPC.prototype.rpc = function (name, args, callback, due, replyId, msgCtr) {
    var self = this;
    var listener, timer, removeOpenCall;

    args = args || [];
    callback = callback || function () {};
    due = due || this.defaultRpcTimeout;
    replyId = replyId || this.generateID(name);

    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: callback,
        due: due,
        replyId: replyId,
        msgCtr: msgCtr //can be undefined ATM.
    };

    debug('rpc ', thunk);

    if (!name) throw new Error('Undefined function name');

    removeOpenCall = this._saveCall(thunk);

    if (due !== Infinity)
        timer = setTimeout(function () {
            var err = new TimeOutError(name + ' ' + args + ' call timed out.');
            var thunk = removeOpenCall(replyId);
            self.socket.removeListener(replyId, listener);
            //TODO call from socket buffer
            callback(err, undefined, self._retryRPC(thunk)); //Timed out

            self.currentCall = false;
            self._doSend();
        }, due);

    listener =
        function (data) {
            return function (result, replyId, isRetry) {
                var err = result.error,
                    res = result.result;

                debug('REPLY LISTENER ', res, replyId);

                if (!isRetry)
                    self.sendMsgCounter++;

                if (timer) clearTimeout(timer);
                var thunk = removeOpenCall(replyId);

                if (!err) {

                    callback(null, res); //Regular return, everything ok 

                } else {

                    callback(excpt.deserialize(err), undefined, self._retryRPC(thunk)); //Remote exception

                }

                //continue sending

                self.currentCall = false;
                self._doSend();
            }(data, replyId, (msgCtr !== undefined));
        };

    //wait for reply
    this.socket.once(replyId, listener);

    //try sending.
    if (!this.currentCall)
        self._doSend();
};

RPC.prototype._retryRPC = function (thunk) {
    var self = this;

    return function () {
        debug('Retry', thunk.msgCtr, thunk.actualParameters);
        self._rpcFromThunk(thunk);

        if (!self.currentCall)
            self._doSend();

    };
};


RPC.prototype._rpcFromThunk = function (thunk) {
    return this.rpc(thunk.functionName, thunk.actualParameters,
        thunk.continuation, thunk.due, thunk.replyId, thunk.msgCtr);
};


RPC.prototype.failOpenCalls = function () {
    var currentCalls = this.openCalls;

    debug('failing call', this.openCalls.length, this.openCalls);

    while (currentCalls.length !== 0) {
        var thunk = currentCalls[0];
        var err = new NoConnectionError('No connection error');

        thunk.continuation(err, undefined, this._retryRPC(thunk));
        currentCalls.splice(0, 1);
    }

    debug('failing call', this.openCalls.length, this.openCalls);
    //TODO delete them in socket as well, remove timers
};


RPC.prototype.onConnectedExec = function (callback) {
    this.onConnected.push(callback);
};


RPC.prototype.onDisconnectedExec = function (callback) {
    this.onDisconnected.push(callback);
};


RPC.prototype.onceConnectedExec = function (callback) {
    this.onceConnected.push(callback);
};


RPC.prototype.onceDisconnectedExec = function (callback) {
    this.onceDisconnected.push(callback);
};


RPC.prototype._executeEvents = function (callbackList) {
    if (callbackList.length === 0) debug('empty callbackList');

    for (var i in callbackList) {
        callbackList[i]();
    }
};
////////////////////////////////////////////////////////////////////////////////////////////

module.exports = RPC;