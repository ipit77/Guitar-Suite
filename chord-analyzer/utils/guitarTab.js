window.GuitarTab = (function() {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    const STRINGS = [
        { name: 'e', pitch: 28 }, // E4
        { name: 'B', pitch: 23 }, // B3
        { name: 'G', pitch: 19 }, // G3
        { name: 'D', pitch: 14 }, // D3
        { name: 'A', pitch: 9 },  // A2
        { name: 'E', pitch: 4 }   // E2
    ];

    const ROOT_PITCHES = { 4: 2, 5: 9, 6: 4 };

    const CHORD_SHAPES = {
        '': [
            { rootString: 5, shape: [-1, 0, 2, 2, 2, 0] }, // A form
            { rootString: 6, shape: [0, 2, 2, 1, 0, 0] },  // E form
            { rootString: 4, shape: [-1, -1, 0, 2, 3, 2] } // D form
        ],
        'm': [
            { rootString: 5, shape: [-1, 0, 2, 2, 1, 0] },
            { rootString: 6, shape: [0, 2, 2, 0, 0, 0] },
            { rootString: 4, shape: [-1, -1, 0, 2, 3, 1] }
        ],
        '7': [
            { rootString: 5, shape: [-1, 0, 2, 0, 2, 0] },
            { rootString: 6, shape: [0, 2, 0, 1, 0, 0] },
            { rootString: 4, shape: [-1, -1, 0, 2, 1, 2] }
        ],
        'm7': [
            { rootString: 5, shape: [-1, 0, 2, 0, 1, 0] },
            { rootString: 6, shape: [0, 2, 0, 0, 0, 0] },
            { rootString: 4, shape: [-1, -1, 0, 2, 1, 1] }
        ],
        'maj7': [
            { rootString: 5, shape: [-1, 0, 2, 1, 2, 0] },
            { rootString: 6, shape: [0, -1, 1, 1, 0, -1] }
        ],
        'sus2': [
            { rootString: 5, shape: [-1, 0, 2, 2, 0, 0] },
            { rootString: 4, shape: [-1, -1, 0, 2, 3, 0] }
        ],
        'sus4': [
            { rootString: 5, shape: [-1, 0, 2, 2, 3, 0] },
            { rootString: 6, shape: [0, 2, 2, 2, 0, 0] },
            { rootString: 4, shape: [-1, -1, 0, 2, 3, 3] }
        ],
        'dim': [
            { rootString: 5, shape: [-1, 0, 1, 2, 1, -1] }
        ],
        'dim7': [
            { rootString: 5, shape: [-1, 0, 1, 2, 1, 2] }
        ],
        'add9': [
            { rootString: 5, shape: [-1, 0, 2, 4, 2, 0] },
            { rootString: 6, shape: [0, 2, 4, 1, 0, 0] }
        ],
        '6': [
            { rootString: 5, shape: [-1, 0, 2, 2, 2, 2] },
            { rootString: 6, shape: [0, 2, 2, 1, 2, 0] }
        ],
        '9': [
            { rootString: 5, shape: [-1, 0, 2, 0, 0, 2] }
        ]
    };

    function parseRoot(root) {
        let idx = NOTES.indexOf(root);
        if (idx === -1) idx = FLATS.indexOf(root);
        return idx;
    }

    return {
        getChordTab: function(chordName) {
            // Clean up name like Cmaj7 -> root C, quality maj7
            const match = chordName.match(/^([A-G][#b]?)(.*)$/);
            if (!match) return null;
            
            let root = match[1];
            let qualityStr = match[2].trim();
            qualityStr = qualityStr.replace(/\s+/g, ''); // C maj7 -> Cmaj7
            qualityStr = qualityStr.split('/')[0]; // Remove bass notes for tab logic simplicity

            if (qualityStr === 'maj' || qualityStr === 'M') qualityStr = '';
            if (qualityStr === 'min') qualityStr = 'm';

            let shapes = CHORD_SHAPES[qualityStr];
            if (!shapes) {
                if (qualityStr.includes('m') && !qualityStr.includes('maj')) shapes = CHORD_SHAPES['m'];
                else shapes = CHORD_SHAPES[''];
            }

            const rootIdx = parseRoot(root);
            if (rootIdx === -1) return null;

            let bestTab = null;
            let minFretScore = 99;

            shapes.forEach(sh => {
                let rPitch = ROOT_PITCHES[sh.rootString];
                let fretOffset = (rootIdx - rPitch + 12) % 12;
                
                // Prefer minimal offset, but 0 is perfect.
                let actualShape = sh.shape.map(f => {
                    if (f === -1) return 'x';
                    return f + fretOffset;
                });
                
                let highest = Math.max(...actualShape.filter(x => x !== 'x'));
                if (fretOffset < minFretScore && highest <= 14) {
                    minFretScore = fretOffset;
                    bestTab = actualShape;
                }
            });

            if (!bestTab) return null;

            let lines = [];
            for(let i=0; i<6; i++) {
                let note = bestTab[5 - i]; // Reverse because STRINGS goes high E to low E
                let fStr = note.toString();
                if (fStr.length === 1) fStr = '-' + fStr + '-';
                else if (fStr.length === 2) fStr = fStr + '-';
                lines.push(`${STRINGS[i].name} |-${fStr}-|`);
            }

            return `<pre class="tab-block chord-tab">\n${lines.join('\n')}\n</pre>`;
        },

        getScaleTab: function(root, scaleIntervals) {
            const rootIdx = parseRoot(root);
            if (rootIdx === -1) return null;

            const scalePitches = scaleIntervals.map(i => (rootIdx + i) % 12);
            let startFret = (rootIdx - 4 + 12) % 12;
            if (startFret === 0) startFret = 12; // Start scales at 12 instead of 0 if E root to have playable boxes, or 0 is fine. 0 is fine for pentatonics.
            if (['E', 'F', 'F#', 'G'].includes(root)) {
                startFret = (rootIdx - 4 + 12) % 12;
                if (startFret === 0) startFret = 0; // open E pentatonic is a classic
            }

            const playableNotes = [];
            for (let sIdx = 5; sIdx >= 0; sIdx--) {
                for (let fret = startFret; fret <= startFret + 4; fret++) {
                    const pitch = (STRINGS[sIdx].pitch + fret) % 12;
                    if (scalePitches.includes(pitch)) {
                        playableNotes.push({ sIdx, fret, absPitch: STRINGS[sIdx].pitch + fret });
                    }
                }
            }
            playableNotes.sort((a, b) => a.absPitch - b.absPitch);

            let lines = STRINGS.map(s => `${s.name} |`);
            playableNotes.forEach(note => {
                for (let sIdx = 0; sIdx < STRINGS.length; sIdx++) {
                    if (sIdx === note.sIdx) {
                        lines[sIdx] += `-${note.fret}-`;
                    } else {
                        lines[sIdx] += note.fret >= 10 ? '----' : '---';
                    }
                }
            });

            return `<pre class="tab-block scale-tab">\n${lines.join('\n')}\n</pre>`;
        }
    };
})();
