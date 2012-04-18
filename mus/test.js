var testMus = {
      tag: 'seq',
      left: {
        tag: 'seq',
        left: { tag: 'note', pitch: 'a4', dur: 250 },
        right: {
          tag: 'seq',
          left: { tag: 'rest', dur: 250 },
          right: { tag: 'note', pitch: 'b4', dur: 250 }
        }
      },
      right: {
        tag: 'seq',
        left: {
          tag: 'repeat',
          section: { tag: 'note', pitch: 'c4', dur: 250 },
          count: 3
        },
        right: {
          tag: 'par',
          left: {
            tag: 'note',
            pitch: 'd4',
            dur: 500
          },
          right: {
            tag: 'note',
            pitch: 'c4',
            dur: 500
          }
        }
      }
    },
    noteCompiler = require( './noteCompiler' );

console.log( testMus );
console.log( noteCompiler.compile( testMus ) );