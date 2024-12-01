const mic_btn = document.querySelector('#mic');
const playback = document.querySelector('.playback');
const retry_btn = document.getElementById('retry-btn'); // Reference the retry button
const dynamicBox = document.getElementById('dynamic-box'); // Reference the dynamic text box
const timerDisplay = document.getElementById('timer'); // Reference the timer display (add this to your HTML)
const uploadBtn = document.querySelector('#upload-btn'); // Reference the upload button

mic_btn.addEventListener('click', ToggleMic);
retry_btn.addEventListener('click', ResetRecording);

// Hide the buttons initially
playback.hidden = true;
uploadBtn.hidden = true;
retry_btn.hidden = true;

let can_record = false;
let is_recording = false;
let recorder = null;
let chunks = [];
let recordingTimer = null; // Reference for the recording timer
let startTime = null; // Timestamp when recording starts

// Initial instruction
dynamicBox.textContent = 'Click the record button to start recording your answer.';

function SetupAudio() {
    console.log("Setup");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
            .getUserMedia({
                audio: true
            })
            .then(SetupStream)
            .catch(err => {
                console.error(err);
            });
    }
}

SetupAudio();

function SetupStream(stream) {
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = e => {
        chunks.push(e.data);
    };

    recorder.onstop = e => {
        clearInterval(recordingTimer); // Stop the timer when recording stops
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        playback.src = audioURL;

        // Show the buttons and update instructions after recording stops
        playback.hidden = false;
        uploadBtn.hidden = false;
        retry_btn.hidden = false;

        dynamicBox.textContent = 'Recording stopped. You can now review your answer or upload it.';
    };

    can_record = true;
}

function ToggleMic() {
    if (!can_record) return;

    is_recording = !is_recording;

    if (is_recording) {
        // If there's already a recording, warn the user
        if (playback.src) {
            if (!confirm("You have an existing recording. Are you sure you want to overwrite it?")) {
                return;
            }
        }
        
        recorder.start();
        mic_btn.classList.add('is-recording');

        // Start timer when recording begins
        startTime = Date.now();
        timerDisplay.textContent = '0:00'; // Reset timer display
        recordingTimer = setInterval(updateRecordingTimer, 1000);

        // Update instructions while recording
        dynamicBox.textContent = 'Recording in progress... Speak clearly into the microphone.';
    } else {
        recorder.stop();
        mic_btn.classList.remove('is-recording');

        // Update instructions (handled in `onstop` callback above)
    }
}

function updateRecordingTimer() {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = formatTime(elapsedSeconds);
}

function ResetRecording() {
    // Reset dynamic instructions to the initial state
    dynamicBox.textContent = 'Click the record button to start recording your answer.';

    // Clear the audio blob and reset playback
    playback.src = '';
    timerDisplay.textContent = '0:00'; // Reset timer
    chunks = [];

    // Stop timer if running
    clearInterval(recordingTimer);

    // Ensure recording is stopped
    if (is_recording) {
        recorder.stop();
        mic_btn.classList.remove('is-recording');
        is_recording = false;
    }

    // Hide the buttons after reset
    playback.hidden = true;
    uploadBtn.hidden = true;
    retry_btn.hidden = true;

    console.log('Recording has been reset.');
}

uploadBtn.addEventListener('click', async function() {
    // Ensure there is an audio file to upload
    if (!playback.src) {
        alert('No recording found. Please record audio before uploading.');
        return;
    }

    console.log('playback.src:', playback.src);

    try {
        const blob = await fetch(playback.src).then(res => res.blob());
        console.log('Blob fetched successfully:', blob);

        const formData = new FormData();
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
        const filename = `recording_${timestamp}.ogg`;
        formData.append('file', blob, filename);

        console.log('FormData prepared:', [...formData.entries()]);

        // Updated URL to point to your deployed backend
        const response = await fetch('https://google-drive-backend-lmqndoz5ba-uc.a.run.app/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Server responded with status ' + response.status + ': ' + errorText);
        }

        const data = await response.json();
        console.log('Upload successful:', data);
        
        alert('Upload successful! File ID: ' + data.fileId);

    } catch (error) {
        console.error('Error during upload:', error, 'Stack:', error.stack);
        alert('An error occurred during the upload: ' + error.message);
    }
});

// Helper function to format time in minutes and seconds
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
