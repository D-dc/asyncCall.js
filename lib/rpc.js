//
// Server side RPC library.
//

var debug = false;

var log = function(msg){
    if(debug)
        console.log(msg);
}

var RPC = function (socket, options){
    console.log("NEW RPC created")
    this.socket = socket;
    this.exposedFunctions = [];
    this.openCalls = [];
    this.options = options; //TODO
    console.log(options)
    this.defaultReplyTimeOut = options.defaultReplyTimeOut;
};

RPC.prototype.expose = function(o) {
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

RPC.prototype._generateUID = function(name) {
    return name + Math.floor((Math.random() * 10000) + 1);
};


RPC.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
            
            //Call and reply
            var result = func.apply(this, args);
            log('REPLY ', replyId, JSON.stringify(result));

            that.socket.emit(replyId, {
                result: result,
                //replyId: replyId
            });

        } catch (err) { 
            // if the function throws an exception, indcate this
            log('REPLY', replyId, JSON.stringify(err));
            that.socket.emit(replyId, {
                error: err,
                //replyId: replyId
            });

        }
    };

    //push the closure
    this.exposedFunctions.push({
        name: name,
        closure: closure
    });
};


RPC.prototype._saveCall = function(name, args, cb, replyId){
    
    var thunk = {
        functionName: name,
        actualParameters: args,
        continuation: cb,
        replyId: replyId
    }
    
    this.openCalls.push(thunk);
    console.log('Saved call', name, replyId, " OpenCalls: ", this.openCalls.length);
    var that = this;

    return function(replyId){
        for (var i in that.openCalls){
            if (replyId === that.openCalls[i].replyId){
                console.log(' REMOVING call replyId: ', that.openCalls[i].replyId);
                that.openCalls.splice(i, 1);
            }
        }
    };
}; 

RPC.prototype.rpcCall = function(name, args, cb, due) {
    var listener, timer;
    var replyId = this._generateUID(name);
    console.log("rpcCall ", name, args, ' for reply id ', replyId);    

    removeOpenCall = this._saveCall(name, args, cb, replyId);
    
    var send = {
        name: name,
        args: args,
        reply: replyId
    };
    
    this.socket.emit("fix", send);//TODO rename
    log('SEND DATA' + JSON.stringify(send));
    var that = this;

    if (!due) due = this.defaultReplyTimeOut;
    if (due !== Infinity)
        timer = setTimeout(function() {
            var err = new Error(name + " " + args + " call timed out" + replyId);
            removeOpenCall(replyId);
            that.socket.removeListener(replyId, listener);
            cb(err); // ATM just continue with error argument set
        }, due);

    listener = 
        function (data){
            return function (result, replyId) {
                var err = result.error, 
                    res = result.result;
                    console.log('REPLY LISTENER ', res, replyId)

                if(timer) clearTimeout(timer);
                removeOpenCall(replyId);

                if (!err) {
                    if (cb) cb(null, res); //everything ok 
                } else {
                    if (cb) cb(err);
                }
            }(data, replyId);
        };

    //wait for reply
    this.socket.once(replyId,listener);
};


if (typeof module !== 'undefined' && module.exports)
    module.exports = RPC;