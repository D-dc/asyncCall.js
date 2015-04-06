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

    this.initListeners(socket);
};

RPC.prototype.newSocket = function (socket) {
    this.socket = socket;
    this.initialized = false;
    this.error = null;
    this.connected = true;
    this.exposedFunctions = {};

    this.initListeners(socket);
};

RPC.prototype.initListeners = function (socket) {
    var self = this;
    socket.on('connect', function () {
        self.connected = true;
    });

    socket.on('disconnect', function () {
        self.connected = false;
        self.failOpenCalls();
    });

    socket.on('error', function (o) {
        console.error(o.stack);
        self.error = o;
    });
};

RPC.prototype.init = function () {
    debug('RPC INIT');
    this.initialized = true;
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
        console.log('send ctr', recMsgCounter, 'self recMCtr', self.recMsgCounter)
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
            console.log('New Old msg');
            self.recMsgCounter--;
        }

        if (recMsgCounter > self.recMsgCounter) {
            console.log('Expected ' + self.recMsgCounter + ' received' + recMsgCounter);
            self.recMsgCounter = recMsgCounter;
            // var serializedError = excpt.serialize(new MsgOutOfOrderError('Expected ' + self.recMsgCounter + ' received' + recMsgCounter));

            // console.log('REPLY ERROR ORDER', replyId);

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

        try {
            //Call and reply
            var result = func.apply(self, args);
            var serializedResult = JSON.stringify(result);

            console.log('REPLY RESULT', replyId);

            self.socket.emit(replyId, {
                result: result,
            });

            //save result for possible later retransmission
            self.lastResults[recMsgCounter] = {
                replyId: replyId,
                outcome: {
                    result: result
                }
            };

        } catch (err) {
            var serializedError = excpt.serialize(err);

            console.log('REPLY ERROR', replyId);

            // if the function throws an exception, indicate this
            self.socket.emit(replyId, {
                error: serializedError,
            });

            //save result for possible later retransmission
            self.lastResults[recMsgCounter] = {
                replyId: replyId,
                outcome: {
                    error: serializedError
                }
            };


            //for debugging, rethrow native exceptions like ReferenceError, SyntaxError etc,
            if (self.throwNativeError && excpt.isNativeError(err))
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

    debug('rpc ', name, args, ' for reply id ', replyId);

    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: callback,
        due: due,
        replyId: replyId,
        msgCtr: msgCtr //can be undefined ATM.
    };

    if (!name) throw new Error('Undefined function name');
    if (!this.connected) return callback(new NoConnectionError('No connection error'), undefined, self._retryRPC(thunk));

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
    this.socket.sendBuffer = [];

    //fail open calls, older calls before newer.
    while (this.openCalls.length !== 0) {
        var thunk = this.openCalls[0];
        var err = new NoConnectionError('No connection error');

        debug('failing open call', thunk.replyId);

        thunk.continuation(err, undefined, this._retryRPC(thunk));
        this.openCalls.splice(0, 1);
    }
    //TODO delete them in socket as well, remove timers
};
////////////////////////////////////////////////////////////////////////////////////////////

module.exports = RPC;