var path = require( 'path' ),
    fs = require( 'fs' ),
    musCompiler = require( './musCompiler' ),
    noteCompiler = require ( '../mus/noteCompiler' ),
    songCompiler = require ( './songCompiler/songCompiler' );

if( process.argv.length < 4 ) {
  throw {
    name: 'InvalidArgsException',
    message: 'Not enough args - usage: compile inPath outPath [debug]'
  };
}

var inPath = process.argv[ 2 ],
    outPath = process.argv[ 3 ];
    debug = process.argv.length > 4 && process.argv[ 4 ] === 'debug';
    
if( !path.existsSync( inPath ) ) {
  throw {
    name: 'FileNotFoundException',
    message: 'File ' + inPath + ' not found'
  };
}

var inFormat = path.extname( inPath ),
    outFormat = path.extname( outPath );
   
if( [ '.musick', '.mus', '.note' ].indexOf( inFormat ) === -1 ) {
  throw {
    name: 'InvalidSourceTypeException',
    message: inFormat + ' is not a valid source type. Expecting ' + '.musick, .mus, or .note'
  };
}

if( [ '.mus', '.note', '.song' ].indexOf( outFormat ) === -1 ) {
  throw {
    name: 'InvalidDestinationTypeException',
    message: outFormat + ' is not a valid destination type. Expecting ' + '.mus, .note, or .song'
  };
}

var types = [ '.musick', '.mus', '.note', '.song' ];

if( types.indexOf( inFormat ) >= types.indexOf( outFormat ) ) {
  throw {
    name: 'CompilerNotFoundException',
    message: 'No compiler found that compiles from ' + inFormat + ' to ' + outFormat
  };
}

var compilers = {
      '.mus'  : musCompiler,
      '.note' : noteCompiler,
      '.song' : songCompiler
    },
    startIndex = types.indexOf( inFormat ),
    endIndex = types.indexOf( outFormat );

   
var source = fs.readFileSync( inPath, 'utf-8' );
    
source = inFormat === '.musick' ? source : JSON.parse( source );

for( var i = startIndex; i < endIndex; i++ ) {  
  source = compilers[ types[ i + 1 ] ].compile( source, debug );  
}

fs.writeFileSync( outPath, JSON.stringify( source, null, 2 ) );