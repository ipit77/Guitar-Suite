/**
 * ChromaChord - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const chordInput = document.getElementById('chord-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-input-btn');
    const targetMoodSelect = document.getElementById('target-mood');
    const octaveShiftSelect = document.getElementById('octave-shift');
    const pickerRoot = document.getElementById('picker-root');
    const pickerType = document.getElementById('picker-type');
    const addChordBtn = document.getElementById('add-chord-btn');
    const dashboard = document.getElementById('results-dashboard');
    
    const resKey = document.getElementById('result-key');
    const resMood = document.getElementById('result-mood');
    const resAltChords = document.getElementById('result-alt-chords');
    const resScales = document.getElementById('result-scales');
    const resExplanation = document.getElementById('result-explanation');

    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const historyList = document.getElementById('history-list');

    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const mainPlayBtn = document.getElementById('main-play-btn');
    const mainStopBtn = document.getElementById('main-stop-btn');
    const saveBtn = document.getElementById('save-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Audio State
    let currentSequence = null;
    let synth = null;

    const initAudio = async () => {
        if (!synth && window.Tone) {
            await Tone.start();
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 1 }
            }).toDestination();
            const reverb = new Tone.Reverb(2).toDestination();
            synth.connect(reverb);
        }
    };

    const stopPlayback = () => {
        if (currentSequence) {
            currentSequence.dispose();
            currentSequence = null;
        }
        if (window.Tone) {
            Tone.Transport.stop();
            Tone.Transport.position = 0;
        }
        
        [stopBtn, mainStopBtn].forEach(btn => btn?.classList.add('hidden'));
        [playBtn, mainPlayBtn].forEach(btn => btn?.classList.remove('hidden'));
    };

    const startPlayback = async (inputString) => {
        if (!inputString) return;
        await initAudio();
        if (!window.Tone) {
            alert("Tone.js konnte nicht geladen werden.");
            return;
        }

        [playBtn, mainPlayBtn].forEach(btn => btn?.classList.add('hidden'));
        [stopBtn, mainStopBtn].forEach(btn => btn?.classList.remove('hidden'));
        
        Tone.Transport.bpm.value = 100;
        
        const octaveShift = parseInt(octaveShiftSelect?.value) || 0;
        const chordsToPlay = window.MusicTheory.parseChords(inputString);
        
        const events = chordsToPlay.map((chord, index) => {
            const notes = window.MusicTheory.getChordNotesForAudio(chord, octaveShift);
            return {
                time: index * Tone.Time("1m"),
                chordName: chord,
                notes: notes
            };
        });

        if (currentSequence) currentSequence.dispose();

        currentSequence = new Tone.Part((time, value) => {
            if (value.notes.length > 0) {
                synth.triggerAttackRelease(value.notes, "1m", time);
            }
        }, events).start(0);

        currentSequence.loop = true;
        currentSequence.loopEnd = chordsToPlay.length * Tone.Time("1m");
        
        Tone.Transport.start();
    };

    // Mobile Access Elements
    const mobileLinkBtn = document.getElementById('mobile-link-btn');
    const mobileModal = document.getElementById('mobile-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const qrCodeImg = document.getElementById('qr-code-img');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    const localUrlDisplay = document.getElementById('local-url-display');

    // Cloud Sync Elements
    const exportDbBtn = document.getElementById('export-db-btn');
    const importDbBtn = document.getElementById('import-db-btn');
    const importFileInput = document.getElementById('import-file-input');

    // Fretboard Explorer Elements
    const interactiveFretboard = document.getElementById('interactive-fretboard');
    const clearFretboardBtn = document.getElementById('clear-fretboard-btn');
    const useFretboardBtn = document.getElementById('use-fretboard-chord-btn');
    const fretboardChordName = document.getElementById('fretboard-chord-name');

    // Live Mic Elements
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const micDetectedChord = document.getElementById('mic-detected-chord');
    const useMicChordBtn = document.getElementById('use-mic-chord-btn');

    // Fretboard Tabs & Library
    const fretTabs = document.querySelectorAll('.fret-tab');
    const fretViews = document.querySelectorAll('.fret-view');
    const libRootSelect = document.getElementById('lib-root');
    const libChordTypeSelect = document.getElementById('lib-chord-type');
    const libScaleSelect = document.getElementById('lib-scale');
    const chordLibraryGrid = document.getElementById('chord-library-grid');

    // State
    let currentAnalysis = null;
    let history = JSON.parse(localStorage.getItem('chromaChordHistory')) || [];

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registered', reg))
                .catch(err => console.log('SW error', err));
        });
    }

    // Initialize History
    renderHistory();

    // Event Listeners
    analyzeBtn.addEventListener('click', performAnalysis);
    
    chordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performAnalysis();
    });

    chordInput.addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        chordInput.value = '';
        clearBtn.classList.add('hidden');
        chordInput.focus();
    });

    addChordBtn?.addEventListener('click', () => {
        const root = pickerRoot.value;
        const type = pickerType.value;
        const chord = root + type;
        
        let currentVal = chordInput.value.trim();
        if (currentVal) {
            chordInput.value = currentVal + " - " + chord;
        } else {
            chordInput.value = chord;
        }
        
        // Trigger input event to show clear button
        chordInput.dispatchEvent(new Event('input'));
        
        // Visual feedback
        addChordBtn.style.transform = "scale(0.95)";
        setTimeout(() => addChordBtn.style.transform = "", 100);
    });

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    if (playBtn) playBtn.addEventListener('click', () => startPlayback(currentAnalysis?.rawInput || chordInput.value));
    if (mainPlayBtn) mainPlayBtn.addEventListener('click', () => startPlayback(chordInput.value));
    if (stopBtn) stopBtn.addEventListener('click', stopPlayback);
    if (mainStopBtn) mainStopBtn.addEventListener('click', stopPlayback);

    saveBtn.addEventListener('click', () => {
        if (currentAnalysis) {
            saveToHistory(currentAnalysis);
        }
    });

    copyBtn.addEventListener('click', copyResults);

    // Live Mic Listeners
    if (micBtn && window.AudioAnalyzer) {
        micBtn.addEventListener('click', async () => {
            if (window.AudioAnalyzer.isActive()) {
                window.AudioAnalyzer.stop();
                micBtn.classList.remove('active');
                micStatus.classList.add('hidden');
            } else {
                const success = await window.AudioAnalyzer.start((chordName, energy) => {
                    micDetectedChord.textContent = chordName;
                    if (chordName !== '-' && !chordName.includes('(?)')) {
                        useMicChordBtn.classList.remove('hidden');
                    } else {
                        useMicChordBtn.classList.add('hidden');
                    }
                });
                if (success) {
                    micBtn.classList.add('active');
                    micStatus.classList.remove('hidden');
                    micDetectedChord.textContent = '-';
                    useMicChordBtn.classList.add('hidden');
                } else {
                    alert('Mikrofon konnte nicht aktiviert werden.');
                }
            }
        });

        useMicChordBtn.addEventListener('click', () => {
            let currentInput = chordInput.value.trim();
            let name = micDetectedChord.textContent.split(' ')[0]; // removes " (Powerchord)"
            
            if (currentInput) {
                chordInput.value = currentInput + ' ' + name;
            } else {
                chordInput.value = name;
            }
            
            clearBtn.classList.remove('hidden');
            performAnalysis();
        });
    }

    // Mobile Modal Listeners
    mobileLinkBtn.addEventListener('click', () => {
        const localIp = '192.168.178.99'; // Known local IP
        const port = '8000';
        const url = `http://${localIp}:${port}`;
        
        localUrlDisplay.textContent = url;
        
        // Generate QR code using public API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
        
        qrPlaceholder.classList.remove('hidden');
        qrCodeImg.classList.add('hidden');
        qrCodeImg.src = qrUrl;
        
        qrCodeImg.onload = () => {
            qrCodeImg.classList.remove('hidden');
            qrPlaceholder.classList.add('hidden');
        };
        
        mobileModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        mobileModal.classList.add('hidden');
    });

    mobileModal.addEventListener('click', (e) => {
        if (e.target === mobileModal) {
            mobileModal.classList.add('hidden');
        }
    });

    copyUrlBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(localUrlDisplay.textContent).then(() => {
            const originalIcon = copyUrlBtn.innerHTML;
            copyUrlBtn.innerHTML = '<i class="ri-check-line" style="color: var(--secondary)"></i>';
            setTimeout(() => {
                copyUrlBtn.innerHTML = originalIcon;
            }, 2000);
        });
    });

    // Cloud Sync Listeners
    exportDbBtn.addEventListener('click', exportHistory);
    importDbBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importHistory);

    /**
     * Performs the analysis flow
     */
    function performAnalysis() {
        const rawInput = chordInput.value;
        const chords = window.MusicTheory.parseChords(rawInput);
        
        if (chords.length === 0) {
            alert('Bitte gib mindestens einen gültigen Akkord ein, z.B. "C G Am F"');
            return;
        }

        // Run engine
        const keyInfo = window.MusicTheory.detectKey(chords);
        const lastChord = chords[chords.length - 1];
        const targetMood = targetMoodSelect.value;
        const altChords = window.MusicTheory.recommendAlternativeChords(keyInfo, lastChord, targetMood);
        const scales = window.MusicTheory.recommendScales(keyInfo, chords);
        const moodInfo = window.MusicTheory.analyzeMood(chords, keyInfo.type);

        currentAnalysis = {
            id: Date.now(),
            rawInput: chords.join(' - '),
            keyInfo,
            altChords,
            scales,
            moodInfo,
            targetMood,
            timestamp: new Date().toISOString()
        };

        // Render Results
        renderResults();
    }

    function renderResults() {
        if (!currentAnalysis) return;

        const { keyInfo, altChords, scales, moodInfo } = currentAnalysis;

        resKey.textContent = keyInfo.key;
        resMood.textContent = moodInfo.mood;

        // Render Tags
        resAltChords.innerHTML = '';
        altChords.forEach((chord, i) => {
            const span = document.createElement('span');
            span.className = i === 0 ? 'tag highlight scale-tag' : 'tag scale-tag';
            
            const tabHtml = window.GuitarTab ? window.GuitarTab.getChordTab(chord) : null;
            
            span.innerHTML = `
                <span class="scale-name">${chord}</span>
                ${tabHtml ? `<div class="scale-notes tab-display">${tabHtml}</div>` : ''}
            `;
            
            if (tabHtml) {
                span.title = "Klicken, um Tabulatur einzublenden";
                span.addEventListener('click', function() {
                    this.classList.toggle('expanded');
                });
            }
            resAltChords.appendChild(span);
        });

        resScales.innerHTML = '';
        scales.forEach((scale, i) => {
            const span = document.createElement('span');
            span.className = i === 0 ? 'tag highlight scale-tag' : 'tag scale-tag';
            
            const name = typeof scale === 'string' ? scale : scale.name;
            const notesStr = typeof scale === 'object' ? scale.notes : '';
            const tRoot = typeof scale === 'object' ? scale.root : null;
            const tIntervals = typeof scale === 'object' ? scale.intervals : null;
            
            const tabHtml = (window.GuitarTab && tRoot && tIntervals) ? window.GuitarTab.getScaleTab(tRoot, tIntervals) : null;
            
            span.innerHTML = `
                <span class="scale-name">${name}</span>
                ${notesStr ? `<span class="scale-notes text-notes">${notesStr}</span>` : ''}
                ${tabHtml ? `<div class="scale-notes tab-display">${tabHtml}</div>` : ''}
            `;
            
            if (notesStr || tabHtml) {
                span.title = "Klicken, um Tabulatur einzublenden";
                span.addEventListener('click', function() {
                    this.classList.toggle('expanded');
                });
            }
            resScales.appendChild(span);
        });

        resExplanation.innerHTML = `
            <strong>${keyInfo.key}:</strong> Die Progression basiert wahrscheinlich auf dieser Tonart.<br><br>
            <strong>Stimmung:</strong> ${moodInfo.explanation}
        `;

        // Show dashboard with animation
        dashboard.classList.remove('hidden');
        dashboard.style.animation = 'none';
        dashboard.offsetHeight; /* trigger reflow */
        dashboard.style.animation = null;
    }

    /**
     * History Management
     */
    function saveToHistory(analysis) {
        // Prevent exact duplicates consecutively
        if (history.length > 0 && history[0].rawInput === analysis.rawInput) {
            showSaveTooltip('Bereits gespeichert');
            return;
        }

        history.unshift(analysis);
        if (history.length > 20) history.pop(); // Max 20 items
        localStorage.setItem('chromaChordHistory', JSON.stringify(history));
        renderHistory();
        showSaveTooltip('Gespeichert!');
    }

    function removeHistoryItem(id) {
        history = history.filter(item => item.id !== id);
        localStorage.setItem('chromaChordHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li style="color: var(--text-muted); text-align: center; padding: 2rem 0;">Noch keine Einträge.</li>';
            return;
        }

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <h4>${item.rawInput}</h4>
                <p><i class="ri-key-2-line"></i> ${item.keyInfo.key} | ${item.moodInfo.mood.split(' / ')[0]}</p>
                <button class="delete-history-btn" aria-label="Eintrag löschen" data-id="${item.id}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;
            
            // Click item to load
            li.addEventListener('click', (e) => {
                if (e.target.closest('.delete-history-btn')) return;
                chordInput.value = item.rawInput;
                clearBtn.classList.remove('hidden');
                performAnalysis();
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });

            historyList.appendChild(li);
        });

        // Setup delete buttons
        document.querySelectorAll('.delete-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeHistoryItem(parseInt(btn.getAttribute('data-id')));
            });
        });
    }

    /**
     * Copy to clipboard
     */
    function copyResults() {
        if (!currentAnalysis) return;
        const scaleStr = currentAnalysis.scales.map(s => typeof s === 'string' ? s : s.name).join(', ');
        const text = `Akkordfolge: ${currentAnalysis.rawInput}\nTonart: ${currentAnalysis.keyInfo.key}\nStimmung: ${currentAnalysis.moodInfo.mood}\nSolo Skalen: ${scaleStr}\nAlternative Akkorde: ${currentAnalysis.altChords.join(', ')}`;
        
        navigator.clipboard.writeText(text).then(() => {
            showCopyTooltip('Kopiert!');
        }).catch(err => {
            console.error('Copy failed', err);
            showCopyTooltip('Fehler');
        });
    }

    function showSaveTooltip(msg) {
        saveBtn.setAttribute('data-tooltip', msg);
        setTimeout(() => saveBtn.setAttribute('data-tooltip', 'In Verlauf speichern'), 2000);
    }

    function showCopyTooltip(msg) {
        copyBtn.setAttribute('data-tooltip', msg);
        setTimeout(() => copyBtn.setAttribute('data-tooltip', 'Ergebnisse kopieren'), 2000);
    }

    /**
     * Cloud Sync Functions
     */
    function exportHistory() {
        if (history.length === 0) {
            alert('Kein Verlauf zum Exportieren vorhanden.');
            return;
        }
        
        const dataStr = JSON.stringify(history, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chromachord_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importHistory(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error('Ungültiges Format');
                
                if (confirm(`${importedData.length} Einträge importieren? Bestehende Daten werden überschrieben.`)) {
                    history = importedData;
                    localStorage.setItem('chromaChordHistory', JSON.stringify(history));
                    renderHistory();
                    alert('Import erfolgreich!');
                }
            } catch (err) {
                alert('Fehler beim Importieren: ' + err.message);
            }
            // Reset input
            importFileInput.value = '';
        };
        reader.readAsText(file);
    }

    /**
     * Interactive Fretboard Explorer
     */
    let selectedNotes = []; // array of {stringIdx, fret, pitch}

    function initFretboard() {
        if (!interactiveFretboard) return;
        
        interactiveFretboard.innerHTML = '';
        
        // Background inlays
        const inlays = document.createElement('div');
        inlays.className = 'fretboard-inlays';
        
        const inlayFrets = [3, 5, 7, 9, 12, 15];
        let inlayHtml = '<div class="fret-0-inlay"></div>';
        
        for (let i = 1; i <= 15; i++) {
            inlayHtml += `<div class="fret-inlay-container">`;
            if (i === 12) {
                inlayHtml += `<div class="inlay-double-dot"><div class="inlay-dot"></div><div class="inlay-dot"></div></div>`;
            } else if (inlayFrets.includes(i)) {
                inlayHtml += `<div class="inlay-dot"></div>`;
            }
            inlayHtml += `</div>`;
        }
        inlays.innerHTML = inlayHtml;
        interactiveFretboard.appendChild(inlays);
        
        const STRINGS = [
            { name: 'e', pitch: 28 },
            { name: 'B', pitch: 23 },
            { name: 'G', pitch: 19 },
            { name: 'D', pitch: 14 },
            { name: 'A', pitch: 9 },
            { name: 'E', pitch: 4 }
        ];

        STRINGS.forEach((str, sIdx) => {
            const row = document.createElement('div');
            row.className = 'fretboard-string-container';
            
            const label = document.createElement('div');
            label.className = 'string-label';
            label.textContent = str.name;
            row.appendChild(label);
            
            const line = document.createElement('div');
            line.className = 'string-line';
            row.appendChild(line);
            
            for (let fret = 0; fret <= 15; fret++) {
                const fretDiv = document.createElement('div');
                fretDiv.className = fret === 0 ? 'fret fret-0' : 'fret';
                fretDiv.dataset.string = sIdx;
                fretDiv.dataset.fret = fret;
                fretDiv.dataset.pitch = str.pitch + fret;
                
                const marker = document.createElement('div');
                marker.className = 'fret-marker';
                fretDiv.appendChild(marker);
                
                fretDiv.addEventListener('click', () => toggleNote(sIdx, fret, str.pitch + fret, fretDiv));
                row.appendChild(fretDiv);
            }
            interactiveFretboard.appendChild(row);
        });
        
        // Fret numbers
        const numRow = document.createElement('div');
        numRow.className = 'fret-numbers';
        numRow.innerHTML = '<div class="fret-number fret-0-label">0</div>';
        for (let i = 1; i <= 15; i++) {
            numRow.innerHTML += `<div class="fret-number">${i}</div>`;
        }
        interactiveFretboard.appendChild(numRow);
    }
    
    function highlightFretboard(noteNames) {
        document.querySelectorAll('.fret').forEach(el => {
            el.classList.remove('active', 'active-root');
        });
        
        if (!noteNames || noteNames.length === 0) return;
        
        const rootNote = noteNames[0].replace(/[0-9]/g, '');
        
        const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const targetPitches = noteNames.map(n => {
            let note = n.replace(/[0-9]/g, '');
            // Handle flats quickly
            if (note === 'Db') note = 'C#';
            if (note === 'Eb') note = 'D#';
            if (note === 'Gb') note = 'F#';
            if (note === 'Ab') note = 'G#';
            if (note === 'Bb') note = 'A#';
            return NOTES.indexOf(note);
        }).filter(idx => idx !== -1);
        
        const rootPitch = targetPitches.length > 0 ? targetPitches[0] : -1;
        
        document.querySelectorAll('.fret').forEach(el => {
            const pitch = parseInt(el.dataset.pitch);
            const pitchClass = pitch % 12;
            
            if (targetPitches.includes(pitchClass)) {
                el.classList.add('active');
                if (pitchClass === rootPitch) {
                    el.classList.add('active-root');
                }
            }
        });
    }

    // Tabs Logic
    fretTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab button
            fretTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show target view
            const target = tab.dataset.tab;
            fretViews.forEach(v => v.classList.add('hidden'));
            document.getElementById(`fret-view-${target}`).classList.remove('hidden');
            
            // Clear fretboard state when switching tabs
            selectedNotes = [];
            document.querySelectorAll('.fret').forEach(el => el.classList.remove('active', 'active-root'));
            analyzeFretboard();
            
            // Re-render library if entering library
            if (target === 'library') {
                renderChordLibrary();
            }
        });
    });

    // Populate Scale Dropdown
    if (libScaleSelect && window.MusicTheory) {
        const scales = window.MusicTheory.getAvailableScales();
        for (const [key, scaleInfo] of Object.entries(scales)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = scaleInfo.name;
            libScaleSelect.appendChild(option);
        }
    }

    // Library Rendering
    async function renderChordLibrary() {
        if (!chordLibraryGrid || !window.MusicTheory) return;
        const root = libRootSelect.value;
        const type = libChordTypeSelect.value;
        const chord = root + type;
        
        // Update Fretboard
        const notes = window.MusicTheory.getChordNotes(chord);
        highlightFretboard(notes);

        const chords = window.MusicTheory.getLibraryChords(root);
        chordLibraryGrid.innerHTML = '';
        chords.forEach(c => {
            const btn = document.createElement('button');
            btn.className = (c === chord) ? 'chord-lib-btn active' : 'chord-lib-btn';
            btn.textContent = c;
            btn.addEventListener('click', async () => {
                libChordTypeSelect.value = c.substring(root.length);
                renderChordLibrary();
                
                await initAudio();
                if (synth) {
                    const audioNotes = window.MusicTheory.getChordNotesForAudio(c);
                    synth.triggerAttackRelease(audioNotes, "0.5");
                }
            });
            chordLibraryGrid.appendChild(btn);
        });
    }

    libRootSelect?.addEventListener('change', () => {
        renderChordLibrary();
        updateScaleDisplay();
    });

    libChordTypeSelect?.addEventListener('change', () => {
        renderChordLibrary();
    });

    libScaleSelect?.addEventListener('change', () => {
        updateScaleDisplay();
    });

    function updateScaleDisplay() {
        if (libScaleSelect.value === 'none') {
            renderChordLibrary(); // Go back to showing the selected chord
            return;
        }
        
        document.querySelectorAll('.chord-lib-btn').forEach(b => b.classList.remove('active'));
        
        const root = libRootSelect.value;
        const scaleKey = libScaleSelect.value;
        
        if (window.MusicTheory && window.MusicTheory.getAvailableScales()[scaleKey]) {
            const intervals = window.MusicTheory.getAvailableScales()[scaleKey].intervals;
            const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            
            let rootIndex = NOTES.indexOf(root);
            if (rootIndex === -1) rootIndex = NOTES_FLAT.indexOf(root);
            
            let scaleNotes = [];
            for (let i = 0; i < intervals.length; i++) {
                scaleNotes.push(NOTES[(rootIndex + intervals[i]) % 12]);
            }
            
            highlightFretboard(scaleNotes);
        }
    }
    
    function toggleNote(sIdx, fret, pitch, element) {
        // Find if already selected
        const existingIdx = selectedNotes.findIndex(n => n.stringIdx === sIdx);
        
        if (existingIdx !== -1) {
            // Unselect previous on same string
            const oldNote = selectedNotes[existingIdx];
            const oldElement = interactiveFretboard.querySelector(`.fret[data-string="${sIdx}"][data-fret="${oldNote.fret}"]`);
            if (oldElement) oldElement.classList.remove('active', 'active-root');
            
            selectedNotes.splice(existingIdx, 1);
            
            if (oldNote.fret === fret) {
                // If clicked same, just toggle off
                analyzeFretboard();
                return;
            }
        }
        
        // Add new note
        selectedNotes.push({ stringIdx: sIdx, fret, pitch });
        element.classList.add('active');
        analyzeFretboard();
    }
    
    function analyzeFretboard() {
        if (selectedNotes.length === 0) {
            fretboardChordName.textContent = '-';
            fretboardChordName.style.color = 'var(--text-muted)';
            useFretboardBtn.style.display = 'none';
            return;
        }
        
        const pitches = selectedNotes.map(n => n.pitch);
        const chordName = window.MusicTheory.identifyChordFromNotes(pitches);
        
        fretboardChordName.textContent = chordName;
        fretboardChordName.style.color = 'var(--accent)';
        
        if (chordName && chordName !== '-' && !chordName.includes('(?)') && !chordName.includes('Note')) {
            useFretboardBtn.style.display = 'flex';
        } else {
            useFretboardBtn.style.display = 'none';
        }
    }
    
    if (clearFretboardBtn) {
        clearFretboardBtn.addEventListener('click', () => {
            selectedNotes = [];
            document.querySelectorAll('.fret.active').forEach(el => el.classList.remove('active', 'active-root'));
            analyzeFretboard();
        });
    }
    
    if (useFretboardBtn) {
        useFretboardBtn.addEventListener('click', () => {
            let currentInput = chordInput.value.trim();
            // Just use the base chord name for input (strip inversion for now, or keep it)
            // Let's keep the inversion since the engine can handle it or ignore it
            let name = fretboardChordName.textContent.split(' ')[0]; // removes " (Powerchord)"
            
            if (currentInput) {
                chordInput.value = currentInput + ' ' + name;
            } else {
                chordInput.value = name;
            }
            
            clearBtn.classList.remove('hidden');
            performAnalysis();
            
            // Scroll up
            document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Listen for postMessage from Tone Finder (via Guitar Suite parent)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'OPEN_CHROMACHORD_SCALES') {
            const root = event.data.root || 'A';

            // 1. Switch to Library tab
            fretTabs.forEach(t => t.classList.remove('active'));
            fretViews.forEach(v => v.classList.add('hidden'));

            const libraryTab = document.querySelector('.fret-tab[data-tab="library"]');
            if (libraryTab) libraryTab.classList.add('active');

            const libraryView = document.getElementById('fret-view-library');
            if (libraryView) libraryView.classList.remove('hidden');

            // 2. Set the root note
            if (libRootSelect) {
                libRootSelect.value = root;
            }

            // 3. Reset scale select to none so fretboard shows chord library first,
            //    then pick the first pentatonic minor scale for context
            if (libScaleSelect) {
                // Try to set to pentatonic_minor if available, otherwise leave current
                const hasPentatonic = Array.from(libScaleSelect.options).some(o => o.value === 'pentatonic_minor');
                libScaleSelect.value = hasPentatonic ? 'pentatonic_minor' : libScaleSelect.options[1]?.value || 'none';
            }

            // 4. Render library & scale
            renderChordLibrary();
            updateScaleDisplay();

            // 5. Scroll to fretboard
            const fretSection = document.querySelector('.fretboard-section') || document.querySelector('.fret-explorer');
            if (fretSection) fretSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Init the board
    initFretboard();
});
