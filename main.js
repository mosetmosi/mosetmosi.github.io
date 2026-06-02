(function () {
    const recordToggle = document.getElementById('recordToggle');
    const recordStatus = document.getElementById('recordStatus');
    const recordingsList = document.getElementById('recordingsList');
    const recordTitleInput = document.getElementById('recordTitle');
    const consentDialog = document.getElementById('gdprConsentDialog');
    const consentAccept = document.getElementById('consentAccept');
    const consentDecline = document.getElementById('consentDecline');

    // If core UI elements are missing, abort. `recordToggle` and `recordStatus` are optional.
    if (!recordingsList || !recordTitleInput) {
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
            return;
        }
        if (consentDialog) {
            consentDialog.removeAttribute('open');
            consentDialog.style.display = 'none';
        }
    };

    const openConsent = () => {
        if (consentDialog && typeof consentDialog.showModal === 'function') {
            consentDialog.showModal();
            return;
        }
        if (consentDialog && typeof consentDialog.show === 'function') {
            consentDialog.show();
            return;
        }
        if (consentDialog) {
            consentDialog.setAttribute('open', '');
            consentDialog.style.display = 'block';
            return;
        }
        const confirmed = window.confirm('Acceptera och skicka?');
        if (confirmed) acceptConsent();
        else declineConsent();
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

    // Wire a send button (if present) to open consent and set pendingSend
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            // prepare pendingSend for the consent dialog flow
            pendingSend = {
                button: sendButton,
                status: recordStatus || { textContent: '' },
                type: 'audio'
            };
            openConsent();
        });
    }

    const updateStatus = (text, isError = false) => {
        recordStatus.textContent = text;
        recordStatus.classList.toggle('text-danger', isError);
        recordStatus.classList.toggle('text-muted', !isError);
    };
})();
