var assert = require( 'assert' ),
    musCompiler = require( './musCompiler' );
    
//basic case
assert.deepEqual( musCompiler.compile( 'a' ), { "tag": "seq", "left": { "tag": "note", "dur": 437.5, "pitch": "a4" }, "right": { "tag": "rest", "dur": 62.5 } }  );