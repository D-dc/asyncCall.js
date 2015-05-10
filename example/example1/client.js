'use strict';

var options = {
    reconnection: true, //auto reconnect
    reconnectionAttempts: Infinity, //attempts before giving up
    reconnectionDelay: 1000, //how long to wait before reconnect (doubles + randomized by randomizationFactor)
    reconnectionDelayMax: 5000, //max delay before reconnection
    randomizationFactor: 0.5,
    timeout: 2000, //time before connect_error, connect_timeout events
    autoConnect: true, //automatically connect
    defaultRpcTimeout: Infinity, //default delay before an RPC call should have its reply. Infinity = no timeout
    throwNativeError: false
};


var myClient = new ClientRpc('http://127.0.0.1:3000', options);

myClient.rpc('testRemote', 1, 2, 3, function (err, res) {
    console.log(' - Callback result param: ', res);
    console.log(' - Callback error param: ', err);
});

myClient.expose({
    'testClient': function (a, callback) {
        console.log('testClient', a, ' called');
        callback(undefined, a);
    },
    'ping': function (ctr, callback) {
        console.log('ping ' + ctr);
        setTimeout(function () {
            myClient.rpc('pong', [ctr]);
        }, 2000);
    }
});

myClient.onConnected(function () {
    console.log('onConnect');
});

myClient.onDisconnected(function () {
    console.log('onDisconnect');
});

myClient.onceConnected(function () {
    console.log('onceConnect');
});

myClient.onceDisconnected(function () {
    console.log('onceDisconnect');
});

var a = 1;
var b = 2;
var c = 3;

/*
    EXAMPLES
*/

/*
    CallServer No due => default keep waiting for reply for ever
*/
var callServer = function () {
    console.log('CallServer called');

    myClient.rpc('testRemote', a, b, c, function (err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });

};

/*
    CallServer with @Due: keep waiting until due or result received
*/
var callServerDue = function () {
    console.log('CallServerDue called');

    myClient.rpc('testRemote', a, b, c, function (err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    }, 2);

};

/*
    Call a function that does not exists on the server
*/
var callServerInexist = function () {
    console.log('CallServerInexist called');

    myClient.rpc('testNonExists', a, b, c, function (err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });
};

/*
    Call a function that triggers an exception
*/
var callServerTriggerException = function () {

    console.log('TriggerException called');
    myClient.rpc('triggerException', function (err, res) {
        console.log(' - Callback result param: ', res);
        console.log(' - Callback error param: ', err);
    });
};