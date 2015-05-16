'use strict';


//HTML elements -> jquery

var $messages = $('.messages'); // Messages area

var myClient = new ClientRpc('http://127.0.0.1:3000');


myClient.expose({
    'pong': function(counter, callback) {
        myClient.rpc('ping', counter, function(err, res) {
            if(err)
                $messages.append('<p>unsuccessful ping ' + counter + " Err: " + err, "</p>");
            else       
                $messages.append('<p>successful ping ' + counter + " Time: " + res, "</p>"); 
        }, 10); //very small due will result in unsuccess / success pings
    }
});

//start sending a ping to the server.
myClient.rpc('ping', 0, function(err, res, retry){
    if(err) retry();
});