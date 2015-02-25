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

var $messages = $('.chatScreen'); // Messages area
var $message = $('.message'); // Input message
var $author = $('.author'); // Input author


var myClient = new ClientRpc('http://127.0.0.1:80', options);
myClient.expose({
    'hearMsg': function(author, msg) {
        
        console.log('Received', author, msg);
        $messages.append('<p><b>' + author + '</b>:' +  msg + '</p>');

    }
});

/*
    EXAMPLES
*/

var speakMsg = function() {
    
    //get the values
    var msg = $message.val();
    var author = $author.val();
    
    //
    myClient.rpcCall('sayMsg', [author, msg], function(err, res) {
        if(err)
            alert('Could not send message' + err);
        else
            $message.val('');

    }, 2000);
};



