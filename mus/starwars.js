var noteCompiler = require( './noteCompiler.js' ),
    fs = require( 'fs' ),
    data = fs.readFileSync( './data/starwars.mus', 'utf-8' );
    
var note = noteCompiler.compile( JSON.parse( data ) );    

fs.writeFileSync( './data/starwars.note', JSON.stringify( note, null, 2 ) );