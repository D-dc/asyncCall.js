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

var ClientRpc = function(url, opts) {
    this.options = opts || defaultOptions();

    var socket = io(url, this.options);
    Rpc.call(this, socket);
    socket.on("error", function(err) {
        console.error("Client: iosocket error " + err);
    });

    // see http://stackoverflow.com/questions/8832414/overriding-socket-ios-emit-and-on/9674248#9674248

    /* var original = socket.on;

     socket.on = function(event, fn){
       console.log("exec "+arguments + ' ' + original);
       return original(event, fn); 
     }

     console.log(original)*/




}
ClientRpc.prototype = new Rpc();

Rpc.prototype.id = function() {
    return this.socket.io.engine.id;
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientRpc;
}


////////////////////////////////////////////////////////////////////////////////////////////



/*myClient = new ClientRpc('http://127.0.0.1:80');
myClient.expose({
    'testClient': function(a) {
        console.log("testClient")
        return a * a;
    },
    'ping': function(ctr) {
        console.log("ping " + ctr);
        setTimeout(function() {
            myClient.call("pong", [ctr])
        }, 2000);
    }
});

var a = 1;
var b = 2;
var c = 3;

myClient.call("testRemote", [a, b], function(err, res) {
    if (err) console.error(err);

    res += 3;
    console.log("testRemote 6 " + res);
});

// myClient.call("testRemote", [c, c], function(err, res){
//     if(err) console.error(err);
//     console.log("testRemote 6 "+res);
// });


// myClient.call("testRemote2", [c, c], function(err, res){
//     if(err) console.error(err);
//     console.log("testTwo 9 "+res);
// });

myClient.call("testNoExist", [c, c], function(err, res){
    if(err){
        console.error(err);

    }
});

callServer = function() {
    console.log(" callServer called")
    myClient.call("testRemote", [a, b, c], function(err, res) {
        console.log("callServer reply " + res);
        res += 3;
        a++;
        console.log("testRemote 6 " + res);

    });
}
*/