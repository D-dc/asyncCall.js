
/*
Implementation for standardized exceptions:
– Error 
– EvalError  
– RangeError 
– ReferenceError 
– SyntaxError 
– TypeError 
– URIError 

Other throwables (like throw 5;) are mapped onto Error
*/

var excpt = {};
excpt.serialize = function(exception){

	if(isException(exception)){
		return {
			name: exception.name,
			message: exception.message,
			stack: "" //exception.stack leave out for now
		}
	}

	return {
		name: "Error",
		message: exception,
		stack: ""
	}
}

excpt.deserialize = function(object){
	try{	
		var name = object.name,
			message = object.message,
			stack = object.stack,
			excFunc = eval(name);

		var exception = new excFunc(message);
		exception.stack = stack;

		return exception;
		
	}catch(e){
		return new Error("Exception deserialize error, " + e);
	}
}

isException = function(value){
	if (
		(value.name && value.message && value.stack) &&
		(value.name === "Error" || 
			filter(value.name, function(){ return true;}, function(){ return false;}))
		)
		return true;

	return false;
}

filter = function(value, caseTrue, caseFalse){
	switch(value){
		case "EvalError": 
			return caseTrue();
		case "RangeError": 
			return caseTrue();
		case "ReferenceError": 
			return caseTrue();
		case "SyntaxError":
			return caseTrue(); 
		case "TypeError": 
			return caseTrue();
		case "URIError":
			return caseTrue();
		case "Error":
			return caseTrue();	
		default: //custom exception
			return caseFalse();
	}
}


if (typeof module !== 'undefined' && module.exports){
	module.exports =  excpt;
} 
