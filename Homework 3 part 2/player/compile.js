function compile( source, inFormat ) {
  var outFormat = '.song',
      types = [ '.musick', '.mus', '.note', '.song' ];

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

     
  source = inFormat === '.musick' ? source : JSON.parse( source );

  for( var i = startIndex; i < endIndex; i++ ) {  
    source = compilers[ types[ i + 1 ] ].compile( source );  
  }

  return source;
}  