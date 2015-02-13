 
var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    Server = require('socket.io'),//.listen(server);
    io = new Server(serverHttp, serverOpts),
    Rpc = require('./public/rpc.js'),
    port = 80;

serverHttp.listen(port, function () {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/public'));


//see server options
//https://github.com/Automattic/engine.io/blob/master/lib/server.js#L38
var serverOpts = {
    //heartbeat
    pingTimeout: 6000, //timeout from client to receive new heartbeat from server (value shipped to client)
    pingInterval: 2500, //timeout when server should send heartbeat to client
};


var ServerRpc = function(socket){
    this.iosocket = socket;
    this.iosocket.on("error", function(err){
        console.error("Server: iosocket error " + err);
    });
}
ServerRpc.prototype = new Rpc();

io.on('connection', function (socket) {

    //console.log("conn "+socket.iosocket.io.engine.id);

    var myServer = new ServerRpc(socket);

    //server-side methods
    myServer.expose({
        'testRemote': function (a, b){
            console.log("testRemote called, args: " + a + " " + b)
            return a + b;
        },
        'pong': function(a){
            a=a+1;
            console.log("pong " + a);
            setTimeout(function(){myServer.call("ping", [a])}, 2000);
        }


        // },
        // 'testRemote2': function (a, b){
        //     //throw new Error("Some error");
        //     console.log("testRemote2 called, args: " + a + " " + b)
        //     return a * b;
        // }
    });

    //
    // eigenlijke code
    //

    var a = 5;
    myServer.call("testClient", [a], function(err, res){
        if(err) console.error(err);
        console.log("testClient 25 " + res);
    });
    //myServer.call("ping", [1])
    

    /*test = function(){
        setTimeout(function(){

            socket.emit("non exist");
            test();
        }, 4000);
    }
    test();*/
});