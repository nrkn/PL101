var compile;
(function(){
  'use strict';

  var note = [],
      //none of the samples so far have sharps so just assuming x# notation
      pitchRegex = /([a-g]\#?)([0-9])/,
      notes = [ 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b' ],
      pitches = {},
      location = [],

      locationToString = function() {
        return '[' + location.join( '.' ) + ']';
      },

      //convert notation to midi number
      convertPitch = function( pitch ) {
        //check if we've memoized and if so return
        if( pitches[ pitch ] !== undefined ) {
          return pitches[ pitch ];
        }

        var regexInfo = pitchRegex.exec( pitch ),
            note = regexInfo[ 1 ],
            octave = regexInfo[ 2 ];

        //memoize result before returning
        return pitches[ pitch ] = 12 + 12 * octave + ( notes.indexOf( note ) );
      },

      //all tags that are leaf nodes have this format
      getBaseNoteItem = function( time, expr ) {
        return {
          tag: expr.tag,
          dur: expr.dur,
          start: time
        };
      },

      //expr is the expr to check and properties is an object whose properties map to the property
      //names in expr to check, and whose values contain the function with which to check them
      checkProperties = function( expr, properties ) {
        location.push( expr.tag );

        for( var key in properties ) {
          if( properties.hasOwnProperty( key ) ) {
            var property = expr[ key ];

            location.push( key );

            if( property === undefined ) {
              throw new PropertyNotFoundException( expr.tag, key );
            }

            //call error checking function for property 'key' with value from expr
            properties[ key ]( expr[ key ] );

            location.pop();
          }
        }

        location.pop();
      },

      //negative durations and counts don't make sense
      checkNumber = function( num ) {
        return !isNaN( Number( num ) ) && num >= 0;
      },

      checkDur = function( dur ) {
        if( !checkNumber( dur ) ) {
          throw new InvalidDurationException( dur );
        }
      },

      checkPitch = function( pitch ) {
        if( !pitch.match( pitchRegex ) ) {
          throw new InvalidPitchException( pitch );
        }
      },

      checkCount = function( count ) {
        if( !checkNumber( count ) ) {
          throw new InvalidCountException( count );
        }
      },

      //no need to check expr at this stage, so just stub it out
      checkExpr = function(){},

      //functions to handle each tag
      tagCompilers = {
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

            location.push( 'par.left' );
            var leftTime = compileTag( time, expr.left );
            location.pop();
            location.push( 'par.right' );
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

            location.push( 'seq.left' );
            var leftTime = compileTag( time, expr.left );
            location.pop();
            location.push( 'seq.right' );
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
      },

      compileTag = function( time, expr ) {
        var compiler = tagCompilers[ expr.tag ];

        if( compiler !== undefined ) {
          return compiler.compile( time, expr );
        }

        throw new UnrecognizedTagException( expr.tag );
      };

  //various exceptions
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

  //this is exported
  compile = function( expr ) {
    note = [];
    location = [];

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