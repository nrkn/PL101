(function(){
  'use strict';
  var note = [];
  
  //not used
  var endTime = function( time, expr ) {
    if( expr.tag === 'note' || expr.tag === 'rest' ) {
      return time + expr.dur;
    } else if( expr.tag === 'seq' ) {
      return endTime( time, expr.left ) + endTime( time, expr.right );
    } else if( expr.tag === 'par' ) {
      var leftTime = endTime( time, expr.left ),
          rightTime = endTime( time, expr.right );

      return Math.max( leftTime, rightTime );
    } else if( expr.tag === 'repeat' ) {      
      for( var i = 0; i < expr.count; i++ ) {
        time = endTime( time, expr.section );
      }
      return time;
    }
  };
  
  //let's assume that the data is always good
  var convertPitch = function( pitch ) {
    var notes = [ 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b' ],
        note = pitch.length == 2 ? pitch.charAt( 0 ) : pitch.substr( 0, 2 ),
        octave = pitch.length == 2 ? pitch.charAt( 1 ) : pitch.charAt( 2 );
    
    return 12 + 12 * octave + ( notes.indexOf( note ) );
  };
  
  var compileT = function( time, expr ) {    
    if( expr.tag === 'note' || expr.tag === 'rest' ) {
      var noteItem = {
        tag: expr.tag,
        dur: expr.dur,
        start: time
      };
      if( expr.tag === 'note' ) {
        noteItem.pitch = convertPitch( expr.pitch );
      }
      note.push( noteItem );
      time = time + expr.dur;
    } else if( expr.tag === 'par' ) {
      var leftTime = compileT( time, expr.left ),
          rightTime = compileT( time, expr.right );
          
      time = Math.max( leftTime, rightTime );
    } else if( expr.tag === 'seq' ) {
      time = compileT( time, expr.left );
      time = compileT( time, expr.right );
    } else if( expr.tag === 'repeat' ) {
      for( var i = 0; i < expr.count; i++ ) {
        time = compileT( time, expr.section );
      }
    }
    return time;
  };

  var compile = function( musexpr ) {
    compileT( 0, musexpr );
    return note;
  };
  
  /*
  var melody_mus = { 
    tag: 'par',
    left: { 
      tag: 'note',
      pitch: 'c4',
      dur: 250
    },
    right: { 
      tag: 'par',
      left: { tag: 'note', pitch: 'e4', dur: 250 },
      right: { tag: 'note', pitch: 'g4', dur: 250 } 
    } 
  };
  */
  
  /*
  var melody_mus = { 
    tag: 'seq',
    left: { 
      tag: 'seq',
      left: { tag: 'note', pitch: 'a4', dur: 250 },
      right: { tag: 'note', pitch: 'b4', dur: 250 } 
    },
    right: { 
      tag: 'seq',
      left: { tag: 'rest', dur: 500 },
      right: { tag: 'note', pitch: 'd4', dur: 500 } 
    } 
  };  
  */
  
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
}());