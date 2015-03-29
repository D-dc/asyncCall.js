'use strict';

var noOp = function(){};

// Wrapper...
// a catch all method would be nice here
/*var JSProxy = function(target, handler){
    
    var slot;
    for (slot in handler) {
        
        if(typeof target[slot] === undefined){
            
            throw new Error('Handler for undefined slot in target.');
        
        }else if(typeof target[slot] === 'function'){
            
            this[slot] = function(){
                
                var args = Array.prototype.slice.call(arguments);
                return handler[slot](target[slot], args, target);
            }; 
            
        }else{
            //TODO fields etc. ignored
        }
    }
};*/

// Delegation based ...
// prefered because if we do not instrument a certain function call
// the original will be looked up by following the chain of parent objects
var makeJSProxy = function(target, handler){
    var p = Object.create(target); //prototype of p is target

    var slot;
    for (slot in target) {

        if(typeof target[slot] === 'function'){
            if(handler[slot] !== undefined){
                 
                p[slot] = function(slot){
                    return function(){
                    
                        var args = Array.prototype.slice.call(arguments);
                        var proto = Object.getPrototypeOf(this); //! static parent
                        var subject = this._getProto(); //dynamic parent
                        return handler[slot](proto[slot], args, proto, subject);
                    };
                }(slot);
        
            }else{
               
                p[slot] = function(slot){
                    return function(){
                        var args = Array.prototype.slice.call(arguments);
                        var proto = Object.getPrototypeOf(this); //! static parent
                        return proto[slot].apply(proto, args);
                    };
                }(slot);
            }
                
        }else{
            //TODO fields etc. ignored
            
        }

    }

    //dynamic proto lookup, to avoid:
    //  problem this.a goes up in the chain to find it 
    //  but this.a--; => this.a = this.a -1; does not go up in the chain
    //  it just sets the immediate parent
    p._getProto = function(){
        var proto = Object.getPrototypeOf(this); //!
    
        if(!proto._getProto){
            return proto;
        }

        var interProto =  proto._getProto();
        return interProto;
    };

    return p;
};

/////////////////////////////////////////////////////
//Original functionality
/*var RPC = function(){
    this.a = 42;

    this.func = function(){ 
        console.log('CALLING', this.a)
        return this.a++;
    };
};

RPC.prototype.rpcCall = function(func, argArr, cb, due){
    console.log('RPCall succeeded', this.a, this);
    this.a++;
    return this.a;
};
RPC.prototype.unInstFunc = function(){ return this.a;};*/



////////////////////////////////////////////////////

/*var LOGProxy = function(target){
    return new JSProxy(target, LOGProxy.handler);           
};

LOGProxy.handler = {
        rpcCall: function(originalCall, args, context){
            console.log('Instrumented', args);
            
            return originalCall.apply(context, args);
        }
    };


var IGNOREProxy = function(target){
    return new JSProxy(target, IGNOREProxy.handler); 
};

IGNOREProxy.handler = {
        rpcCall: function(originalCall, args, context){
            console.log('suppressed', args);
            context.a =100;
        } 
    };*/

////////////////////////////////////////////////////
/*var c = new RPC();

var d = new IGNOREProxy(c);
var e = new LOGProxy(c);
var f = new LOGProxy(c);
var ff = new LOGProxy(f);

var y = makeJSProxy(c, LOGProxy.handler);
var yy = makeJSProxy(y, LOGProxy.handler);*/


////////////////////////////////////////////////////

// for state
/*var makeIncFieldProxy = function(target, handler){
    var state =1;
    return makeJSProxy(target, {
        rpcCall: function(originalCall, args, context){
            state++;
            console.log('state', state)
            context.a++;
            console.log(context.a, context)
            return originalCall.apply(context, args);
        }
    });
};*/
//


////////////////////////////////////////////////////


if (typeof module !== 'undefined' && module.exports){
    //exports.JSProxy = JSProxy;
    exports.makeJSProxy = makeJSProxy;
}