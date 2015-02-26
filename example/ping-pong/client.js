'use strict';

var options =  {
    defaultRpcTimeout: 2000, 
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