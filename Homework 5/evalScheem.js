function NotEnoughArgumentsException( name, expects ) {
  return {
    name: 'NotEnoughArgumentsException',
    message: name + ' expects ' + expects + ' arguments.'
  }
}

function TooManyArgumentsException( name, expects ) {
  return {
    name: 'TooManyArgumentsException',
    message: name + ' expects ' + expects + ' arguments.'
  }
}

function UndefinedVariableExpection( name ) {
  return {
    name: 'UndefinedVariableExpection',
    message: 'A variable called ' + name + ' has not been defined yet.'
  }
}

function VariableAlreadyDefinedExpection( name ) {
  return {
    name: 'VariableAlreadyDefinedExpection',
    message: 'A variable called ' + name + ' has already been defined.'
  }
}

function InvalidTypeException( name, expected, actual ) {
  return {
    name: 'InvalidTypeException',
    message: 'Expected ' + name + ' to be of type ' + expected + ' but found it to be ' + actual + '.'
  }
}

function UnexpectedArgumentCountException( name, expected ) {
  return {
    name: 'UnexpectedArgumentCountException',
    message: name + ' expects ' + JSON.stringify( expects ) + ' arguments.'
  }
}

var checkArgsMode = {
  'exact' : 'exact',
  'atLeast' : 'atLeast'
};

function CheckArgs( name, expr, expects, mode ) {
  if( mode === undefined ) {
    mode = checkArgsMode.exact;    
  }
  
  switch( mode ) {
    case 'exact':
      if( expr.length - 1 < expects ) {
        throw new NotEnoughArgumentsException( name, expects );
      }
      if( expr.length - 1 > expects ) {
        throw new TooManyArgumentsException( name, expects );
      }
    case 'atLeast':
      if( expr.length - 1 < expects ) {
        throw new NotEnoughArgumentsException( name, expects );
      }   
  }
}

function CheckTypes( name, expr, env, typeChecker ) {
  for( var i = 1; i < expr.length; i++ ) {
    var check = typeChecker( expr[ i ], env );
    if( check.expected !== check.actual ) {
      throw new InvalidTypeException( name, check.expected, check.actual );
    }
  }
}

function typeChecker( expr, env, expected ) {
  return {
    expected: expected,
    actual: typeof evalScheem( expr, env )
  };
}

function numberChecker( expr, env ) {
  return typeChecker( expr, env, 'number' );
}

function arrayChecker( expr, env ) {
  var eval = evalScheem( expr, env );
  return {
    expected: 'array',
    actual: eval.length ? 'array' : typeof eval
  };
}

function boolChecker( expr, env ) {
  var eval = evalScheem( expr, env );
  return {
    expected: 'boolean',
    actual: eval === '#t' || eval === '#f' ? 'boolean' : typeof eval
  };  
}

function variadic( name, expr, env, checker, func ) {
  CheckArgs( name, expr, 2, checkArgsMode.atLeast );
  CheckTypes( name, expr, env, checker );
  var result = evalScheem( expr[ 1 ], env );
  for( var i = 2; i < expr.length; i++ ) {
    result = func( result, evalScheem( expr[ i ], env ) );
  }
  return result;
}

function booleanVariadic( name, expr, env, checker, func, invert ) {
  invert = invert === undefined ? false : invert;
  CheckArgs( name, expr, 2, checkArgsMode.atLeast );
  CheckTypes( name, expr, env, checker );
  var result = evalScheem( expr[ 1 ], env );
  for( var i = 2; i < expr.length; i++ ) {
    var matches = func( result, evalScheem( expr[ i ], env ) );
    if( ( invert ? matches : !matches ) ) {
      return invert;
    }
  }
  return !invert;  
}

var lookup = function (env, v) {
    if( env === undefined ) {
      return undefined;
    }
    if( env.bindings[ v ] !== undefined ) {
      return env.bindings[ v ];
    }
    
    return lookup( env.outer, v );
};

var update = function (env, v, val) {
    if( env === undefined ) {
      throw new UndefinedVariableExpection( v );
    }    
    if( env.bindings[ v ] !== undefined ) {
      env.bindings[ v ] = val;
      return;
    }
    update( env.outer, v, val );
};

var addBinding = function (env, v, val) {            
    if( env.bindings[ v ] !== undefined ) {
      throw new VariableAlreadyDefinedExpection( v );
    }      
    env.bindings[ v ] = val;
};

var evalScheem = function (expr, env) {
    if( env !== undefined && env.bindings === undefined ) {
      env.bindings = {};
    }
    
    if (typeof expr === 'number' || expr === '#t' || expr === '#f' ) {
        return expr;
    }
    
    if (typeof expr === 'string') {
        return lookup( env, expr );
    }

    switch (expr[0]) {
        case '+':
            return variadic( '+', expr, env, numberChecker, function( a, b ) {
              return a + b;
            });
        case '-':
            return variadic( '-', expr, env, numberChecker, function( a, b ) {
              return a - b;
            });                   
        case '/':
            return variadic( '/', expr, env, numberChecker, function( a, b ) {
              return a / b;
            });                   
        case '*':
            return variadic( '*', expr, env, numberChecker, function( a, b ) {
              return a * b;
            });  
        case '%':
            return variadic( '%', expr, env, numberChecker, function( a, b ) {
              return a % b;
            }); 
        case '=':     
            return booleanVariadic( '=', expr, env, numberChecker, function( a, b ) {
              return a === b;
            }) ? '#t' : '#f';
        case '!=':
            return booleanVariadic( '!=', expr, env, numberChecker, function( a, b ) {
              return a === b;
            }) ? '#f' : '#t';
        case '<':
            return booleanVariadic( '<', expr, env, numberChecker, function( a, b ) {
              return a < b;
            }) ? '#t' : '#f';
        case '>':
            return booleanVariadic( '>', expr, env, numberChecker, function( a, b ) {
              return a > b;
            }) ? '#t' : '#f';
        case '<=':
            return booleanVariadic( '<=', expr, env, numberChecker, function( a, b ) {
              return a <= b;
            }) ? '#t' : '#f';
        case '>=':
            return booleanVariadic( '>=', expr, env, numberChecker, function( a, b ) {
              return a >= b;
            }) ? '#t' : '#f';
        case '&&':
            return booleanVariadic( '&&', expr, env, boolChecker, function( a, b ) {
              return a === '#t' && b === '#t';
            }) ? '#t' : '#f';
        case '||':
            return booleanVariadic( '||', expr, env, boolChecker, function( a, b ) {
              return a === '#t' || b === '#t';
            }, true ) ? '#t' : '#f';
        case 'let-one':
            var bindings = {};
            bindings[ expr[ 1 ] ] = evalScheem( expr[ 2 ], env );
            var localEnv = { 
                bindings: bindings,
                outer: env
            };
            return evalScheem( expr[ 3 ], localEnv );        
        case 'define':
            CheckArgs( 'define', expr, 2 );            

            addBinding( env, expr[ 1 ], evalScheem( expr[ 2 ], env ) ); 
            return 0;
        case 'set!':            
            CheckArgs( 'set!', expr, 2 );                        
                       
            update( env, expr[ 1 ], evalScheem( expr[ 2 ], env ) ); 
            return 0;
        case 'begin':
            CheckArgs( 'begin', expr, 1, checkArgsMode.atLeast );     
        
            var result;
            for( var i = 1; i < expr.length; i++ ) {
              result = evalScheem( expr[ i ], env );
            }
            return result;
        case 'quote':
            CheckArgs( 'quote', expr, 1 );
            
            return expr[ 1 ];
        case 'cons':
            CheckArgs( 'cons', expr, 2 );            
        
            return [ evalScheem( expr[ 1 ], env ) ].concat( evalScheem( expr[ 2 ], env ));            
        case 'car':
            CheckArgs( 'car', expr, 1 );            
            CheckTypes( 'car', expr, env, arrayChecker );
            
            return evalScheem( expr[ 1 ], env )[ 0 ];
        case 'cdr':
            CheckArgs( 'cdr', expr, 1 );            
            CheckTypes( 'cdr', expr, env, arrayChecker );
            
            return evalScheem( expr[ 1 ], env ).slice( 1 );
        case 'if':
            CheckArgs( 'if', expr, 3 );            
            CheckTypes( 'if', [ expr[ 1 ] ], env, boolChecker );
            return evalScheem( expr[ 1 ], env ) === '#t' ? evalScheem( expr[ 2 ], env ) : evalScheem( expr[ 3 ], env );
        case 'lambda-one':                     
        case 'lambda':    
            var func = function( args, env ) {
                var bindings = {};
                for( var i = 0; i < expr[ 1 ].length; i++ ) {
                  bindings[ expr[ 1 ][ i ] ] = evalScheem( args[ i ], env );
                }
                var localEnv = { 
                    bindings: bindings,
                    outer: env
                };
                return evalScheem( expr[ 2 ], localEnv );
            };              
            return {
              name: 'lambda',
              func: func
            };
        default:
            var lambda = evalScheem( expr[ 0 ], env );
            return lambda.func( expr.slice( 1 ), env );
    }
};

var evalScheemString = function( expr, env ) {
  return evalScheem( SCHEEM.parse( expr ), env);
}