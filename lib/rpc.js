//
// Server side RPC library.
//

var debug = false;

var log = function(msg){
    if(debug)
        console.log(msg);
}

function ServerSingleSocket(socket, opts) {
    log("New connection ",socket.id);
    this.defaultReplyTimeOut = opts.defaultReplyTimeOut;
    this.exposedFunctions = [];
    this.socket = socket;
    this.openCalls = [];
    this.remoteClientId = -1;

    var that = this;
    this.options = opts;

    socket.on("error", function(err) {
        console.error("Server: iosocket error " + err);
    });  
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
            that.socket.emit(data.reply, {
                error: new Error("function not found")
            });
    });
};

ServerSingleSocket.prototype._genId = function(name) {
    return name + Math.floor((Math.random() * 1000) + 1);
};


ServerSingleSocket.prototype._exposeFunction = function(name, func) {
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
            // if the function throws an exception, indcate this
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




ServerSingleSocket.prototype.rpcCall = function(name, args, cb, due) {
    log("rpcCall ", name, args, cb);
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
    
    var send={
        name: name,
        args: args,
        reply: replyId
    };
    log(this.openCalls.length)
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


if (typeof module !== 'undefined' && module.exports)
    module.exports = ServerSingleSocket;