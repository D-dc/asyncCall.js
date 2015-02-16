var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('./lib/rpc_server.js'),
    port = process.env.PORT || 80;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/public'));

var c=1;
var myServer = new ServerRpc(serverHttp);
myServer.expose({
     'testRemote': function(a, b) {
         //excess arguments are accessible via 'arguments'
         var args = Array.prototype.slice.call(arguments);
         console.log("testRemote called, args: " + args);
         c++
         return a + b + c;
     },
     'pong': function(b) {
         b = b + 1;
         console.log("pong " + b);
         setTimeout(function() {
             myServer.rpcCall("ping", [b])
         }, 2000);
     },
     'slow': function() {
        //pausecomp(10000);
     }
 });

callClient = function() {
    myServer.rpcCall("testClient", [5], function(err, res) {
        console.log("testClient reply " + res, err);
    });
    setTimeout(function(){callClient();}, 10000);
}
callClient();