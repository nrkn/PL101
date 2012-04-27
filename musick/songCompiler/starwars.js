var assert = require( 'assert' ),
    songCompiler = require( './songCompiler' );
    fs = require( 'fs' ),
    data = fs.readFileSync( 'starwars.note', 'utf-8' ),
    note = JSON.parse( data );

var song = songCompiler.compile( note );
fs.writeFileSync( 'starwars.song', JSON.stringify( song, null, 2 ) );