//
// Server side RPC library.
//

if (typeof module !== 'undefined' && module.exports)
    module.exports = ServerSingleSocket;

function ServerSingleSocket(socket, opts) {
    console.log("new socket " + socket);
    this.noReplyTimeOut = 3000;
    this.exposedFunctions = [];
    this.socket = socket;

    this.openCalls = [];
    this.remoteClientId = -1;

    var that = this;
    this.options = opts;

    socket.on("error", function(err) {
        console.error("Server: iosocket error " + err);
    });
    socket.on('init', function(data){
            var clientId = that.genId('client');
            this.remoteClientId=clientId;
            that.socket.emit('init1', {'clientId':clientId})
        })
};




ServerSingleSocket.prototype.id = function() {
    return this.socket.id;
}

ServerSingleSocket.prototype.expose = function(o) {
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

ServerSingleSocket.prototype.genId = function(name) {
    return name + Math.floor((Math.random() * 1000) + 1);
};


ServerSingleSocket.prototype._exposeFunction = function(name, func) {
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




ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due) {
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