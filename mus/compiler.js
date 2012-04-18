var compile;
(function(){
  'use strict';
  var note = [],
      pitchRegex = /([a-g]\#?)([0-9])/,
      location = [ 'root' ];
  
  var locationToString = function() {
    return '[' + location.join( '.' ) + ']';
  };  
  
  function InvalidPitchException( pitch ) {
    this.name = 'InvalidPitchExpection';
    this.message = '"' + pitch + '" is not a valid pitch at ' + locationToString();
  }
  
  function InvalidDurationException( dur ) {
    this.name = 'InvalidDurationException';
    this.message = '"' + dur + '" is not a valid duration at ' + locationToString();
  }  
  
  function InvalidCountException( count ) {
    this.name = 'InvalidCountException';
    this.message = '"' + count + '" is not a valid count at ' + locationToString();
  }
  
  function UnrecognizedTagException( tag ) {
    this.name = 'UnrecognizedTagException';
    this.message = 'No handler found for tag "' + tag + '" at ' + locationToString();
  }
  
  function PropertyNotFoundException( tag, property ) {
    this.name = 'PropertyNotFoundException';
    this.message = '"' + tag + '" is expected to have a property named "' + property + '" at ' + locationToString();
  }
  
  var convertPitch = function( pitch ) {
    var notes = [ 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b' ],
        regexInfo = pitchRegex.exec( pitch ),
        note = regexInfo[ 1 ],
        octave = regexInfo[ 2 ];
    
    return 12 + 12 * octave + ( notes.indexOf( note ) );
  };  
  
  var getBaseNoteItem = function( time, expr ) {
    return {
      tag: expr.tag,
      dur: expr.dur,
      start: time
    };
  }; 
  
  var checkProperties = function( expr, properties ) {
    for( var key in properties ) {
      if( properties.hasOwnProperty( key ) ) {
        var property = expr[ key ];
        if( property === undefined ) {
          throw new PropertyNotFoundException( expr.tag, key );
        }
        properties[ key ]( expr[ key ] );
      }
    }
  };
  
  var checkNumber = function( num ) {
    return !isNaN( Number( num ) ) && num >= 0;
  };
  
  var checkDur = function( dur ) {
    if( !checkNumber( dur ) ) {
      throw new InvalidDurationException( dur );
    }
  };
  
  var checkPitch = function( pitch ) {
    if( !pitch.match( pitchRegex ) ) {
      throw new InvalidPitchException( pitch );
    }
  };
  
  var checkCount = function( count ) {
    if( !checkNumber( count ) ) {
      throw new InvalidCountException( count );
    }
  };
  
  //no actual check - just let the compiler catch exceptions recursively
  //ok you should make it push/pop here instead while checking properties
  var checkExpr = function(){};
  
  var tagCompilers = {
    'rest': {
      compile: function( time, expr ) {
        checkProperties( expr, {
          'dur' : checkDur
        });
        
        note.push( getBaseNoteItem( time, expr ) );
        
        return time + expr.dur;
      }
    },
    'note': {
      compile: function( time, expr ) {
        checkProperties( expr, { 
          'dur' : checkDur,
          'pitch': checkPitch
        });
        
        var result = getBaseNoteItem( time, expr );
        result.pitch = convertPitch( expr.pitch );
        
        note.push( result );
        
        return time + expr.dur;
      }
    },
    'par': {
      compile: function( time, expr ) {
        checkProperties( expr, { 
          'left': checkExpr, 
          'right': checkExpr
        });

        location.push( 'par(left)' );
        var leftTime = compileTag( time, expr.left );        
        location.pop();
        location.push( 'par(right)' );
        var rightTime = compileTag( time, expr.right );
        location.pop();
            
        return Math.max( leftTime, rightTime );
      }
    },
    'seq': {
      compile: function( time, expr ) {
        checkProperties( expr, { 
          'left': checkExpr, 
          'right': checkExpr
        });
        
        location.push( 'seq(left)' );
        var leftTime = compileTag( time, expr.left );
        location.pop();
        location.push( 'seq(right)' );
        var rightTime = compileTag( leftTime, expr.right );
        location.pop();
        
        return rightTime;
      }
    },
    'repeat': {
      compile: function( time, expr ) {
        checkProperties( expr, { 
          'section': checkExpr, 
          'count': checkCount
        });
        
        var repeatedTime = time;
        
        for( var i = 0; i < expr.count; i++ ) {
          repeatedTime = compileTag( repeatedTime, expr.section );
        }
        
        return repeatedTime;
      }    
    }
  };
  
  var compileTag = function( time, expr ) {
    var compiler = tagCompilers[ expr.tag ];
    
    if( compiler !== undefined ) {
      return compiler.compile( time, expr );
    }
    
    throw new UnrecognizedTagException( expr.tag );
  };

  compile = function( expr ) {
    compileTag( 0, expr );
    
    return note;
  };
}());

var melody_mus = { 
  tag: 'seq',
  left: { 
    tag: 'seq',
    left: { tag: 'note', pitch: 'a4', dur: 250 },
    right: {
      tag: 'seq',
      left: { tag: 'rest', dur: 250 },
      right: { tag: 'note', pitch: 'b4', dur: 250 }
    }      
  },
  right: { 
    tag: 'seq',
    left: { 
      tag: 'repeat',  
      section: { tag: 'note', pitch: 'c4', dur: 250 },
      count: 3
    },
    right: { 
      tag: 'par',
      left: {
        tag: 'note', 
        pitch: 'd4', 
        dur: 500 
      },
      right: {
        tag: 'note', 
        pitch: 'c4', 
        dur: 500 
      }        
    } 
  } 
};

console.log( melody_mus );
console.log( compile( melody_mus ) );  