# lease-rpc
A nodeJS library for Remote Procedure Calls between Client & Server based on the concept of leases.

### Features
#### **Operational failures**: 
Example: Call function on other side that does not exists, function on other side has exceptional behaviour.
  * *Implicit exceptions*: (EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError). These exceptions are serialized back to the calling side and visible in the callback error argument.
  * *Explicit exceptions*: (throw 5; throw new Error('message'); subtypes of Error). These exceptions are all mapped to the javascript Error type.
  * Other failures like calling a function that does not exists. These are also mapped to the Error type.

#### **Network related failures**: 
No network connection etc.
  * *Due*: Able to specify a timeout for a callback, indicating that we want the answer within the specified time or never. This is for dealing with slow functions or network issues.
```javascript 
//We want the answer within 1 second
myClient.rpcCall('remoteFunction', [a, b, c], function(err, res) {
        
}, 1000);
```

  * *Mailbox*: If when performing a RPC the other side is not there, (e.g. temporary disconnection), these RPC's are buffered and forwarded upon reconnection. This works for both client-to-server RPC's and server-to-client RPC's. 
  * *Leases*: Able to specify that the connection is leased for a certain time. During this time, the logical connection persists even if there are intermediate disconections. Resources are only freed when the lease expires. Leases can be renewed on successful performing or receiving a RPC.

#### **Other**: 
Access to socket.io network connection options and several other options for Leases and Due.
