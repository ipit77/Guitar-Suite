/**
 * ChromaChord - Music Theory Engine
 * A utility to parse chords, detect keys, recommend progressions, 
 * identify appropriate scales, and deduce emotional moods.
 */

// Chord definitions and scales
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Major scale intervals: W, W, H, W, W, W, H  (2, 2, 1, 2, 2, 2, 1)
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
// Minor scale intervals: W, H, W, W, H, W, W  (2, 1, 2, 2, 1, 2, 2)
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const SCALES = {
    major: { name: 'Dur (Ionisch)', intervals: [0, 2, 4, 5, 7, 9, 11] },
    minor: { name: 'Moll (Äolisch)', intervals: [0, 2, 3, 5, 7, 8, 10] },
    harmonic_minor: { name: 'Harmonisch Moll', intervals: [0, 2, 3, 5, 7, 8, 11] },
    pentatonic_major: { name: 'Dur-Pentatonik', intervals: [0, 2, 4, 7, 9] },
    pentatonic_minor: { name: 'Moll-Pentatonik', intervals: [0, 3, 5, 7, 10] },
    blues: { name: 'Blues Skala', intervals: [0, 3, 5, 6, 7, 10] },
    dorian: { name: 'Dorisch', intervals: [0, 2, 3, 5, 7, 9, 10] },
    phrygian: { name: 'Phrygisch', intervals: [0, 1, 3, 5, 7, 8, 10] },
    lydian: { name: 'Lydisch', intervals: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian: { name: 'Mixolydisch', intervals: [0, 2, 4, 5, 7, 9, 10] },
    locrian: { name: 'Lokrisch', intervals: [0, 1, 3, 5, 6, 8, 10] },
};

function getScaleNotes(root, intervals, useFlats) {
    if (!root || root === 'Unbekannt') return "";
    const notesArray = useFlats ? NOTES_FLAT : NOTES;
    let rootIndex = notesArray.indexOf(root);
    if (rootIndex === -1) {
        rootIndex = (useFlats ? NOTES : NOTES_FLAT).indexOf(root);
        if (rootIndex === -1) return "";
    }
    return intervals.map(interval => notesArray[(rootIndex + interval) % 12]).join(' - ');
}

/**
 * Normalizes an input string to an array of chords
 */
function parseChords(input) {
    if (!input || input.trim() === '') return [];
    
    // Split by comma, dash, or whitespace, and filter out empties
    const rawTokens = input.split(/[\s,\-]+/);
    
    return rawTokens.map(token => {
        // Basic normalization (e.g., Cminor -> Cm)
        let chord = token.trim();
        // Capitalize first letter
        chord = chord.charAt(0).toUpperCase() + chord.slice(1);
        return chord;
    }).filter(c => c.length > 0);
}

/**
 * Extracts root note and quality (major, minor, dom, dim, aug, etc.) from a chord string
 */
function analyzeChordParts(chord) {
    // Regex for matching the Root note (A-G, optional # or b) and the Rest (quality/extensions)
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return null;
    
    const root = match[1];
    let qualityStr = match[2];
    
    // Determine basic quality
    let quality = 'major'; // Default
    if (qualityStr.startsWith('m') && !qualityStr.startsWith('maj')) quality = 'minor';
    if (qualityStr.includes('dim') || qualityStr === '°') quality = 'diminished';
    if (qualityStr.includes('aug') || qualityStr === '+') quality = 'augmented';
    if (qualityStr.includes('sus')) quality = 'suspended';

    return { root, quality, fullQualityStr: qualityStr };
}

/**
 * Naive Key detection based on finding the diatonic scale that contains the most chords
 */
function detectKey(chords) {
    if (chords.length === 0) return { key: 'Unbekannt', confidence: 0, type: 'major' };

    let majorCount = 0;
    let minorCount = 0;
    
    const roots = [];
    
    chords.forEach(chord => {
        const parts = analyzeChordParts(chord);
        if (parts) {
            roots.push(parts.root);
            if (parts.quality === 'major') majorCount++;
            if (parts.quality === 'minor') minorCount++;
        }
    });

    if (roots.length === 0) return { key: 'Unbekannt', confidence: 0, type: 'major' };

    // Very simplified heuristic: 
    // The first or last chord is often the tonic.
    // We'll guess the tonic is the first chord for this simplified engine.
    const firstChordParts = analyzeChordParts(chords[0]);
    const lastChordParts = analyzeChordParts(chords[chords.length - 1]);
    
    let likelyTonic = firstChordParts ? firstChordParts : analyzeChordParts('C');
    
    // If it ends on a chord, maybe that's the resolution (tonic)
    if (lastChordParts && lastChordParts.root !== likelyTonic.root) {
        // If it's a V-I, or similar, but let's stick to first chord as primary guess
        // unless last chord feels more robust (complex logic omitted for brevity)
    }

    // Determine if the overall progression feels major or minor
    let domType = likelyTonic.quality === 'minor' ? 'minor' : 'major';
    
    // If it starts with major but has lots of minor, it could be a vi... but let's trust the root's quality
    
    return {
        key: `${likelyTonic.root} ${domType === 'major' ? 'Dur' : 'Moll'}`,
        root: likelyTonic.root,
        type: domType,
        baseChord: chords[0]
    };
}

/**
 * Suggests alternative chords (substitutions/superimpositions) for the last chord
 */
function recommendAlternativeChords(keyInfo, lastChord, targetMood = 'auto') {
    const { root, type } = keyInfo;
    
    if (root === 'Unbekannt') return ['Cmaj7', 'G7', 'Am9'];

    const parts = analyzeChordParts(lastChord) || { root: 'C', quality: 'major' };
    const base = parts.root;
    
    let alternatives = [];
    
    if (targetMood === 'auto') {
        // Allgemeine Substitutionen (z.B. Moll-Parallele, Terzverwandtschaft)
        if (parts.quality === 'major') {
            alternatives = [`${base}maj7`, `${base}add9`, `${base}6`]; 
            // Tonikaparallele als Superimposition
        } else if (parts.quality === 'minor') {
            alternatives = [`${base}m7`, `${base}m11`, `${base}m(maj7)`];
        } else {
            alternatives = [`${base}7b9`, `${base}dim`];
        }
    } else if (targetMood === 'happy') {
        // Fröhlich: Helle Erweiterungen
        if (parts.quality === 'minor') {
            alternatives = [`${base}m7 (Dorian)`, `${base}m9`]; // Hellerer Moll-Klang
        } else {
            alternatives = [`${base}maj9`, `${base}6/9`, `${base}add9`];
        }
    } else if (targetMood === 'sad') {
        // Melancholisch: Tiefe Erweiterungen, Moll-Färbung
        if (parts.quality === 'major') {
            alternatives = [`${base}maj7#11`, `${base} (Drop-2 Voicing)`];
        } else {
            alternatives = [`${base}m9`, `${base}m11`, `${base}m(add9)`];
        }
    } else if (targetMood === 'tense') {
        // Spannend: Tritonus-Substitution oder Alteriert
        alternatives = [`${base}7#9`, `${base}7alt`, `${base}dim7`, `Tritonus-Sub`];
    } else if (targetMood === 'floating') {
        // Schwebend: Sus-Akkorde und offene Quarten
        alternatives = [`${base}sus2`, `${base}sus4`, `${base}7sus4`, `Quartal Voicing`];
    }
    
    // Remove potential duplicates and limit to 4
    return [...new Set(alternatives)].slice(0, 4);
}

/**
 * Suggests solo scales for the progression
 */
function recommendScales(keyInfo, chords) {
    const { root, type } = keyInfo;
    if (root === 'Unbekannt') {
        return [
            { name: 'Pentatonik', notes: 'Abhängig vom Akkord' },
            { name: 'Chromatisch', notes: 'Alle 12 Töne' }
        ];
    }

    const flatRoots = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'd', 'g', 'c', 'f', 'bb', 'eb'];
    const useFlats = root.includes('b') || flatRoots.includes(root);

    const PENTATONIC_MAJOR = [0, 2, 4, 7, 9];
    const PENTATONIC_MINOR = [0, 3, 5, 7, 10];
    const IONIAN = [0, 2, 4, 5, 7, 9, 11];
    const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
    const BLUES = [0, 3, 5, 6, 7, 10];
    const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

    const scales = [];
    
    if (type === 'major') {
        scales.push({ name: `${root} Dur-Pentatonik`, notes: getScaleNotes(root, PENTATONIC_MAJOR, useFlats), intervals: PENTATONIC_MAJOR, root: root });
        scales.push({ name: `${root} Ionisch (Dur)`, notes: getScaleNotes(root, IONIAN, useFlats), intervals: IONIAN, root: root });
        
        // Relative minor pentatonic
        const notesArray = useFlats ? NOTES_FLAT : NOTES;
        let rIdx = notesArray.indexOf(root);
        if (rIdx === -1) rIdx = (useFlats ? NOTES : NOTES_FLAT).indexOf(root);
        const relMinorRoot = rIdx !== -1 ? notesArray[(rIdx + 9) % 12] : '';
        
        if (relMinorRoot) {
            scales.push({ name: `${relMinorRoot} Moll-Pentatonik (Parallele)`, notes: getScaleNotes(relMinorRoot, PENTATONIC_MINOR, useFlats), intervals: PENTATONIC_MINOR, root: relMinorRoot }); 
        } else {
            scales.push({ name: 'Zugehörige Moll-Pentatonik', notes: '', intervals: null, root: null });
        }
    } else {
        scales.push({ name: `${root} Moll-Pentatonik`, notes: getScaleNotes(root, PENTATONIC_MINOR, useFlats), intervals: PENTATONIC_MINOR, root: root });
        scales.push({ name: `${root} Äolisch (Natürlich Moll)`, notes: getScaleNotes(root, AEOLIAN, useFlats), intervals: AEOLIAN, root: root });
        scales.push({ name: `${root} Blues-Skala`, notes: getScaleNotes(root, BLUES, useFlats), intervals: BLUES, root: root });
    }

    // Check for advanced chords indicating other scales
    const hasDom7 = chords.some(c => c.includes('7') && !c.includes('maj7') && !c.includes('m7'));
    if (hasDom7) {
        scales.push({ name: `${root} Mixolydisch`, notes: getScaleNotes(root, MIXOLYDIAN, useFlats), intervals: MIXOLYDIAN, root: root });
    }

    return scales;
}

/**
 * Analyzes mood based on chord qualities
 */
function analyzeMood(chords, type) {
    let majorC = 0, minorC = 0, dimC = 0, augC = 0, susC = 0;
    
    chords.forEach(chord => {
        const parts = analyzeChordParts(chord);
        if (!parts) return;
        if (parts.quality === 'major') majorC++;
        if (parts.quality === 'minor') minorC++;
        if (parts.quality === 'diminished') dimC++;
        if (parts.quality === 'augmented') augC++;
        if (parts.quality === 'suspended') susC++;
    });

    const total = chords.length;
    let mood = "Neutral";
    let explanation = "Die Progression ist ausgeglichen.";

    if (total === 0) return { mood: "-", explanation: "" };

    if (dimC > 0) {
        mood = "Spannend / Düster";
        explanation = "Verminderte (dim) Akkorde erzeugen starke Dissonanzen und den Drang nach Auflösung, was die Stimmung spannend oder gar bedrohlich macht.";
    } else if (susC > 0 && majorC > 0) {
        mood = "Schwebend / Hoffnungsvoll";
        explanation = "Suspended (sus) Akkorde lassen das Tongeschlecht (Dur/Moll) offen und erzeugen ein schwebendes, erwartungsvolles Gefühl.";
    } else if (majorC / total >= 0.7) {
        mood = "Fröhlich / Erhebend";
        explanation = "Ein starker Fokus auf Dur-Akkorde vermittelt typischerweise positive, helle und erhebende Emotionen.";
    } else if (minorC / total >= 0.7) {
        mood = "Melancholisch / Nachdenklich";
        explanation = "Die Dominanz von Moll-Akkorden verleiht der Progression eine melancholische, tiefe oder traurige Färbung.";
    } else if (type === 'major') {
        mood = "Positiv mit Tiefe";
        explanation = "Die Basis ist Dur (positiv), wird aber durch Moll-Akkorde emotional aufgelockert und erhält Tiefe.";
    } else {
        mood = "Ernsthaft / Treibend";
        explanation = "Eine Moll-Basis mit Dur-Einwürfen erzeugt oft epischere, treibende oder ernsthaftere Stimmungen.";
    }

    return { mood, explanation };
}

/**
 * Helper to get raw notes from a chord symbol
 */
function getChordNotes(chord) {
    const parts = analyzeChordParts(chord);
    if (!parts) return [];
    
    const rootIdx = (NOTES.indexOf(parts.root) !== -1) ? NOTES.indexOf(parts.root) : NOTES_FLAT.indexOf(parts.root);
    if (rootIdx === -1) return [];

    let intervals = [0, 4, 7]; // default major
    
    if (parts.fullQualityStr.includes('dim')) {
        if (parts.fullQualityStr.includes('7')) intervals = [0, 3, 6, 9];
        else intervals = [0, 3, 6];
    } else if (parts.fullQualityStr.includes('aug') || parts.fullQualityStr.includes('+')) {
        intervals = [0, 4, 8];
    } else if (parts.fullQualityStr.includes('sus4')) {
        intervals = [0, 5, 7];
    } else if (parts.fullQualityStr.includes('sus2')) {
        intervals = [0, 2, 7];
    } else if (parts.quality === 'minor') {
        if (parts.fullQualityStr.includes('maj7')) intervals = [0, 3, 7, 11];
        else if (parts.fullQualityStr.includes('7b5') || parts.fullQualityStr.includes('m7b5')) intervals = [0, 3, 6, 10];
        else if (parts.fullQualityStr.includes('7')) intervals = [0, 3, 7, 10];
        else if (parts.fullQualityStr.includes('6')) intervals = [0, 3, 7, 9];
        else if (parts.fullQualityStr.includes('add9') || parts.fullQualityStr.includes('9')) intervals = [0, 3, 7, 14];
        else intervals = [0, 3, 7];
    } else {
        if (parts.fullQualityStr.includes('maj7')) intervals = [0, 4, 7, 11];
        else if (parts.fullQualityStr.includes('7')) intervals = [0, 4, 7, 10];
        else if (parts.fullQualityStr.includes('6')) intervals = [0, 4, 7, 9];
        else if (parts.fullQualityStr.includes('add9') || parts.fullQualityStr.includes('9')) intervals = [0, 4, 7, 14];
    }

    let notes = [];
    for (let i = 0; i < intervals.length; i++) {
        let normalizedPitch = (rootIdx + intervals[i]) % 12;
        notes.push(NOTES[normalizedPitch]);
    }
    
    if (chord.includes('/')) {
        const bassNote = chord.split('/')[1];
        notes.unshift(bassNote);
    }
    
    return notes;
}

/**
 * Identifies a chord from an array of pitch integers.
 * Pitches are assumed to be semitones where 0 = C.
 */
function identifyChordFromNotes(pitches) {
    if (!pitches || pitches.length === 0) return "-";
    if (pitches.length === 1) return NOTES[pitches[0] % 12] + " (Note)";
    if (pitches.length === 2) return NOTES[pitches[0] % 12] + "5 (Powerchord)";

    // Sort pitches to find bass note
    pitches.sort((a, b) => a - b);
    
    // Get unique pitch classes
    const pitchClasses = [...new Set(pitches.map(p => p % 12))];
    if (pitchClasses.length < 3) return NOTES[pitches[0] % 12] + "5 (Powerchord)";

    // Define common chord structures (intervals in semitones from root)
    const CHORD_DICT = [
        { name: "", intervals: [0, 4, 7] },         // Major
        { name: "m", intervals: [0, 3, 7] },        // Minor
        { name: "dim", intervals: [0, 3, 6] },      // Diminished
        { name: "aug", intervals: [0, 4, 8] },      // Augmented
        { name: "sus4", intervals: [0, 5, 7] },     // Sus4
        { name: "sus2", intervals: [0, 2, 7] },     // Sus2
        { name: "7", intervals: [0, 4, 7, 10] },    // Dominant 7
        { name: "maj7", intervals: [0, 4, 7, 11] }, // Major 7
        { name: "m7", intervals: [0, 3, 7, 10] },   // Minor 7
        { name: "m7b5", intervals: [0, 3, 6, 10] }, // Half-diminished
        { name: "dim7", intervals: [0, 3, 6, 9] },  // Diminished 7
        { name: "mM7", intervals: [0, 3, 7, 11] },  // Minor Major 7
        { name: "6", intervals: [0, 4, 7, 9] },     // Major 6
        { name: "m6", intervals: [0, 3, 7, 9] },    // Minor 6
        { name: "add9", intervals: [0, 4, 7, 14] }, // Add 9
        { name: "m(add9)", intervals: [0, 3, 7, 14] }
    ];

    let bestMatch = null;
    const bassClass = pitches[0] % 12;

    // Try each pitch class as the root note
    for (let i = 0; i < pitchClasses.length; i++) {
        const root = pitchClasses[i];
        
        // Calculate intervals of all notes relative to this root
        let intervals = pitchClasses.map(p => (p - root + 12) % 12);
        
        // Special case for 9ths: if we have a 2 (which is 9 % 12) and we have a 3 or 4, it's an add9 or 9.
        if (intervals.includes(2) && (intervals.includes(3) || intervals.includes(4))) {
           intervals[intervals.indexOf(2)] = 14;
        }

        intervals.sort((a, b) => a - b);
        const intervalsStr = intervals.join(',');

        for (const chord of CHORD_DICT) {
            if (chord.intervals.join(',') === intervalsStr) {
                // We found a match!
                let chordName = NOTES[root] + chord.name;
                
                // If the bass note is not the root, it's an inversion
                if (root !== bassClass) {
                    chordName += "/" + NOTES[bassClass];
                }
                
                // Prefer matches where the root is the bass note
                if (!bestMatch || root === bassClass) {
                    bestMatch = chordName;
                }
            }
        }
    }

    if (bestMatch) return bestMatch;
    
    // If no exact match, fallback to just showing the notes
    const noteNames = pitchClasses.map(p => NOTES[p]);
    return noteNames.join(', ') + " (?)";
}

/**
 * Generates an array of pitch strings (e.g. ['C3', 'E3', 'G3']) for playback
 * based on the chord name.
 */
function getChordNotesForAudio(chord, octaveOffset = 0) {
    const parts = analyzeChordParts(chord);
    if (!parts) return [];
    
    const rootIdx = (NOTES.indexOf(parts.root) !== -1) ? NOTES.indexOf(parts.root) : NOTES_FLAT.indexOf(parts.root);
    if (rootIdx === -1) return [];

    // Define basic intervals based on quality
    let intervals = [0, 4, 7]; // default major
    
    if (parts.fullQualityStr.includes('dim')) {
        if (parts.fullQualityStr.includes('7')) intervals = [0, 3, 6, 9];
        else intervals = [0, 3, 6];
    } else if (parts.fullQualityStr.includes('aug') || parts.fullQualityStr.includes('+')) {
        intervals = [0, 4, 8];
    } else if (parts.fullQualityStr.includes('sus4')) {
        intervals = [0, 5, 7];
    } else if (parts.fullQualityStr.includes('sus2')) {
        intervals = [0, 2, 7];
    } else if (parts.quality === 'minor') {
        if (parts.fullQualityStr.includes('maj7')) intervals = [0, 3, 7, 11];
        else if (parts.fullQualityStr.includes('7b5') || parts.fullQualityStr.includes('m7b5')) intervals = [0, 3, 6, 10];
        else if (parts.fullQualityStr.includes('7')) intervals = [0, 3, 7, 10];
        else if (parts.fullQualityStr.includes('6')) intervals = [0, 3, 7, 9];
        else if (parts.fullQualityStr.includes('add9') || parts.fullQualityStr.includes('9')) intervals = [0, 3, 7, 14];
        else intervals = [0, 3, 7];
    } else {
        // Major variants
        if (parts.fullQualityStr.includes('maj7')) intervals = [0, 4, 7, 11];
        else if (parts.fullQualityStr.includes('7')) intervals = [0, 4, 7, 10]; // Dominant 7
        else if (parts.fullQualityStr.includes('6')) intervals = [0, 4, 7, 9];
        else if (parts.fullQualityStr.includes('add9') || parts.fullQualityStr.includes('9')) intervals = [0, 4, 7, 14];
    }

    // Assign octaves. Root is usually in octave 3 or 4.
    // To make it sound like a guitar/piano voicing, we'll just stack them.
    let baseOctave = 3 + (parseInt(octaveOffset) || 0);
    let notes = [];
    
    for (let i = 0; i < intervals.length; i++) {
        let notePitch = rootIdx + intervals[i];
        let octaveOffset = Math.floor(notePitch / 12);
        let normalizedPitch = notePitch % 12;
        let noteName = NOTES[normalizedPitch];
        notes.push(`${noteName}${baseOctave + octaveOffset}`);
    }
    
    // Check if there is an inversion (slash chord)
    if (chord.includes('/')) {
        const bassNote = chord.split('/')[1];
        const bassIdx = (NOTES.indexOf(bassNote) !== -1) ? NOTES.indexOf(bassNote) : NOTES_FLAT.indexOf(bassNote);
        if (bassIdx !== -1) {
             let noteName = NOTES[bassIdx];
             // Add bass note an octave lower
             notes.unshift(`${noteName}${baseOctave - 1}`);
        }
    } else {
         // Double the root in the bass for a fuller sound
         notes.unshift(`${NOTES[rootIdx]}${baseOctave - 1}`);
    }

    return notes;
}

/**
 * Returns available scales for the scale dropdown.
 */
function getAvailableScales() {
    return SCALES;
}

/**
 * Generates a list of common chords for the chord library grid given a root note.
 */
function getLibraryChords(root) {
    // A list of common suffixes
    const suffixes = ['', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'dim', 'aug', 'm7b5'];
    return suffixes.map(suffix => root + suffix);
}

// Export functions for browser environment
window.MusicTheory = {
    parseChords,
    detectKey,
    recommendAlternativeChords,
    recommendScales,
    analyzeMood,
    identifyChordFromNotes,
    getChordNotesForAudio,
    getChordNotes,
    getAvailableScales,
    getLibraryChords
};
