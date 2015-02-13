

if(typeof module !== 'undefined' && module.exports)
    module.exports = Rpc;

function Rpc(){
	this.noReplyTimeOut = 30000;
};

Rpc.prototype.expose = function(o){
    for(prop in o){
        if (!o.hasOwnProperty(prop)) {
            continue;
        }
        
        this._exposeF(prop, o[prop]);
    }
};

Rpc.prototype._exposeF = function(n, f){
    var socket=this.iosocket;
    socket.on(n, function(msg){
        try{
        	var name, args, id;
            name = msg.name;
            args = msg.arg;
            id = msg.id;
            var res = f.apply(this, args);
            socket.emit(id, {result: res, error: null});

        }catch(err){

            socket.emit(id, {result: null, error: err});

        }
    });
};

Rpc.prototype.genId = function(name){
	return name+Math.floor((Math.random() * 100) + 1);
};

Rpc.prototype.call = function(name, args, cb){
    var id, listener, timer, socket;
    socket = this.iosocket;
    
    id = this.genId(name);
    socket.emit(name, {name: name, arg: args, id: id});

    if(!cb)
        return;
    
    listener = function(result){
        //console.log(result);
        var err, res;

        clearTimeout(timer);
        
        res = result.result;
        err = result.error;

        if(!err){
            cb(null, res);//everything ok
        }else{
            console.error(err);
            cb(err, null);
        }
    };

    //set a timer, because we are interested in reply after noReplyTimeOut
    timer = setTimeout(function(){
        var err = new Error("timedOut");
        socket.removeListener(id, listener); //remember to remove the listener
        cb(err);

    }, this.noReplyTimeOut);

    
    //wait for reply
    socket.once(id, listener);
};