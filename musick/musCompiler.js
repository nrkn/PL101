(function(){
  'use strict';
  var peg = require( 'pegjs' ),
      fs = require( 'fs' ),
      data = fs.readFileSync( 'musick.peg', 'utf-8' ),
      parse = peg.buildParser( data ).parse;

  exports.compile = function( expr ) {
    return parse( expr );
  };
  
  exports.save = function( expr, file ) {
    fs.writeFileSync( file, JSON.stringify( parse( expr ), null, 2 ) );
  };
}());