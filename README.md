# RPC
A nodeJS library for Remote Procedure Calls between Client & Server with exception propagation (back to caller from callee) and delivery guarantees to support finegrained failure handling.

### Features
#### **Exceptions**: 
All exceptions thrown by the callee will be serialized back to the caller so it can react upon it:
* *Native Javascript errors*: EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError.
* *Application or Userdefined errors*: these should have as prototype Error();.
* *Network errors*: (see further)
* Others: Library specific ones like serializationError, FunctionNotFound, etc.

#### **Network related failures**: 

No network connection etc.
* *Network disconnections*: Network disconnections can cause RPC to fail. The network might be disconnected before performing or during the remote call (Omission failures, crash failures). This may hamper an application relying on these RPCs. We therefore incorporate a mechanism to retry a RPC call when it has failed. Simply retrying a RPC call could cause operations to perform operations multiple times (calling functions which perform side-effects that are not idempotent). We use a mechanism of filters and caching to avoid this problem. Hence the caller can decide what guarantees it want e.g. Maybe, At-Most-Once, Once on a call level.
```javascript 
myClient.rpc('remoteFunction', a, b, c, function(err, res, retry) {
   //err will contain a NetworkError, when we are disconnected.
   if(err) retry();       
});
```
* *Due*: Able to specify a timeout for a callback, indicating that we want the answer within the specified time or never. This is for dealing with slow functions or network issues.
```javascript 
//We want the answer within 1 second
myClient.rpc('remoteFunction', a, b, c, function(err, res) {
    //err will contain TimeOutError when we did not get the result within 1 second.
}, 1000);
```

#### **Other**: 
Access to socket.io network connection options (specify heartbeat intervals, reconnection logic etc.) and other options.

### Example: 
Small ping-pong example. Client sends pings to server, server answers with pongs.

**Server code**
```javascript
//set-up using express app.
var server = new ServerRpc(app);

//Expose functions to the client
server.expose({
    'ping': function(counter, callback) {
        var that = this; 
        counter++;

        // this.rpc(...) will perform another rpc only to the call originator.
        // alternatively use server.rpc for broadcast to all clients

        setTimeout(function(){
            that.rpc('pong', [counter]);
        }, 2000);

        var result = new Date();
        callback(null, result);
    }
});
```

**Client code**

Include *client/bundle.js* for all RPC logic.
```javascript
var client = new ClientRpc('http://127.0.0.1:3000');

client.expose({
    'pong': function(counter, callback) {
        //send another ping
        client.rpc('ping', counter, function(err, res) {
            if(err)
                $messages.append('<p>unsuccessful ping ' + counter + " Err: " + err, "</p>");
            else       
                $messages.append('<p>successful ping ' + counter + " Time: " + res, "</p>"); 
        }, 10); //very small due will result in fail / success pings
    }
});

//start sending a ping to the server with counter 0.
client.rpc('ping', 0, function(err, res, retry){
    if(err) retry();
});
```
