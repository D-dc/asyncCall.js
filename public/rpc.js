//
// RPC library.
//

if (typeof module !== 'undefined' && module.exports)
    module.exports = Rpc;

function Rpc(socket) {
    console.log("new socket " + socket);
    this.noReplyTimeOut = 3000;
    this.exposedFunctions = [];
    this.socket = socket;
    this.openCalls = [];
};


Rpc.prototype.expose = function(o) {
    var that = this;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {//reflection
            continue;
        }

        this._exposeFunction(prop, o[prop]);
    };

    //incoming function call
    this.socket.on("fix", function(data) {
        if (!data.id) //TODO cleanly filter out replies
            return;

        var arr = that.exposedFunctions;
        
        //lookup
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            if (obj.name == data.name) {
                obj.closure(data.args, data.id);
                return;
            }
        }

        //only reply to actual functions not found
        if (data.id)
            that.socket.emit(data.id, {
                result: null,
                error: "function not found"
            });
    });
};

Rpc.prototype.genId = function(name) {
    return name + Math.floor((Math.random() * 1000) + 1);
};


Rpc.prototype._exposeFunction = function(name, func) {
    var that = this;

    var closure = function(args, replyId) {
        try {
 
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




Rpc.prototype.call = function(name, args, cb) {
    var replyId, listener, timer, socket;
    var that = this;

    replyId = this.genId(name);

    this.socket.emit("fix", {//TODO rename
        name: name,
        args: args,
        id: replyId
    });


    //there is no callback, so don't wait for reply
    if (!cb) return; 

    listener = function(result) {
        var err = result.error, 
            res = result.result;;

        clearTimeout(timer);

        if (!err) {
            cb(null, res); //everything ok 
        } else {
            //console.error(err);
            cb(err);
        }
    };

    //set a timer, because we are interested in reply after noReplyTimeOut
    timer = setTimeout(function() {
        var err = new Error("timedOut");
        that.socket.removeListener(replyId, listener); //remember to remove the listener
        cb(err);

    }, this.noReplyTimeOut);


    //wait for reply
    this.socket.once(replyId, listener);
};