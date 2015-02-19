myClient = new ClientRpc('http://127.0.0.1:80');
myClient.expose({
    'testClient': function(a) {
        console.log("testClient", a, ' called');
        return a;
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

/*myClient.rpcCall("testRemote", [a, b], function(err, res) {
    res += 3;
    console.log("testRemote 6 " + res);
});*/

/*myClient.rpcCall("slow", [], function(err, res){
    if(err){
        console.info('call timed out');
    }
}, 5000);*/


/*
    CallServer No due => default keep waiting for reply for ever
*/
callServer = function() {
    console.log(" callServer called")
    myClient.rpcCall("testRemote", [a, b, c], function(err, res) {
        console.log(" reply " + res, err);
    });
}

callServerInexist = function() {
    console.log(" callServerInexist called")
    myClient.rpcCall("testNon exists", [a, b, c], function(err, res) {
        console.log(" reply " + res, err);
    });
}

callServerTriggerException = function() {
    console.log(" triggerException called")
    myClient.rpcCall("triggerException", [], function(err, res) {
        console.log(" reply " + res, err);
    });
}

/*
    CallServer with Due: keep waiting until due elapsed
*/
callServerDue = function() {
    console.log(" callServerDue called")
    myClient.rpcCall("testRemote", [a, b, c], function(err, res) {
        console.log(" reply " + res, err);
    }, 2);
}
