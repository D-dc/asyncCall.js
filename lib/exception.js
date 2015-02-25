'use strict';

//
// Exceptions
//

/*
Implementation for standardized exceptions:
– Error 
– EvalError  
– RangeError 
– ReferenceError 
– SyntaxError 
– TypeError 
– URIError 

Other throwables (like throw 5) are mapped onto Error.
Custom subtypes of Error are also mapped onto Error.
*/

var excpt = {};
excpt.serialize = function(exception){
	try{

		if(this.isOfError(exception) || this.isImplicitException(exception)){
			return {
				name: exception.name,
				message: exception.message,
				stack: exception.stack //!
			};
		}

		return {
			name: 'Error',
			message: JSON.stringify(exception),
			stack: ''
		};

	}catch(e){

		return {
			name: 'Error',
			message: 'Exception serialize error, ' + e.message,
			stack: ''
		};

	}
};

excpt.deserialize = function(object){
	try{	
		var name = object.name,
			message = object.message,
			stack = object.stack,
			ExcFunc = eval(name);

		var exception = new ExcFunc(message);
		exception.stack = stack;

		return exception;
		
	}catch(e){
		return new Error('Exception deserialize error, ' + e.message);
	}
};

excpt.isException = function(value){
	if (
		(value.name && value.message && value.stack) &&
		(value.name === 'Error' || value instanceof Error 
			//|| filter(value.name, function(){ return true;}, function(){ return false;})
			)
		)
		return true;

	return false;
};

var filter = function (value, caseTrue, caseFalse){
	if(
		value instanceof EvalError ||
		value instanceof RangeError ||
		value instanceof ReferenceError || 
		value instanceof SyntaxError ||
		value instanceof TypeError ||
		value instanceof URIError
	)
		return caseTrue();	
		
		//custom exception
		return caseFalse();
};

excpt.isImplicitException = function(value){
	return filter(value, function(){ return true;}, function(){ return false;});
};

excpt.isOfError = function(value){
	return (value instanceof Error && value.name === 'Error');
};

////////////////////////////////////////////////////////////////////////////////////////////


module.exports =  excpt;