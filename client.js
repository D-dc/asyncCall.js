'use strict';

var options =  {
        reconnection: true, //auto reconnect
        reconnectionAttempts: Infinity, //attempts before giving up
        reconnectionDelay: 1000, //how long to wait before reconnect (doubles + randomized by randomizationFactor)
        reconnectionDelayMax: 5000, //max delay before reconnection
        randomizationFactor: 0.5,
        timeout: 2000, //time before connect_error, connect_timeout events
        autoConnect: true, //automatically connect
        //CUSTOM
        defaultRpcTimeout: Infinity //default delay before an RPC call should have its reply. Infinity = no timeout
    };


var myClient = new ClientRpc('http://127.0.0.1:80', options);
myClient.expose({
    'testClient': function(a) {
        console.log('testClient', a, ' called');
        return a;
    },
    'ping': function(ctr) {
        console.log('ping ' + ctr);
        setTimeout(function() {
            myClient.rpcCall('pong', [ctr]);
        }, 2000);
    }
});

var a = 1;
var b = 2;
var c = 3;


/*
    CallServer No due => default keep waiting for reply for ever
*/
var callServer = function() {
    console.log('CallServer called');
    myClient.rpcCall('testRemote', [a, b, c], function(err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });
};

/*
    CallServer with @Due: keep waiting until due elapsed
*/
var callServerDue = function() {
    console.log('CallServerDue called');
    myClient.rpcCall('testRemote', [a, b, c], function(err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    }, 2);
};

/*
    Call a function that does not exists on the server
*/
var callServerInexist = function() {
    console.log('CallServerInexist called');
    myClient.rpcCall('testNonExists', [a, b, c], function(err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });
};

/*
    Call a function that triggers an exception
*/
var callServerTriggerException = function() {
    console.log('TriggerException called');
    myClient.rpcCall('triggerException', [], function(err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });
};


