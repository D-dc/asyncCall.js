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
    /* Exception testing */
    'testExplicitException': function() {
        throw new Error('Explicit exception!')
    },
    'testExplicitExceptionCustom': function() {
        throw 5;
    },
    'testImplicitException': function(b) {
        return b.length;
    },
    'testImplicitExceptionEvalError': function() {
        throw new EvalError('eval error message');
    },
    'testImplicitExceptionRangeError': function() {
        new Array(-5);
    },
    'testImplicitExceptionReferenceError': function() {
        var a = 5;
        return a + b;
    },
    'testImplicitExceptionSyntaxError': function() {
        eval("var a = *2;");
    },
    'testImplicitExceptionTypeError': function() {
        new 10;
    },
    'testImplicitExceptionURIError': function() {
        decodeURIComponent('%');
    },
    'testSlowComputation': function() {
        simulateSlowComputation(1000); //take some time to give reply
        return true;
    },
    'testProgVar': function() {
        g++;
        return g;
    }
    /*
    Error – base type for all errors. Never actually thrown by the engine.
EvalError – thrown when an error occurs during execution of code via eval()
RangeError – thrown when a number is outside the bounds of its range. For example, trying to create an array with -20 items (new Array(-20)). These occur rarely during normal execution.
ReferenceError – thrown when an object is expected but not available, for instance, trying to call a method on a null reference.
SyntaxError – thrown when the code passed into eval() has a syntax error.
TypeError – thrown when a variable is of an unexpected type. For example, new 10 or "prop" in true.
URIError – thrown when an incorrectly formatted URI string is passed into encodeURI, encodeURIComponent, decodeURI, or decodeURIComponent.

    */
});

module.exports = myServer;
