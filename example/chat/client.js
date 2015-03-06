'use strict';

var options =  {
    defaultRpcTimeout: Infinity,
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

    });
};