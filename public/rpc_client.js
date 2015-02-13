
//see clientside options
//https://github.com/Automattic/socket.io-client/blob/master/lib/manager.js#L32
var clientOpts = {
    reconnection: true, 
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000, 
    randomizationFactor: 0.5, // for the backoff
    timeout: 20000,
    autoConnect: true
};

    var ClientRpc = function(url, opts){
        this.iosocket = io(url, opts);
        this.iosocket.on("error", function(err){
            console.error("Client: iosocket error " + err);
        });
    }
    ClientRpc.prototype = new Rpc();

    myClient = new ClientRpc('http://127.0.0.1:80', clientOpts);
    myClient.expose({
        'testClient': function (a){
            console.log("testClient")
            return a*a;
        },
        'ping': function(ctr){
            console.log("ping " + ctr);
            setTimeout(function(){myClient.call("pong", [ctr])}, 2000);
        }
    })

    //
    // eigenlijke code
    //

    var a = 1;
    var b = 2;
    var c = 3;

    myClient.call("testRemote", [a, b], function(err, res){
        if(err) console.error(err);
        console.log("testRemote 3 " + res);
    });

    // myClient.call("testRemote", [c, c], function(err, res){
    //     if(err) console.error(err);
    //     console.log("testRemote 6 "+res);
    // });


    // myClient.call("testRemote2", [c, c], function(err, res){
    //     if(err) console.error(err);
    //     console.log("testTwo 9 "+res);
    // });

    // myClient.call("testNoExist", [c, c], function(err, res){
    //     if(err){
    //         console.error(err);
            
    //     }
    // });

    callServer = function(){
        console.log(" callServer called")
        myClient.call("testRemote", [a, b], function(err, res){
            if(err) 
                console.error(err);
            else
                console.log("callServer reply" + res);
            //console.log("context " + a);
            
        });
    }
