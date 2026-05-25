/**
 * ChromaChord - Live Audio Analyzer
 * Captures microphone input, performs FFT, and identifies chords.
 */

window.AudioAnalyzer = (function() {
    let audioCtx = null;
    let analyser = null;
    let microphone = null;
    let isListening = false;
    let animationId = null;
    let onChordDetectedCallback = null;

    // Constants
    const FFT_SIZE = 8192;
    const MIN_FREQ = 60; // Approx B1
    const MAX_FREQ = 1200; // Approx D6
    const MIN_DECIBELS = -70; // Noise floor
    const SMOOTHING = 0.8;

    async function startListening(callback) {
        if (isListening) return;
        onChordDetectedCallback = callback;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false, 
                    autoGainControl: false, 
                    noiseSuppression: false 
                } 
            });

            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = FFT_SIZE;
            analyser.minDecibels = MIN_DECIBELS;
            analyser.smoothingTimeConstant = SMOOTHING;

            microphone = audioCtx.createMediaStreamSource(stream);
            microphone.connect(analyser);

            isListening = true;
            processAudio();
            return true;
        } catch (err) {
            console.error("Microphone access denied or failed:", err);
            return false;
        }
    }

    function stopListening() {
        if (!isListening) return;
        isListening = false;
        if (animationId) cancelAnimationFrame(animationId);
        
        if (microphone) {
            microphone.disconnect();
            microphone.mediaStream.getTracks().forEach(t => t.stop());
        }
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
    }

    function processAudio() {
        if (!isListening) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatFrequencyData(dataArray);

        const sampleRate = audioCtx.sampleRate;
        const binWidth = sampleRate / FFT_SIZE;

        let chroma = new Array(12).fill(0);
        let absolutePitches = new Array(128).fill(0); // MIDI notes 0-127
        let maxEnergy = 0;

        for (let i = 0; i < bufferLength; i++) {
            const freq = i * binWidth;
            if (freq < MIN_FREQ || freq > MAX_FREQ) continue;

            const db = dataArray[i];
            if (db < MIN_DECIBELS) continue;

            // Convert DB to linear energy approximation
            const energy = Math.pow(10, (db - MIN_DECIBELS) / 20);

            // Calculate exact MIDI pitch (float)
            const midiFloat = 69 + 12 * Math.log2(freq / 440);
            const midiInt = Math.round(midiFloat);
            
            // Allow some tolerance for tuning
            if (Math.abs(midiFloat - midiInt) < 0.35) {
                if (midiInt >= 0 && midiInt < 128) {
                    absolutePitches[midiInt] += energy;
                    chroma[midiInt % 12] += energy;
                    if (chroma[midiInt % 12] > maxEnergy) {
                        maxEnergy = chroma[midiInt % 12];
                    }
                }
            }
        }

        // Identify active pitches
        let activePitches = [];
        let bassNote = -1;
        const THRESHOLD = maxEnergy * 0.4; // 40% of max energy

        if (maxEnergy > 0.5) { // Ensure there is actual sound, not just noise
            // Find bass note (lowest pitch with significant energy)
            for (let i = 0; i < 128; i++) {
                if (absolutePitches[i] > maxEnergy * 0.25) { // Bass might be slightly quieter than main harmonics
                    bassNote = i;
                    break;
                }
            }

            // Find all active pitch classes
            for (let i = 0; i < 12; i++) {
                if (chroma[i] >= THRESHOLD) {
                    activePitches.push(i);
                }
            }

            // Construct pitch array for the engine
            // If we found a bass note, add it explicitly so the engine knows the inversion
            let pitchesForEngine = [];
            if (bassNote !== -1 && activePitches.includes(bassNote % 12)) {
                pitchesForEngine.push(bassNote);
                
                // Add the rest in a higher octave
                activePitches.forEach(pClass => {
                    if (pClass !== (bassNote % 12)) {
                        pitchesForEngine.push(bassNote + 12 + ((pClass - (bassNote % 12) + 12) % 12));
                    }
                });
            } else {
                // Fallback if bass note logic fails
                pitchesForEngine = activePitches.map(p => 60 + p);
            }

            if (pitchesForEngine.length >= 2 && window.MusicTheory) {
                const chordName = window.MusicTheory.identifyChordFromNotes(pitchesForEngine);
                if (onChordDetectedCallback) {
                    onChordDetectedCallback(chordName, maxEnergy);
                }
            } else {
                if (onChordDetectedCallback) onChordDetectedCallback("-", 0);
            }
        } else {
            if (onChordDetectedCallback) onChordDetectedCallback("-", 0);
        }

        // Loop ~10 times a second for less UI jitter
        setTimeout(() => {
            if (isListening) animationId = requestAnimationFrame(processAudio);
        }, 100);
    }

    return {
        start: startListening,
        stop: stopListening,
        isActive: () => isListening
    };
})();
