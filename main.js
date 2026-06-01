(function () {
    const recordToggle = document.getElementById('recordToggle');
    const recordStatus = document.getElementById('recordStatus');
    const recordingsList = document.getElementById('recordingsList');
    const recordTitleInput = document.getElementById('recordTitle');
    const consentDialog = document.getElementById('gdprConsentDialog');
    const consentAccept = document.getElementById('consentAccept');
    const consentDecline = document.getElementById('consentDecline');

    if (!recordToggle || !recordStatus || !recordingsList || !recordTitleInput) {
        return;
    }

    let mediaRecorder = null;
    let audioMimeType = '';
    let audioChunks = [];
    let currentStream = null;
    let pendingSend = null;

    const closeConsent = () => {
        if (consentDialog && typeof consentDialog.close === 'function') {
            consentDialog.close();
        }
    };

    const openConsent = () => {
        if (consentDialog && typeof consentDialog.showModal === 'function') {
            consentDialog.showModal();
        }
    };

    const getSendText = (type) => {
        if (type === 'story') {
            return {
                sending: 'Skickar berättelsen till Stockholm Stad...',
                sent: 'Berättelsen har skickats till Stockholm Stad',
                buttonLabel: 'Skickar...'
            };
        }

        return {
            sending: 'Skickar ljudfilen till Stockholm Stad...',
            sent: 'Ljudfilen har skickats till Stockholm Stad',
            buttonLabel: 'Skickar...'
        };
    };

    const acceptConsent = async () => {
        if (!pendingSend) return;

        const { button, status, type } = pendingSend;
        const text = getSendText(type);

        button.disabled = true;
        button.textContent = text.buttonLabel;
        status.textContent = text.sending;
        status.className = 'small text-muted';

        await new Promise((resolve) => setTimeout(resolve, 1200));

        button.textContent = 'Skickad';
        button.className = 'btn btn-sm btn-success';
        status.textContent = text.sent;
        status.className = 'small text-success';
        pendingSend = null;
        closeConsent();
    };

    const declineConsent = () => {
        if (!pendingSend) return;

        const { button, status } = pendingSend;
        button.disabled = false;
        button.textContent = 'Skicka till Stockholm Stad';
        status.textContent = 'Skickning avbröts. Ingen fil har skickats.';
        status.className = 'small text-danger';
        pendingSend = null;
        closeConsent();
    };

    if (consentAccept && consentDecline) {
        consentAccept.addEventListener('click', acceptConsent);
        consentDecline.addEventListener('click', declineConsent);
    }

    const updateStatus = (text, isError = false) => {
        recordStatus.textContent = text;
        recordStatus.classList.toggle('text-danger', isError);
        recordStatus.classList.toggle('text-muted', !isError);
    };

    const createRecordingItem = (blob, title) => {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const li = document.createElement('li');
        li.className = 'mb-3 border rounded p-3 bg-light';

        const heading = document.createElement('div');
        heading.className = 'fw-semibold mb-2';
        heading.textContent = title || 'Ljudinspelning';

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = url;
        audio.className = 'w-100 mb-2';

        const controls = document.createElement('div');
        controls.className = 'd-flex flex-wrap gap-2 align-items-center';

        const sendButton = document.createElement('button');
        sendButton.type = 'button';
        sendButton.className = 'btn btn-sm btn-outline-primary';
        sendButton.textContent = 'Skicka till Stockholm Stad';

        const sendStatus = document.createElement('span');
        sendStatus.className = 'small text-muted';
        sendStatus.textContent = 'Ej skickad';

        sendButton.addEventListener('click', () => {
            if (sendButton.disabled) return;
            pendingSend = { button: sendButton, status: sendStatus };

            if (consentDialog && typeof consentDialog.showModal === 'function') {
                openConsent();
                return;
            }

            const accepted = window.confirm(
                'Genom att skicka ljudet accepterar du att data hanteras i en simulering av Stockholm Stads system. Ingen data sparas på riktigt.'
            );

            if (accepted) {
                acceptConsent();
            } else {
                declineConsent();
            }
        });

        controls.appendChild(sendButton);
        controls.appendChild(sendStatus);

        li.appendChild(heading);
        li.appendChild(audio);
        li.appendChild(controls);
        recordingsList.prepend(li);
    };

    const stopRecording = () => {
        if (!mediaRecorder) return;

        mediaRecorder.addEventListener('stop', () => {
            const blobType = audioChunks[0]?.type || audioMimeType || 'audio/webm';
            const blob = new Blob(audioChunks, { type: blobType });
            createRecordingItem(blob, recordTitleInput.value.trim());
            audioChunks = [];
            updateStatus('Inspelningen ligger nu i listan. Klicka på knappen för att skicka den till Stockholm Stad.');
        }, { once: true });

        mediaRecorder.stop();
        currentStream?.getTracks().forEach((track) => track.stop());
        currentStream = null;
        mediaRecorder = null;
        recordToggle.textContent = 'Starta inspelning';
        recordToggle.disabled = false;
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            updateStatus('Din webbläsare stödjer inte ljudinspelning.', true);
            return;
        }

        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            let recorderOptions = {};
            if (typeof MediaRecorder.isTypeSupported === 'function') {
                const supportedTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/mp4',
                    'audio/m4a',
                    'audio/ogg'
                ];
                audioMimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
                if (audioMimeType) {
                    recorderOptions = { mimeType: audioMimeType };
                }
            }

            mediaRecorder = new MediaRecorder(currentStream, recorderOptions);
            audioChunks = [];

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            });

            mediaRecorder.addEventListener('start', () => {
                updateStatus('Inspelning pågår... Tala nu.');
                recordToggle.textContent = 'Stoppa och spara';
            });

            mediaRecorder.start();
        } catch (error) {
            console.error(error);
            updateStatus('Misslyckades med att komma åt mikrofonen. Kontrollera behörigheter.', true);
        }
    };

    recordToggle.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
            return;
        }

        recordToggle.disabled = true;
        updateStatus('Förbereder inspelning...');
        startRecording().finally(() => {
            recordToggle.disabled = false;
        });
    });
})();
