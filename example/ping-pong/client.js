'use strict';

var options =  {
    reconnection: true, //auto reconnect
    reconnectionAttempts: Infinity, //attempts before giving up
    reconnectionDelay: 1000, //how long to wait before reconnect (doubles + randomized by randomizationFactor)
    reconnectionDelayMax: 5000, //max delay before reconnection
    randomizationFactor: 0.5,
    timeout: 2000, //time before connect_error, connect_timeout events
    autoConnect: true, //automatically connect
    defaultRpcTimeout: Infinity, //default delay before an RPC call should have its reply. Infinity = no timeout
    leaseRenewOnExpire: true
};

//HTML elements -> jquery

var $messages = $('.messages'); // Messages area

var myClient = new ClientRpc('http://127.0.0.1:80', options);


myClient.expose({
    'pong': function(counter) {
        myClient.rpcCall('ping', [counter], function(err, res) {
            if(err)
                $messages.append('<p>unsuccessful ping ' + counter + " Err: " + err, "</p>");
            else       
                $messages.append('<p>successful ping ' + counter + " Time: " + res, "</p>"); 
        }, 5); //very small due will result in unsuccess / success pings
    }
});

//start sending a ping to the server.
myClient.rpcCall('ping', [0]);