var peg = require( 'pegjs' ),
    assert = require( 'assert' ),
    fs = require( 'fs' );
    
fs.readFile( 'scheem.peg', 'utf-8', function( err, data ) {
  if( err ) {
    throw err;
  }
  
  console.log( data );
  var parse = peg.buildParser( data ).parse;
  
  //basic case
  assert.deepEqual( parse( '(a b c)' ), [ 'a', 'b', 'c' ] );
  
  //1st example from homework
  assert.deepEqual( parse( '(+ 1 (* x 3))' ), [ '+', '1', [ '*', 'x', '3' ] ] );
  
  //2nd example from homework
  assert.deepEqual( parse( '(* n (factorial (- n 1)))' ), [ '*', 'n', [ 'factorial', [ '-', 'n', '1' ] ] ] );
  
  //any number of spaces between atoms
  assert.deepEqual( parse( '(a  b  c)' ), [ 'a', 'b', 'c' ] );
  
  //allow spaces around parentheses
  assert.deepEqual( parse( ' ( a b c ) ' ), [ 'a', 'b', 'c' ] );
  
  //allow newlines as whitespace
  assert.deepEqual( parse( '(a\nb\r\nc\r)' ), [ 'a', 'b', 'c' ] );
  
  //allow tabs as whitespace
  assert.deepEqual( parse( '(a\tb\tc)' ), [ 'a', 'b', 'c' ] );
  
  //quote syntax
  assert.deepEqual( parse( "'(+ 1 (* x '3))" ), [ 'quote', [ '+', '1', [ '*', 'x', [ 'quote', '3' ] ] ] ] );  
  
  //comments
  assert.deepEqual( parse( ';;lorem ipsum\n(+ a;;lorem ipsum\n(a;;(+ a b)\r\nb));;lorem ipsum' ), [ '+', 'a', [ 'a', 'b' ] ] );
});