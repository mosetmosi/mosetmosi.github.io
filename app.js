//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var recorder; 						//WebAudioRecorder object
var input; 							//MediaStreamAudioSourceNode  we'll be recording
var encodingType = 'wav';
var encodeAfterRecord = true;       // when to encode

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //new audio context to help us record

var recordToggle = document.getElementById("recordToggle");
var isRecording = false;

// add toggle event
if (recordToggle) {
	recordToggle.addEventListener("click", toggleRecording);
} else {
	console.warn('recordToggle not found in DOM');
}

function toggleRecording() {
	if (isRecording) {
		stopRecording();
	} else {
		startRecording();
	}
}

function startRecording() {
	console.log("startRecording() called");

	/*
		Simple constraints object, for more advanced features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

    /*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		__log("getUserMedia() success, stream created, initializing WebAudioRecorder...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		// formats display removed (no-op)

		//assign to gumStream for later use
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
		
		//stop the input from playing back through the speakers
		//input.connect(audioContext.destination)

		// encodingType is forced to 'wav'

		recorder = new WebAudioRecorder(input, {
		  workerDir: './', // must end with slash and point to current root location
		  encoding: encodingType,
		  numChannels:2, //2 is the default, mp3 encoding supports only 2
		  onEncoderLoading: function(recorder, encoding) {
		    // show "loading encoder..." display
		    __log("Loading "+encoding+" encoder...");
		  },
		  onEncoderLoaded: function(recorder, encoding) {
		    // hide "loading encoder..." display
		    __log(encoding+" encoder loaded");
		  }
		});

        recorder.onComplete = function(recorder, blob) { 
			__log("Encoding complete");
			createDownloadLink(blob,recorder.encoding);
			isRecording = false;
			if (recordToggle) recordToggle.textContent = "Spela in";
		}

		recorder.setOptions({
		  timeLimit:120,
		  encodeAfterRecord:encodeAfterRecord,
	      ogg: {quality: 0.5},
	      mp3: {bitRate: 160}
	    });

		//start the recording process
		try {
			recorder.startRecording();
			isRecording = true;
			if (recordToggle) recordToggle.textContent = "Recordning...";
			__log("Recording started");
		} catch (err) {
			__log('Failed to start recorder: ' + err);
			console.error(err);
		}

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
		__log('getUserMedia() error: ' + err);
		console.error(err);
		isRecording = false;
		if (recordToggle) recordToggle.textContent = "Spela in";

	});
}

function stopRecording() {
	console.log("stopRecording() called");
	
	//stop microphone access
	if (gumStream && gumStream.getAudioTracks && gumStream.getAudioTracks().length) {
		gumStream.getAudioTracks()[0].stop();
	} else {
		console.warn('No gumStream available to stop');
	}

	//tell the recorder to finish the recording (stop recording + encode the recorded audio)
	recorder.finishRecording();

	__log('Recording stopped');
}

function createDownloadLink(blob,encoding) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//link the a element to the blob
	link.href = url;
	link.download = new Date().toISOString() + '.'+encoding;
	link.innerHTML = link.download;

	//add the new audio and a elements to the li element
	li.appendChild(au);
	li.appendChild(link);

	//add the li element to the ordered list (safe lookup)
	var list = document.getElementById('recordingsList');
	if (list) {
		list.appendChild(li);
	} else {
		document.body.appendChild(li);
	}
}



//helper function
function __log(e, data) {
	var logEl = document.getElementById('log');
	if (logEl) {
		logEl.innerHTML += "\n" + e + " " + (data || '');
	} else {
		console.log(e, data || '');
	}
}