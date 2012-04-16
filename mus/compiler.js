(function(){
  'use strict';
  var note = [];
  
  //not used
  var endTime = function( time, expr ) {
    if( expr.tag === 'note' ) {
      return time + expr.dur;
    } else if( expr.tag === 'seq' ) {
      return endTime( time, expr.left ) + endTime( time, expr.right );
    } else if( expr.tag === 'par' ) {
      var leftTime = endTime( time, expr.left ),
          rightTime = endTime( time, expr.right );

      return Math.max( leftTime, rightTime );
    }
  };
  
  var compileT = function( time, expr ) {    
    if( expr.tag === 'note' ) {
      expr.start = time;
      note.push( expr );
      time = time + expr.dur;
    } else if( expr.tag === 'par' ) {
      var leftTime = compileT( time, expr.left ),
          rightTime = compileT( time, expr.right );
          
      time = Math.max( leftTime, rightTime );
    } else if( expr.tag === 'seq' ) {
      time = compileT( time, expr.left );
      time = compileT( time, expr.right );
    }
    return time;
  };

  var compile = function( musexpr ) {
    compileT( 0, musexpr );
    return note;
  };
  
  
  var melody_mus = { 
    tag: 'seq',
    left: { 
      tag: 'seq',
      left: { tag: 'note', pitch: 'a4', dur: 250 },
      right: { tag: 'note', pitch: 'b4', dur: 250 } 
    },
    right: { 
      tag: 'seq',
      left: { tag: 'note', pitch: 'c4', dur: 500 },
      right: { tag: 'note', pitch: 'd4', dur: 500 } 
    } 
  };
  
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
      left: { tag: 'note', pitch: 'c4', dur: 500 },
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
  */

  console.log( melody_mus );
  console.log( compile( melody_mus ) );  
}());