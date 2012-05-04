var songCompiler = {};
(function(){
  'use strict';
  
  var debugMode = false;
  
  Array.prototype.unique = function(){
    return this.filter(function(s, i, a){
      return i === a.lastIndexOf( s );
    });
  }
  
  //because Number.toFixed rounds FFS
  function toFixed( num ) {
    return Math.floor( num * 100 ) / 100;
  }
  
  function log( name, message ) {
    if( debugMode ) {
      console.log( name + ': \n' + JSON.stringify( message, null, 2 ) );
    }
  }
  
  function start( notes ) {
    var noteStarts = [];
    for( var i = 0; i < notes.length; i++ ) {
      var note = notes[ i ];
      noteStarts.push( note.start );
    }
    return Math.min.apply( Math, noteStarts );
  }

  function end( notes ) {
    var noteEnds = [];
    for( var i = 0; i < notes.length; i++ ) {
      var note = notes[ i ];
      noteEnds.push( note.start + note.dur );
    }
    return Math.max.apply( Math, noteEnds );
  }  

  function intersectingNotes( notes ) {
    var results = [];
    for( var i = 0; i < notes.length; i++ ) {
      var outer = notes[ i ];
      for( var j = i + 1; j < notes.length; j++ ) {
        var inner = notes[ j ];
        
        if( outer.start !== inner.start ) {          
          if( outer.end <= inner.start ) {
            continue;
          }
          if( outer.start >= inner.end ) {
            continue;
          }
        }
        if( results[ i ] === undefined ) {
          results[ i ] = [ i, j ];
        } else {
          results[ i ].push( j );
        }
      }
    }

    return flattenIntersections( results.filter(function(e){ return e !== undefined }) );
  }

  function hasIntersection( a, b ) {
    for( var i = 0; i < a.length; i++ ) {
      if( b.indexOf( a[ i ] ) !== -1 ) {
        return true;
      }
    }

    for( var i = 0; i < b.length; i++ ) {
      if( a.indexOf( b[ i ] ) !== -1 ) {
        return true;
      }    
    }
    
    return false;
  }

  function findArrWithElement( e, arr ) {
    for( var i = 0; i < arr.length; i++ ) {
      if( arr[ i ].indexOf( e ) !== -1 ) {
        return arr[ i ];
      }
    }
    return false;
  }

  function flattenIntersections( intersections ) {
    for( var i = 0; i < intersections.length; i++ ) {
      var outer = intersections[ i ];
      for( var j = i + 1; j < intersections.length; j++ ) {
        var inner = intersections[ j ];
        if( hasIntersection( outer, inner ) ) {
          intersections[ j ] = inner.concat( outer ).unique().sort();
          intersections[ i ] = [];
        } 
      }
    }
    
    return intersections = intersections.filter(function(e){ return e.length > 0; });
  }

  function groupNotes( notes ) {
    var intersections = intersectingNotes( notes ),
        result = [];
    
    for( var i = 0; i < notes.length; i++ ) {
      var intersection = findArrWithElement( i, intersections );
      if( !intersection ) {
        result.push( [ i ] );
      } else {
        if( result.indexOf( intersection ) === -1 ) {
          result.push( intersection );
        }
      }
    }
    
    return result;
  }

  function normalizeNotes( notes ) {
    for( var i = 0; i < notes.length; i++ ) {
      notes[ i ].start = toFixed( notes[ i ].start );
      notes[ i ].dur = toFixed( notes[ i ].dur );
      notes[ i ].end = toFixed( notes[ i ].start + notes[ i ].dur );
    }
  }
  
  function groupData( notes ) {   
    var groups = groupNotes( notes ),
        data = [];
    for( var i = 0; i < groups.length; i++ ) {
      var group = groups[ i ];
      if( group.length === 1 ) {
        var note = notes[ group[ 0 ] ];
        data.push({
          tag: 'single',
          element: note,
          start: note.start,
          end: note.start + note.dur
        });
      } else {
        var elements = group.map(function(e){ return notes[ e ]; });
        data.push({
          tag: 'group',
          elements: elements,
          start: start( elements ),
          end: end( elements )
        });
      }
    }
    
    addRests( data );
    addTimes( data );
    
    log( "groupData", data );
    
    return data;
  }

  function addRests( data ) {
    var gaps = findGaps( data );
    for( var i = 0; i < gaps.length; i++ ) {
      var gap = gaps[ i ];
      data.push({
        tag: 'single',
        element: {
          tag: 'rest',
          start: gap.start,
          dur: gap.dur,
          end: gap.end
        },
        start: gap.start,
        end: gap.end   
      });
    }
    data.sort(function(a,b){
      return a.start - b.start;
    });
  }

  function findGaps( data ) {
    var gaps = [];
    
    if( data.length < 1 ) return gaps;
    
    if( data[ 0 ].start > 0 ) {
      gaps.push({
        position: 0,
        start: 0,
        end: data[ 0 ].start,
        dur: data[ 0 ].start
      });
    }
    
    if( data.length < 2 ) return gaps;
    
    for( var i = 1; i < data.length; i++ ) {
      var datum = data[ i ],
          previous = data[ i - 1 ];
      
      if( previous.end < datum.start ) {
        gaps.push({
          position: i,
          start: previous.end,
          end: datum.start,
          dur: datum.start - previous.end
        });      
      }
    }
    return gaps;
  }

  function elementGroupTimes( elementGroup ) {
    var times = [];
    for( var i = 0; i < elementGroup.length; i++ ){
      var element = elementGroup[ i ];
      times.push( element.start );
      times.push( element.end );
    }
    return times.unique().sort(function(a,b){ return a -b; });
  }

  function addTimes( data ) {
    for( var i = 0; i < data.length; i++ ) {
      var datum = data[ i ];
      if( datum.tag === 'single' ) {
        continue;
      }
      datum.times = elementGroupTimes( datum.elements );
    }
  }

  function splitElement( element, times ) {
    log( 'splitElement times', times );
    var result = [];
    //if there are only 2 times no need to split
    if( times.length < 3 ) {
      return[ element ];
    }
    
    for( var i = 1; i < times.length; i++ ) {
      var start = times[ i - 1 ],
          end = times[ i ];

      if( start < element.start || end > element.end ) {
        continue;
      }
      
      var newElement = {
        tag: element.tag,
        start: start,
        end: end,
        dur: end - start
      };
      
      if( element.tag === 'note' ) {
        newElement.pitch = element.pitch;
      }
      
      result.push( newElement );
    }
    
    log( 'splitElement result', result );
    
    return result;
  }

  function splitData( data ) {
    var result = [];
    for( var i = 0; i < data.length; i++ ) {
      var datum = data[ i ];
      if( datum.tag === 'single' ) {
        result.push( datum.element );
        continue;
      }
      
      for( var j = 0; j < datum.elements.length; j++ ) {
        var element = datum.elements[ j ],
            split = splitElement( element, datum.times );
        
        result = result.concat( split );
      }
    }
    
    var result = result.sort(function(a,b){return a.start - b.start;});
    
    log( 'splitData', result );
    
    return result;
  }

  function groupSplitData( split ) {
    var result = [],
        group = [],
        lastStart = -1,
        lastEnd = -1;
    for( var i = 0; i < split.length; i++ ) {
      var element = split[ i ];
      if( element.start !== lastStart || element.end !== lastEnd ) {
        if( group.length > 0 ) {
          result.push( group );
        }
        group = [];
      }
      group.push( element );
      lastStart = element.start;
      lastEnd = element.end;
    }
    result.push( group );
    return result;
  }

  function midiNoteToFrequency( note ) {
    if( note >= 0 && note <= 119 ) {
      return 440 * Math.pow( 2, ( note - 57 ) / 12 );
    }
    return -1;
  }

  function splitDataToSong( splitData ) {
    var result = [];
    for( var i = 0; i < splitData.length; i++ ) {
       var  datum = splitData[ i ],
            freq = datum.map(function(e){
              if( e.tag === 'rest' ) return 0;
              return midiNoteToFrequency( e.pitch );
            });
      
      result.push({
        freq: freq,
        dur: datum[ 0 ].dur
      });    
    }
    
    return result;
  }
  
  //fucking js floating point errors accumulatings :(
  function removeVeryShortNotes( song ) {
    var decentNotes = [];
    for( var i = 0; i < song.length; i++ ) {
      if( song[ i ].dur < 0 ) {
        throw {
          name: 'NegativeDurationException',
          message: 'There was a negative duration at index ' + i + ' of the song data'
        };
      }
      if( Math.floor( song[ i ].dur ) > 0 ) {
        decentNotes.push( song[ i ] );
      }
    }
    return decentNotes;
  }

  songCompiler.compile = function( expr, debug ) {
    debugMode = debug;
    
    normalizeNotes( expr );
    
    var data = groupData( expr ),
        split = splitData( data ),
        groupedSplit = groupSplitData( split ),
        song = splitDataToSong( groupedSplit );
        
    song = removeVeryShortNotes( song );
    
    log( 'compile', song );

    return song;
  };
}());