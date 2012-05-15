var evalScheem, evalScheemString, lookup;
(function(){
  'use strict';

  var _true = '#t',
      _false = '#f',
      
      checkArgsMode = {
        'exact' : 'exact',
        'atLeast' : 'atLeast'
      },
     
      handlers = {
        numericVariadic:  function( name, expr, env, builtIn ) {
                            return variadic( name, expr, env, numberChecker, builtIn.func );                       
                          },
        booleanVariadic:  function( name, expr, env, builtIn ) {
                            return booleanVariadic( name, expr, env, builtIn.checker || numberChecker, builtIn.func, builtIn.invert ) ? 
                              ( builtIn.returns && builtIn.returns[ 'true' ] ) || _true : 
                              ( builtIn.returns && builtIn.returns[ 'false' ] ) || _false;
                          }
      }, 
      
      builtIns = {
        '+': {
          handler: handlers.numericVariadic,
          func: function( a, b ) { return a + b; }
        },
        '-': {
          handler: handlers.numericVariadic,
          func: function( a, b ) { return a - b; }
        },
        '/': {
          handler: handlers.numericVariadic,
          func: function( a, b ) { return a / b; }
        },
        '*': {
          handler: handlers.numericVariadic,
          func: function( a, b ) { return a * b; }
        },
        '%': {
          handler: handlers.numericVariadic,
          func: function( a, b ) { return a % b; }
        },
        '=': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a === b; }
        },    
        '!=': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a === b; },
          returns: {
            'true' : _false,
            'false' : _true
          }
        },
        '<': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a < b; }
        },
        '>': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a > b; }
        },
        '<=': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a <= b; }
        },
        '>=': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a >= b; }
        },
        '&&': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a === _true && b === _true; },
          checker: boolChecker
        },
        '||': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a === _true || b === _true; },
          checker: boolChecker,
          invert: true
        },
        'cons': {
          func: function( expr, env ) {
                  checkArgs( 'cons', expr, 2 );                    
                  return [ evalScheem( expr[ 1 ], env ) ].concat( evalScheem( expr[ 2 ], env ));          
                }
        },
        'car': {
          func: function( expr, env ) {
                  checkArgs( 'car', expr, 1 );            
                  checkTypes( 'car', expr, env, arrayChecker );
              
                  return evalScheem( expr[ 1 ], env )[ 0 ];
                }
        },
        'cdr': {
          func: function( expr, env ) {
                  checkArgs( 'cdr', expr, 1 );            
                  checkTypes( 'cdr', expr, env, arrayChecker );
                  
                  return evalScheem( expr[ 1 ], env ).slice( 1 );      
                }
        },
        'let': {
          func: function( expr, env ) {
                  checkArgs( 'let', expr, 2 );     
                  
                  var bindings = {};
                  
                  for( var i = 0; i < expr[ 1 ].length; i++ ) {
                    bindings[ expr[ 1 ][ i ][ 0 ] ] = evalScheem( expr[ 1 ][ i ][ 1 ], env );
                  }
                  
                  var localEnv = { 
                    bindings: bindings,
                    outer: env
                  };
                  
                  return evalScheem( expr[ 2 ], localEnv );         
                }
        },
        'define': {
          func: function( expr, env ) {
                  checkArgs( 'define', expr, 2 );            

                  var value = evalScheem( expr[ 2 ], env );
                  addBinding( env, expr[ 1 ], value ); 
                  return value;
                }         
        },        
        'set!': {
          func: function( expr, env ) {
                  checkArgs( 'set!', expr, 2 );                        
                             
                  var value = evalScheem( expr[ 2 ], env );
                  update( env, expr[ 1 ], value ); 
                  return value;
                }         
        },        
        'begin': {
          func: function( expr, env ) {
                  checkArgs( 'begin', expr, 1, checkArgsMode.atLeast );     
              
                  var result;
                  for( var i = 1; i < expr.length; i++ ) {
                    result = evalScheem( expr[ i ], env );
                  }
                  
                  return result;
                }         
        },          
        'quote': {
          func: function( expr, env ) {
                  checkArgs( 'quote', expr, 1 );
                  
                  return expr[ 1 ];  
                }
        },                
        'if': {
          func: function( expr, env ) {
                  checkArgs( 'if', expr, 3 );            
                  checkTypes( 'if', [ expr[ 1 ] ], env, boolChecker );
                  
                  return evalScheem( expr[ 1 ], env ) === _true ? evalScheem( expr[ 2 ], env ) : evalScheem( expr[ 3 ], env ); 
                } 
        },                
        'lambda': {
          func: function( expr, env ) {
                  checkArgs( 'lambda', expr, 2, checkArgsMode.atLeast ); 
                  
                  return function( args, dynamicEnv ) {
                    var bindings = {};
                    for( var i = 0; i < expr[ 1 ].length; i++ ) {
                      bindings[ expr[ 1 ][ i ] ] = evalScheem( args[ i ], dynamicEnv );                  
                    }
                    var localEnv = { 
                      bindings: bindings,
                      outer: env
                    };
                    return evalScheem( expr[ 2 ], localEnv );
                  };  
                } 
        },
        'alert': {
          func: function( expr, env ) {
                  checkArgs( 'alert', expr, 1 );
                  var message = evalScheem( expr[ 1 ], env );
                  if( window && window.alert ) {
                    window.alert( message );
                  } else if( console && console.log ) {
                    console.log( message );
                  }
                  return 0;
                }
        },
        'len': {
          func: function( expr, env ) {
                  checkArgs( 'len', expr, 1 );
                  checkTypes( 'len', expr, env, arrayChecker );   
                  return evalScheem( expr[ 1 ], env ).length;
                }
        },
        'reverse': {
          func: function( expr, env ) {
                  checkArgs( 'len', expr, 1 );
                  checkTypes( 'len', expr, env, arrayChecker );  
                  
                  var values = Array.apply( null, evalScheem( expr[ 1 ], env ) );

                  return values.reverse();
                }
        },
        'contains': {
          func: function( expr, env ) {        
                  checkArgs( 'len', expr, 2 );
                  checkTypes( 'len', [ expr[ 1 ] ], env, arrayChecker );   
                  return evalScheem( expr[ 1 ], env ).indexOf( evalScheem( expr[ 2 ], env ) ) !== -1 ? _true : _false;
                }
        }
      };

  function NotEnoughArgumentsException( name, expects ) {
    return {
      name: 'NotEnoughArgumentsException',
      message: name + ' expects ' + expects + ' arguments.'
    };
  }

  function TooManyArgumentsException( name, expects ) {
    return {
      name: 'TooManyArgumentsException',
      message: name + ' expects ' + expects + ' arguments.'
    };
  }

  function UndefinedVariableExpection( name ) {
    return {
      name: 'UndefinedVariableExpection',
      message: 'A variable called ' + name + ' has not been defined yet.'
    };
  }

  function VariableAlreadyDefinedExpection( name ) {
    return {
      name: 'VariableAlreadyDefinedExpection',
      message: 'A variable called ' + name + ' has already been defined.'
    };
  }

  function InvalidTypeException( name, expected, actual ) {
    return {
      name: 'InvalidTypeException',
      message: 'Expected ' + name + ' to be of type ' + expected + ' but found it to be ' + actual + '.'
    };
  }

  function UnexpectedArgumentCountException( name, expected ) {
    return {
      name: 'UnexpectedArgumentCountException',
      message: name + ' expects ' + JSON.stringify( expected ) + ' arguments.'
    };
  }    
  
  function CannotOverrideBuiltInException( name ) {
    return {
      name: 'CannotOverrideBuiltInException',
      message: 'Cannot override built-in function ' + name + '.'
    };
  }
      
  function checkArgs( name, expr, expects, mode ) {
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
        break;
      case 'atLeast':
        if( expr.length - 1 < expects ) {
          throw new NotEnoughArgumentsException( name, expects );
        }   
        break;
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
    var result = evalScheem( expr, env );
    return {
      expected: 'array',
      actual: result.length ? 'array' : typeof result
    };
  }

  function boolChecker( expr, env ) {
    var result = evalScheem( expr, env );
    return {
      expected: 'boolean',
      actual: result === _true || result === _false ? 'boolean' : typeof result
    };  
  }  

  function checkTypes( name, expr, env, typeChecker ) {
    for( var i = 1; i < expr.length; i++ ) {
      var check = typeChecker( expr[ i ], env );
      if( check.expected !== check.actual ) {
        throw new InvalidTypeException( name, check.expected, check.actual );
      }
    }
  }  
    
  function variadic( name, expr, env, checker, func ) {
    checkArgs( name, expr, 2, checkArgsMode.atLeast );
    checkTypes( name, expr, env, checker );
    var result = evalScheem( expr[ 1 ], env );
    for( var i = 2; i < expr.length; i++ ) {
      result = func( result, evalScheem( expr[ i ], env ) );
    }
    return result;
  }

  function booleanVariadic( name, expr, env, checker, func, invert ) {
    invert = invert === undefined ? false : invert;
    checkArgs( name, expr, 2, checkArgsMode.atLeast );
    checkTypes( name, expr, env, checker );
    var result = evalScheem( expr[ 1 ], env );
    for( var i = 2; i < expr.length; i++ ) {
      var matches = func( result, evalScheem( expr[ i ], env ) );
      if( ( invert ? matches : !matches ) ) {
        return invert;
      }
    }
    return !invert;  
  }
      
  function addBuiltin( bindings, key, builtIn ) {
    bindings[ key ] = function( args, env ) {
      var expr = [ key ].concat( args );
    
      return builtIn.handler ? 
        builtIn.handler( key, expr, env, builtIn ) :
        builtIn.func( expr, env );
    };
  }
  
  function bindMember( bindings, obj, key ) {
    var v = key.toLowerCase();
    
    if( builtIns[ v ] !== undefined ) {
      throw new CannotOverrideBuiltInException( v );
    }    
    
    var member = obj[ key ];
    
    if( member === undefined ) return;

    var memberType = typeof member;    

    
    //only handle properties that are numbers or arrays or bools for now
    if( member instanceof Array || memberType === 'number' || memberType === 'boolean' ) {
      bindings[ v ] = member;
    } else if( memberType === 'function' ) {
      bindings[ v ] = function( args, env ) {        
        var values = args.map( function( e ) {
          return evalScheem( e, env );
        });
        
        return  obj[ key ].apply( obj, ( values.length === 1 && values[ 0 ] instanceof Array ) ? values[ 0 ] : values );
      }
    }  
  }
  
  function addJsObject( bindings, obj, members ) {
    if( members !== undefined && members instanceof Array ) {
      for( var i = 0; i < members.length; i++ ) {
        var key = members[ i ];
        bindMember( bindings, obj, key );
      }
      return;
    }    
    
    for( var key in obj ) {
      if( obj.hasOwnProperty( key ) ) {
        bindMember( bindings, obj, key );
      }
    }
  }
      
  function initBindings( env ) {
    if( env === undefined ) {
      env = {};
    }
    
    if( env.bindings === undefined ) {
      env.bindings = {};
    }

    for( var key in builtIns ) {
      if( builtIns.hasOwnProperty( key ) ) {
        if( env.bindings[ key ] === undefined ) {
          addBuiltin( env.bindings, key, builtIns[ key ] );
        }
      }
    }
    
    addJsObject( env.bindings, Math, [
      'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2', 'abs', 'acos', 'asin', 'atan',
      'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 
      'sqrt', 'tan'
    ]);
  }

  function update(env, v, val) {
    if( env === undefined ) {
      throw new UndefinedVariableExpection( v );
    }   
    
    if( builtIns[ v ] !== undefined ) {
      throw new CannotOverrideBuiltInException( v );
    }
    
    if( env.bindings[ v ] !== undefined ) {
      env.bindings[ v ] = val;
      return;
    }
    update( env.outer, v, val );
  }

  function addBinding(env, v, val) {            
    if( builtIns[ v ] !== undefined ) {
      throw new CannotOverrideBuiltInException( v );
    }
    
    if( env.bindings[ v ] !== undefined ) {
      throw new VariableAlreadyDefinedExpection( v );
    }      
    env.bindings[ v ] = val;
  }

  lookup = function( env, v ) {
    if( env === undefined ) {
      return undefined;
    }
    if( env.bindings[ v ] !== undefined ) {
      return env.bindings[ v ];
    }
    
    return lookup( env.outer, v );
  };
  
  evalScheem = function( expr, env ) {
    initBindings( env );
    
    if( typeof expr === 'number' || expr === _true || expr === _false ) {
      return expr;
    }
    
    if( typeof expr === 'string' ) {
      return lookup( env, expr );
    }

    var func = evalScheem( expr[ 0 ], env );
    return func( expr.slice( 1 ), env );
  };

  /*global SCHEEM:false */
  evalScheemString = function( expr, env ) {
    return evalScheem( SCHEEM.parse( expr ), env);
  };
}());