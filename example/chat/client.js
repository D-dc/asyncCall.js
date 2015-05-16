'use strict';


var myClient = new ClientRpc('http://127.0.0.1:3000');

//Exposed interface.
myClient.expose({
    'hearMsg': function (author, msg, callback) {

        console.log('Received', author, msg);
        $messages.append('<p><b>' + author + '</b>:' + msg + '</p>');

    }
});


//HTML elements -> jquery

var $messages = $('.chatScreen'); // Messages area
var $message = $('.message'); // Input message
var $author = $('.author'); // Input author

var speakMsg = function () {

    var msg = $message.val();
    var author = $author.val();

    myClient.rpc('sayMsg', author, msg, function (err, res) {
        if (err)
            alert('Could not send message' + err);
        else
            $message.val('');

    });
};