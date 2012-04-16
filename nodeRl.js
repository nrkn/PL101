(function(){
  'use strict';
  
  var sys = require( 'util' ),
      stdin = process.openStdin(),
      tty = require( 'tty' ),
      map = [
        '####  ####',
        '#  ####  #',
        '#        #',
        '##      ##',
        ' #      # ',
        ' #      # ',
        '##      ##',
        '#        #',
        '#  ####  #',
        '####  ####'
      ],
      x = 2,
      y = 2;
      
  function setTile( tile ) {
    map[ y ] = map[ y ].substr( 0, x ) + tile + map[ y ].substr( x + 1 );
    drawTile( tile, x, y );
  }

  function movePlayer(newX, newY) {
    if( map[ newY ][ newX ] !== ' ' ){
      return;
    }
    x = newX;
    y = newY;
  }

  function tick( key ) {
    setTile( ' ' );
    
    if( key !== undefined ) {
      switch(key.name ) {
      case 'left':
        movePlayer( x - 1, y );
        break;
      case 'up':
        movePlayer( x, y - 1 );
        break;
      case 'right':
        movePlayer( x + 1, y );
        break;
      case 'down':
        movePlayer( x, y + 1 );
        break;
      }
    }
    
    setTile( '@' );  
  }

  function drawTile( tile, x, y ) {
    process.stdout.write( '\u001B[' + ( y + 1 ) + ';' + ( x + 1 ) + 'f' );
    process.stdout.write( tile );
  }    
  
  tty.setRawMode(true);    

  stdin.on( 'keypress', function( chunk, key ) {  
    if( key && key.ctrl && key.name === 'c' ) {
      process.exit();
    }
    tick( key );
  });
  
  process.stdout.write( '\u001B[0;0f' );
  
  for( var j = 0; j < map.length; j++ ) {
    for( var i = 0; i < map[ j ].length; i++ ) {
      drawTile( map[ j ][ i ], i, j );
    }
    process.stdout.write( '\n' );
  }
  
  tick();  
}());