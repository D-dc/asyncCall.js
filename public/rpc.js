if (typeof module !== 'undefined' && module.exports)
    module.exports = Rpc;

function Rpc() {
    this.noReplyTimeOut = 3000;
    this.exposedFunction = [];

};

Rpc.prototype.expose = function(o) {
    var that = this;

    for (prop in o) {
        if (!o.hasOwnProperty(prop)) {
            continue;
        }

        this._exposeF(prop, o[prop]);
    };


    this.socket.on("fix", function(msg) {
        if (msg.result != null || msg.error != null) //TODO cleanly filter out replies
            return;

        var arr = that.exposedFunction;
        //lookup
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            if (obj.name == msg.name) {
                obj.closure(msg);
                return;
            }
        }

        //TODO function not found
        if (msg.id)
            that.socket.emit(msg.id, {
                result: null,
                error: "function not found"
            });
        else
            that.socket.emit(msg.id, {
                result: null,
                error: "function not found"
            });
    });
};

Rpc.prototype.genId = function(name) {
    return name + Math.floor((Math.random() * 100) + 1);
};


Rpc.prototype._exposeF = function(n, f) {
    var that = this;

    var closure = function(msg) {
        try {
            var name, args, id, res;
            name = msg.name;
            args = msg.arg;
            id = msg.id;
            res = f.apply(this, args);

            that.socket.emit(id, {
                result: res
            });

        } catch (err) {
            that.socket.emit(id, {
                error: err
            });

        }

    };

    //push the closure
    this.exposedFunction.push({
        name: n,
        closure: closure
    });
};




Rpc.prototype.call = function(name, args, cb) {
    var tid, listener, timer, socket;
    var that = this;

    tid = this.genId(name);
    console.log("CALLING " + name + " @ " + this.id());

    this.socket.emit("fix", {//TODO rename
        name: name,
        arg: args,
        id: tid
    });


    //there is no callback, so don't wait for reply
    if (!cb) return; 

    listener = function(result) {
        var err, res;
        res = result.result;
        err = result.error;
        
        clearTimeout(timer);

        

        if (!err) {
            cb(null, res); //everything ok
        } else {
            console.error(err);
            cb(err, null);
        }
    };

    //set a timer, because we are interested in reply after noReplyTimeOut
    timer = setTimeout(function() {
        var err = new Error("timedOut");
        that.socket.removeListener(tid, listener); //remember to remove the listener
        cb(err);

    }, this.noReplyTimeOut);


    //wait for reply
    this.socket.once(tid, listener);
};