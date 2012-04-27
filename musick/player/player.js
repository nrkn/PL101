function noteToSong( note ) {
  var song = [];
  
  //find gaps in note (if any) and fill with rests
  
  for( var i = 0; i < note.length; i++ ) {
    song.push({
      freq: [ note[ i ].tag === 'rest' ? 0 : midiNoteToFrequency( note[ i ].pitch ) ],
      dur: note[ i ].dur
    });
  }
  return song;
}

function midiNoteToFrequency( note ) {
  if( note >= 0 && note <= 119 ) {
    return 440 * Math.pow( 2, ( note - 57 ) / 12 );
  }
  return -1;
}

var simpleSong = [
	{
		freq: [329.63, 440, 554.37], // E4, A4, C#5 
		dur: 500
	},
	{
		freq: [329.63], // E4
		dur: 250
	},
	{
		freq: [329.63, 440 ], // E4
		dur: 250
	},
	{
		freq: [329.63, 554.37 ], // E4
		dur: 250
	},
	{
		freq: [329.63], // E4
		dur: 250
	},
	{
		freq: [329.63, 440, 554.37], // E4, A4, C#5 
		dur: 500
	},
	{
		freq: [440], // A4
		dur: 500
	}
];

//var	theme = noteToSong( starWars ),
var	theme = starWars,
	noteCount = 0,
	noteTotal = theme.length,
	leadNoteLength = 0,
	leadCount = 0,
	fade = 0,
	fadePoint = 0,
	dev, sampleRate, lead, comp,
  fadeAmount = 300,
  playing = true;
	
function loadNote(){
	if( !playing ) {
    return;
  }
  
  var note = theme[noteCount],
		l = note.freq.length,
		i;
	
	// Reset oscillator
	for (i=0; i<leads.length; i++){
		leads[i].frequency = 0;
		leads[i].reset();
	}
	
	// Set oscillator frequencies
	for (i=0; i < l; i++){
		leads[i].frequency = note.freq[i];
	}
	
	leadCount = l;
	
	// Calculate note length in samples
	leadNoteLength = Math.floor((note.dur / 1000 ) * sampleRate );
  
	// reset fade
	fade = 0;
	// define fade point
	fadePoint = leadNoteLength - fadeAmount;
	
	noteCount += 1;
	
	// Restart song when end is reached
	if (noteCount >= theme.length) {
    playing = false;
  }
};

function audioCallback(buffer, channelCount){
	if( !playing ) {
    return;
  }
  var l = buffer.length,
		l2 = leads.length,
		sample, note, i, n, current;
	
	// loop through each sample in the buffer			
	for (current=0; current<l; current+= channelCount){
		
		if (leadNoteLength == 0) loadNote();
		
		// fade in
		if (leadNoteLength > fadePoint){
			fade = 1 - (leadNoteLength-fadePoint)/fadeAmount;
		// fade out
		} else if (leadNoteLength<fadeAmount){
			fade = leadNoteLength/fadeAmount;
		} else {
			fade = 1;
		}
		
		sample = 0;
		for (i=0; i<leadCount; i++){
			// Generate oscillator
			leads[i].generate();
			// Get oscillator mix and multiply by .5 to reduce amplitude
			sample += leads[i].getMix()*0.5*fade;
		}

		// Fill buffer for each channel
		for (n=0; n<channelCount; n++){
			buffer[current + n] = comp.pushSample(sample);
		}
		
		leadNoteLength -= 1;
	}	
};

function play() {
  playing = true;

  // Create an instance of the AudioDevice class
	dev = audioLib.AudioDevice(audioCallback /* callback for the buffer fills */, 2 /* channelCount */);

	sampleRate = dev.sampleRate;
	
	// Create an array of Oscillator instances
	leads = [
		audioLib.Oscillator(sampleRate, 220),
		audioLib.Oscillator(sampleRate, 440),
		audioLib.Oscillator(sampleRate, 0)
	];
	// Compressor effect to prevent clipping w/ chords
	comp = audioLib.Compressor(sampleRate, 3, 0.5);
}