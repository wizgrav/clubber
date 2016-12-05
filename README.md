clubber
========

#### Javascript music analysis library ####
Clubber is a small library that analyzes the frequency data from an audio source and extracts rhythmic information. The processing takes the music key into account and outputs data in a form suitable for direct use in webgl shaders. It is a step above simple beat detection and allows for rapid creation of visualisations that sync pleasantly with the audio.

[ClubberToy demo](http://wizgrav.github.io/clubber/) 

### Usage ###

### Downloads

To embed this library in your project, include this file:

* [`clubber.min.js`](http://wizgrav.github.io/clubber/dist/clubber.min.js)

For the unminified version for local development (with source maps), include this file:

* [`clubber.js`](http://wizgrav.github.io/clubber/dist/clubber.js)

### npm

First install from npm:

```sh
npm install clubber
```

And in your Browserify/Webpack modules, simply require the module:

```js
require('clubber')
```

### Instructions ###

First we instantiate a Clubber object and have it listen to an audio element. When we need to process a fresh set of samples we call Clubber.update(), usually once per render iteration.

```javascript
var clubber = new Clubber({
    size: 2048, // Samples for the fourier transform. The produced frequency bins will be 1/2 that.
    mute: false // whether the audio source should be connected to web audio context destination.
});

// Specify the audio source to analyse. Can be an audio/video element or an instance of AudioNode.
clubber.listen(audioSource); 

clubber.update(currentTime); // currentTime is optional and specified in ms.
console.log(clubber.notes); // array containing the audio energy per midi note.
```

The energy per midi note will be contained in the Clubber.notes array but the library also provides built in analysis via a mechanism called 'bands'. These are defined as ranges of midi notes and implemented as closures that, when called, will process the note energies and update a Float32Array of 4 elements. These in turn can be passed directly to webgl shaders as vec4s. The data are already usable as modulators at this stage but they can also be aggregated through time for more elaborate transitions etc. 

The produced array elements are normalized floats(0-1) and represent: 

* the strongest note (where the highest energy is)
* the power weighted average of all notes
* the power of the strongest note 
* the average energy of all notes

The processing only takes into account notes which pass an adaptive threshold. You can tune that via Clubber.thresholdFactor which takes a value of 0-1. You can also tune via Clubber.smoothing which is a shortcut for the internal analyser's smoothingTimeConstant(default is 0.8 and is much more sensitive than thresholdFactor).

```javascript
// clubber here is the instantiated object from above
var band = clubber.band({
    from: 1, // minimum midi note to take into account
    to: 64 // maximum midi note, up to 160.
    smooth: [0.1, 0.1, 0.1, 0.1] // Exponential smoothing factors for each of the four returned values
});
clubber.update(); // This should happen first for data to be current for all bands

// Calling the closure updates an object which can be Float32Array|Array|Three.Vector4|undefined
var analysedArray = band(vec4); // The internal Float32Array is also returned for convenience
```

In practice one would instantiate several band closures each covering a different range of midi notes, low mid high etc, calling these every render iteration and passing the returned arrays/vec4s as uniforms in webgl shaders. By creatively combining the results of the analysis, the rhythmic patterns in the sound will emerge in the graphics as well. Check the demo's glsl code for reference. If you feel like sharing your demos, drop me a note and I'll include them here for reference. Now have fun spicing up your favorite rhythms with awesome visuals :)

### Clubber in the wild ###

[Waveform demo by spleen] (https://github.com/spleennooname/webg-clubber-demo) 

[AFRAME component & demo by wizgrav] (http://wizgrav.github.io/aframe-clubber/demo/)

[Dancing Torus by jiin] (http://dancing-torus.s3-website-us-east-1.amazonaws.com/)

## License

This program is free software and is distributed under an [MIT License](LICENSE).
