var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    Rpc = require('../public/rpc.js'),
    ServerRpc = require('../rpc_server.js'),
    port = 8123;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/public'));



var getFuncName = function(args) {
    return name = args.callee.toString();
}

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
    }
});