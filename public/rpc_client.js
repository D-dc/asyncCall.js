//
// RPC library, client side.
//

//TODO: change this
if (typeof module !== 'undefined' && module.exports) {
    var Rpc = require('./rpc.js'),
        io = require('../node_modules/socket.io/node_modules/socket.io-client');
}

//see clientside options
//https://github.com/Automattic/socket.io-client/blob/master/lib/manager.js#L32
var defaultOptions = function() {
    return {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5, // for the backoff
        timeout: 20000,
        autoConnect: true
    };
}

/*
    Constructor
*/
var ClientRpc = function(url, opts) {
    this.options = opts || defaultOptions();
    this.socket = io(url, this.options);
    this.noReplyTimeOut = 3000;
    this.exposedFunctions = [];
    this.openCalls = [];
    this.clientId = -1;
    
    var that = this;
    this.socket.on('connect', function () {
        that.socket.emit('init');
        that.socket.on('init1', function(data){
            that.clientId = data.clientId;
        })
    });

    this.socket.on("error", function(err) {
        console.error("Client: iosocket error " + err);
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
        if (!data.reply) //TODO cleanly filter out replies
            return;

        var arr = that.exposedFunctions;
        
        //lookup and apply
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            if (obj.name == data.name) {
                obj.closure(data.args, data.reply);
                return;
            }
        }

        //only reply to actual functions not found
        if (data.reply)
            that.socket.emit(data.reply, {
                result: null,
                error: "function not found"
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
            that.socket.emit(replyId, {
                result: result,
            });

        } catch (err) { 
            // if the function throws an exception, indcate this
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
    console.log("rpcCall ", name, args, cb);
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

    this.socket.emit("fix", {//TODO rename
        name: name,
        args: args,
        reply: replyId
    });
    var that = this;

    //there is no callback, so don't wait for reply
    //if (!cb) return; 
    if (!due) due = this.noReplyTimeOut;

    listener = function(result) {
        var err = result.error, 
            res = result.result;

        clearTimeout(timer);


        console.log(that.openCalls);
        function findIndex(){
            for (var i in this.openCalls){
                if (that.replyId === replyId)
                    return i
            };
        };
        that.openCalls.splice(findIndex(), 1);
        console.log(that.openCalls);


        if (!err) {
            if (cb) cb(null, res); //everything ok 
        } else {
            //console.error(err);
            if (cb) cb(err);
        }
    };

    //set a timer, because we are interested in reply after noReplyTimeOut
    timer = setTimeout(function() {
        var err = new Error("call timed out");
        that.socket.removeListener(replyId, listener);
        cb(err); // ATM just continue with error argument set

    }, due);


    //wait for reply
    this.socket.once(replyId, listener);
};




if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientRpc;
}


////////////////////////////////////////////////////////////////////////////////////////////



myClient = new ClientRpc('http://127.0.0.1:80');
myClient.expose({
    'testClient': function(a) {
        console.log("testClient")
        return a * a;
    },
    'ping': function(ctr) {
        console.log("ping " + ctr);
        setTimeout(function() {
            myClient.rpcCall("pong", [ctr])
        }, 2000);
    }
});

var a = 1;
var b = 2;
var c = 3;

myClient.rpcCall("testRemote", [a, b], function(err, res) {
    if (err) console.error(err);

    res += 3;
    console.log("testRemote 6 " + res);
});

myClient.rpcCall("testNoExist", [c, c], function(err, res){
    if(err){
        console.error(err);
    }
});

callServer = function() {
    console.log(" callServer called")
    myClient.rpcCall("testRemote", [a, b, c], function(err, res) {
        console.log("callServer reply " + res);
        res += 3;
        a++;
        console.log("testRemote 6 " + res);

    });
}
//myClient.rpcCall("pong", [1]);
