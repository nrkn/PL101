var assert = require( 'assert' ),
    musCompiler = require( './musCompiler' );
    fs = require( 'fs' ),
    data = fs.readFileSync( './data/starwars.musick', 'utf-8' );

musCompiler.save( data, './data/starwars.mus' );