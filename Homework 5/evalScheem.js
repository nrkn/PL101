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
                            return variadic( name, expr, env, expectNumber, builtIn.func );                       
                          },
        booleanVariadic:  function( name, expr, env, builtIn ) {
                            return booleanVariadic( name, expr, env, builtIn.checker || expectNumber, builtIn.func, builtIn.invert ) ? 
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
          checker: expectBool
        },
        '||': {
          handler: handlers.booleanVariadic,
          func: function( a, b ) { return a === _true || b === _true; },
          checker: expectBool,
          invert: true
        },
        'cons': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env );
                  checkArgCount( 'cons', args.length, 2 );
                   
                  return [ args[ 0 ] ].concat( args[ 1 ] );          
                }
        },
        'car': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env );
                  checkArgCount( 'car', args.length, 1 );
                  checkExpectedTypes( 'car', args, expectArray ); 
              
                  return args[ 0 ][ 0 ];
                }
        },
        'cdr': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env );
                  checkArgCount( 'cdr', args.length, 1 );
                  checkExpectedTypes( 'cdr', args, expectArray ); 
                  
                  return args[ 0 ].slice( 1 );      
                }
        },
        'let': {
          func: function( expr, env ) {
                  checkArgCount( 'let', expr.length - 1, 2 );
                  
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
                  checkArgCount( 'define', expr.length - 1, 2 );

                  var value = evalScheem( expr[ 2 ], env );
                  addBinding( expr[ 1 ], value, env ); 
                  return value;
                }         
        },        
        'set!': {
          func: function( expr, env ) {
                  checkArgCount( 'set!', expr.length - 1, 2 );                   
                             
                  var value = evalScheem( expr[ 2 ], env );
                  update( expr[ 1 ], value, env ); 
                  return value;
                }         
        },        
        'begin': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env );
                  checkArgCount( 'begin!', args.length, 1, checkArgsMode.atLeast ); 
                  
                  return args[ args.length - 1 ];
                }         
        },          
        'quote': {
          func: function( expr, env ) {
                  checkArgCount( 'quote', expr.length - 1, 1 );
                  
                  return expr[ 1 ];  
                }
        },                
        'if': {
          func: function( expr, env ) {
                  checkArgCount( 'if', expr.length - 1, 3 );                              
                  var result = evalScheem( expr[ 1 ], env );
                  checkExpectedTypes( 'if', [ result ], expectBool );
                  
                  return result === _true ? evalScheem( expr[ 2 ], env ) : evalScheem( expr[ 3 ], env );
                } 
        },                
        'lambda': {
          func: function( expr, env ) {
                  checkArgCount( 'lambda', expr.length - 1, 2, checkArgsMode.atLeast ); 
                  
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
        'hash': {
          func: function( expr, env ) {
                  var hash = {};
                  
                  if( expr.length > 1 ) {
                    for( var i = 1; i < expr.length; i++ ) {
                      var keyValuePair = expr[ i ];
                      checkArgCount( 'hash keyValuePair', keyValuePair.length, 2 );        
                      var key = keyValuePair[ 0 ],
                          value = evalScheem( keyValuePair[ 1 ], env );
                      hash[ key ] = value;
                    }
                  }                  
                  
                  return hash;
                }
        },
        'lookup': {
          func: function( expr, env ) {
                  checkArgCount( 'lookup', expr.length - 1, 2 );       
                  
                  var item = evalScheem( expr[ 1 ], env );
                  
                  if( item instanceof Array ) {
                    var index = evalScheem( expr[ 2 ], env );
                    return evalScheem( item[ index ], env );
                  }
                  
                  return evalScheem( item[ expr[ 2 ] ], env );
                }
        },
        'update': {
          func: function( expr, env ) {
                  checkArgCount( 'update', expr.length - 1, 2 );       
                  var item = evalScheem( expr[ 1 ], env ),
                      keyValuePair = expr[ 2 ];
                  checkArgCount( 'keyValuePair', keyValuePair.length, 2 );        
                  var key = item instanceof Array ? 
                        evalScheem( keyValuePair[ 0 ], env ) :
                        keyValuePair[ 0 ],
                      value = evalScheem( keyValuePair[ 1 ], env );
                      
                  item[ key ] = value;
                  
                  return item;
                }      
        },
        'keys': {
          func: function( expr, env ) {
                  checkArgCount( 'hash keys', expr.length - 1, 1 );       
                  var hash = evalScheem( expr[ 1 ], env ),
                      keys = [];
                      
                  for( var key in hash ) {
                    if( hash.hasOwnProperty( key ) ) {
                      keys.push( key );
                    }
                  }
                  
                  return keys;
                }
        },        
        'values': {
          func: function( expr, env ) {
                  checkArgCount( 'hash keys', expr.length - 1, 1 );       
                  var hash = evalScheem( expr[ 1 ], env ),
                      values = [];
                      
                  for( var key in hash ) {
                    if( hash.hasOwnProperty( key ) ) {
                      values.push( hash[ key ] );
                    }
                  }
                  
                  return values;
                }
        },
        'alert': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env );
                  checkArgCount( 'alert', args.length, 1 );
                  
                  var s = args[ 0 ] instanceof Array ? 
                    arrayToString( args[ 0 ] ) : 
                    isChar( args[ 0 ] ) ?
                      arrayToString( [ args[ 0 ] ] ) :
                      args[ 0 ];
                  
                  if( window && window.alert ) {
                    window.alert( s );
                  } else if( console && console.log ) {
                    console.log( s );
                  }
                  
                  return args[ 0 ];
                }
        },
        'len': {
          func: function( expr, env ) {
                  checkArgCount( 'len', expr.length - 1, 1 );
                  var item = evalScheem( expr[ 1 ], env );
                  //array
                  if( item instanceof Array ) {
                    return item.length;
                  }
                  
                  //hash
                  var count = 0;
                  for( var key in item ) {
                    if( item.hasOwnProperty( key ) ) {
                      count++;
                    }
                  }
                  return count;
                }
        },
        'reverse': {
          func: function( expr, env ) {
                  var args = evalArgs( expr.slice( 1 ), env ); 
                  checkArgCount( 'reverse', args.length, 1 );
                  checkExpectedTypes( 'reverse', args, expectArray );   
                  
                  //clone array
                  var values = Array.apply( null, args[ 0 ] );

                  return values.reverse();
                }
        },
        'contains': {
          func: function( expr, env ) {        
                  checkArgCount( 'contains', expr.length - 1, 2 );
                  var item = evalScheem( expr[ 1 ], env );
                  //array contains key
                  if( item instanceof Array ) {
                    return item.indexOf( evalScheem( expr[ 2 ], env ) ) !== -1 ? _true : _false;
                  }
                  
                  //hash contains key
                  return item[ expr[ 2 ] ] !== undefined ? _true : _false;
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
  
  function evalArgs( args, env ) {
    return args.map(function( e ) {
      return evalScheem( e, env );
    });
  }
     
  function checkArgCount( name, length, expects, mode ) {
    mode = mode || checkArgsMode.exact;    
    
    switch( mode ) {
      case 'exact':
        if( length < expects ) {
          throw new NotEnoughArgumentsException( name, expects );
        }
        if( length > expects ) {
          throw new TooManyArgumentsException( name, expects );
        }
        break;
      case 'atLeast':
        if( length < expects ) {
          throw new NotEnoughArgumentsException( name, expects );
        }   
        break;
    }
  }
      
  function expectType( arg, expected ) {
    return {
      expected: expected,
      actual: typeof arg
    };
  }

  function expectNumber( arg ) {
    return expectType( arg, 'number' );
  }
  
  function expectArray( arg ) {
    return {
      expected: 'array',
      actual: arg instanceof Array ? 'array' : typeof arg
    };    
  }
  
  function expectBool( arg ) {
    return {
      expected: 'boolean',
      actual: arg === _true || arg === _false ? 'boolean' : typeof arg
    };  
  }  
  
  function checkExpectedTypes( name, args, typeCheckerFunc ) {
    for( var i = 0; i < args.length; i++ ) {
      var check = typeCheckerFunc( args[ i ] );
      if( check.expected !== check.actual ) {
        throw new InvalidTypeException( name, check.expected, check.actual );
      }
    }
  }  
  
  function variadic( name, expr, env, checkerFunc, func ) {
    var args = evalArgs( expr.slice( 1 ), env );
    checkArgCount( name, args.length, 2, checkArgsMode.atLeast );    
    checkExpectedTypes( name, args, checkerFunc ); 
    
    var result = args[ 0 ];
    for( var i = 1; i < args.length; i++ ) {
      result = func( result, args[ i ] );
    }
    return result;
  }

  function booleanVariadic( name, expr, env, checkerFunc, func, invert ) {
    var args = evalArgs( expr.slice( 1 ), env );
    checkArgCount( name, args.length, 2, checkArgsMode.atLeast );
    checkExpectedTypes( name, args, checkerFunc ); 
    
    var result = args[ 0 ];
    for( var i = 1; i < args.length; i++ ) {
      var matches = func( result, args[ i ] );
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
  
  function bindProperty( bindings, obj, mapping ) {
    if( builtIns[ mapping.value ] !== undefined ) {
      throw new CannotOverrideBuiltInException( mapping.value );
    }    
    
    var prop = obj[ mapping.key ];
    
    if( prop === undefined ) return;

    var propertyType = typeof prop;    

    
    //only handle properties that are numbers or arrays or bools for now
    if( prop instanceof Array || propertyType === 'number' || propertyType === 'boolean' ) {
      bindings[ mapping.value ] = prop;
    } else if( propertyType === 'function' ) {
      bindings[ mapping.value ] = function( args, env ) {        
        var values = args.map( function( e ) {
          return evalScheem( e, env );
        });
        
        return obj[ mapping.key ].apply( obj, ( values.length === 1 && values[ 0 ] instanceof Array ) ? values[ 0 ] : values );
      }
    }  
  }
  
  function addJsObject( bindings, obj, options ) {
    if( options && options.mappings && options.mappings instanceof Array ) {
      var mappings = options.mappings.map( function( e ) {
        if( e.key !== undefined && e.value !== undefined ) {
          return e;
        } else {
          return {
            key: e,
            value: e.toLowerCase()
          }
        }        
      });
    
      for( var i = 0; i < mappings.length; i++ ) {
        bindProperty( bindings, obj, mappings[ i ] );
      }
      return;
    }    
    
    for( var key in obj ) {
      if( obj.hasOwnProperty( key ) ) {
        bindProperty( bindings, obj, key );
      }
    }
  }
      
  function initBindings( env ) {
    env = env || {};
    if( env.bindings === undefined && env.outer === undefined ) {
      env.bindings = {};

      for( var key in builtIns ) {
        if( builtIns.hasOwnProperty( key ) ) {
          if( env.bindings[ key ] === undefined ) {
            addBuiltin( env.bindings, key, builtIns[ key ] );
          }
        }
      }
      
      addJsObject( env.bindings, Math, { mappings: [
        'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 
        'pow', 'random', 'round', 'sin', 'sqrt', 'tan', { key: 'E', value: 'euler' }, 'LN2', 'LN10', 
        'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2'
      ]});
    }
  }

  function update( v, val, env ) {
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
    
    update( v, val, env.outer );
  }

  function addBinding( v, val, env ) {            
    if( builtIns[ v ] !== undefined ) {
      throw new CannotOverrideBuiltInException( v );
    }
    
    if( env.bindings[ v ] !== undefined ) {
      throw new VariableAlreadyDefinedExpection( v );
    } 
    
    env.bindings[ v ] = val;
  }
  
  function arrayToString( chars ) {
    var str = '',
        special = {
          'space' : ' ',
          'tab' : '\t',
          'linefeed' : '\n',
          'return' : '\r'
        };
        
    for( var i = 0; i < chars.length; i++ ) {
      var c = chars[ i ];
      if( isChar( c ) ) {
        var s = c.substr( 2 );
        if( s.length === 1 ) {
          str += s;
          continue;
        }
        
        if( special[ s ] !== undefined ) {
          str += special[ s ];
          continue;
        }
        
        str += String.fromCharCode( parseInt( s, 16 ) );
        continue;
      }

      str += c.toString();
    }
    
    return str;
  }
  
  function stringToChars( str ) {
    var chars = [],
        charLits = /[0-9a-zA-Z!$%&*+\-.\/:<=>?@^_~|]/,
        special = {
          ' '  : '#\\space',
          '\t' : '#\\tab',
          '\n' : '#\\linefeed',
          '\r' : '#\\return'
        };
        
    for( var i = 1; i < str.length - 1; i++ ) {
      var c = str.charAt( i );
      if( c.match( charLits ) ) {
        chars.push( "#\\" + c );
        continue;
      }
      
      if( special[ c ] !== undefined ) {
        chars.push( special[ c ] );
        continue;
      }
      
      chars.push( '#\\' + c.charCodeAt( 0 ).toString( 16 ) );      
    }
    
    return chars;
  }
  
  function isChar( expr ) {
    return expr.indexOf( '#\\' ) === 0;
  }
  
  function isString( expr ) {
    return expr.charAt( 0 ) === '"';
  }

  lookup = function( v, env ) {
    if( env === undefined ) {
      return undefined;
    }
    
    if( env.bindings[ v ] !== undefined ) {
      return env.bindings[ v ];
    }
    
    return lookup( v, env.outer );
  };
  
  evalScheem = function( expr, env ) {
    initBindings( env );
    
    if( typeof expr === 'number' || expr === _true || expr === _false ) {
      return expr;
    }
    
    if( typeof expr === 'string' ) {      
      if( isChar( expr ) ) {
        return expr;
      }
      if( isString( expr ) ) {
        return stringToChars( expr );
      }
      
      return lookup( expr, env );
    }

    var func = evalScheem( expr[ 0 ], env );
    return func( expr.slice( 1 ), env );    
  };

  /*global SCHEEM:false */
  evalScheemString = function( expr, env ) {
    return evalScheem( SCHEEM.parse( expr ), env);
  };
}());