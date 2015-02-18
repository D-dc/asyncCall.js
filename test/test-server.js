var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../lib/rpc_server.js'),
    port = 8123;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/'));


function simulateSlowComputation(millis){
	var fixDate = new Date();
	var current = null;
	do { current = new Date(); }
	while(current-fixDate < millis);
};


var g=0;
var myServer = new ServerRpc(serverHttp);
myServer.expose({
    'testFuncNoArgs': function() {
        return true;
    },
    'testFuncSingleArg': function(a) {
        return a;
    },
    'testFuncTwoArg': function(a, b) {
        return a + b;
    },
    'testFuncArgumentsVar': function(a){
        return Array.prototype.slice.call(arguments);
    },
    'testFuncNoReturn': function() {

    },
    'testFuncSum': function(a, b) {
        return a + b;
    },
    'testFuncIncrement': function(a) {
        a++;
        return a;
    },
    'testExplicitException': function() {
        throw new Error('Explicit exception!')
    },
    'testImplicitException': function(b) {
        return b.length;
    },
    'testSlowComputation': function() {
        simulateSlowComputation(1000); //take some time to give reply
        return true;
    },
    'testProgVar': function() {
        g++;
        return g;
    }
});

module.exports = myServer;
