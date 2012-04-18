var compile;
(function(){
  'use strict';
  var note = [];
  
  //let's assume that the data is always good
  var convertPitch = function( pitch ) {
    var notes = [ 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b' ],
        note = pitch.length == 2 ? pitch.charAt( 0 ) : pitch.substr( 0, 2 ),
        octave = pitch.length == 2 ? pitch.charAt( 1 ) : pitch.charAt( 2 );
    
    return 12 + 12 * octave + ( notes.indexOf( note ) );
  };
  
  function UnrecognizedTagException( tag ) {
    this.name = 'UnrecognizedTagException';
    this.message = 'No handler found for tag "' + tag + '"'; 
  }
  
  var getBaseNoteItem = function( time, expr ) {
    return {
      tag: expr.tag,
      dur: expr.dur,
      start: time
    };
  }  
  
  var tagCompilers = {
    'rest': function( time, expr ) {
              note.push( getBaseNoteItem( time, expr ) );
              return time + expr.dur;
            },
    'note': function( time, expr ) {
              var result = getBaseNoteItem( time, expr );
              result.pitch = convertPitch( expr.pitch );
              note.push( result );
              return time + expr.dur;
            },
    'par':  function( time, expr ) {
              var leftTime = compileTag( time, expr.left ),
                  rightTime = compileTag( time, expr.right );
                  
              return Math.max( leftTime, rightTime );
            },
    'seq':  function( time, expr ) {
              var leftTime = compileTag( time, expr.left );
              return compileTag( leftTime, expr.right );
            },
    'repeat': function( time, expr ) {
                var repeatedTime = time;
                for( var i = 0; i < expr.count; i++ ) {
                  repeatedTime = compileTag( repeatedTime, expr.section );
                }
                return repeatedTime;
              }    
  };
  
  var compileTag = function( time, expr ) {
    var compiler = tagCompilers[ expr.tag ];
    if( compiler !== undefined ) {
      return compiler( time, expr );
    }
    throw new UnrecognizedTagException( expr.tag );
  };

  compile = function( musexpr ) {
    compileTag( 0, musexpr );
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