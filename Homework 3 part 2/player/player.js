var	theme,
	noteCount = 0,
	noteTotal,
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

function play( source, inFormat ) {
  theme = inFormat === '.song' ? JSON.parse( source ) : compile( source, inFormat );
  noteTotal = theme.length;
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