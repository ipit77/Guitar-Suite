const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('ChromaChord-Standalone.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
setTimeout(() => {
    const fretboard = dom.window.document.getElementById('interactive-fretboard');
    if (fretboard) {
        console.log("Fretboard innerHTML length:", fretboard.innerHTML.length);
        console.log("Fretboard children:", fretboard.children.length);
    } else {
        console.log("Fretboard NOT FOUND!");
    }
}, 1000);
