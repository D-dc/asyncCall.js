

var express = require('express'),
     app = express(),
     serverHttp = require('http').createServer(app),
     Rpc = require('../public/rpc.js'),
     //io = require('socket.io-client'),
     ServerRpc = require('../rpc_server.js'),
     port = 8123;

 serverHttp.listen(port, function() {
     console.log('Server listening at port %d', port);
 });
 app.use("/", express.static(__dirname + '/public'));



var getFuncName = function(args){
	return name = args.callee.toString();
}

 var myServer = new ServerRpc(serverHttp);
myServer.expose({
     'testFuncNoArgs': function() {
        //cconsole.log(getFuncName(arguments)); 
        return true;
     },
     'testFuncSingleArg': function(a) {
        //cconsole.log(getFuncName(arguments));
        return a;
     },
     'testFuncTwoArg': function(a, b) {
        //cconsole.log(getFuncName(arguments));
        return a+b;
     },
     'testFuncNoReturn': function() {
        //cconsole.log(getFuncName(arguments));
     },
     'testFuncSum': function(a, b) {
        //cconsole.log(getFuncName(arguments));
        return a+b;
     },
     'testFuncIncrement': function(a) {
        //cconsole.log(getFuncName(arguments));
        a++;
        return a;
     },
     'testExplicitException': function() {
        //cconsole.log(getFuncName(arguments));
        throw new Error('Explicit exception!')
     },
     'testImplicitException': function(b) {
        //console.log(getFuncName(arguments));
        
        return b.length;
     }
 });