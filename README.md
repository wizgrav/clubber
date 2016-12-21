clubber
========

#### Javascript music analysis library ####
Clubber is a library that analyzes the frequency data from an audio source and extracts the underlying rhythmic information. Instead of a linear distribution, frequency energies are collected in midi note bins which music theory suggest to be a better segregation for music audio. Several measurements are performed and a small collection of useful metrics are produced in a form suitable for use in webgl shaders, or in any other context. This simple flow provides a powerful framework which enables the rapid development of visualisations that sync pleasantly with music.

[ClubberToy demo](http://wizgrav.github.io/clubber/) - [Rhythm debugger](http://wizgrav.github.io/clubber/debug)

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
    size: 2048, // Samples for the fourier transform. The produced linear frequency bins will be 1/2 that.
    mute: false // whether the audio source should be connected to web audio context destination.
});

// Specify the audio source to analyse. Can be an audio/video element or an instance of AudioNode.
clubber.listen(audioSource); 

clubber.update(currentTime); // currentTime is optional and specified in ms.
console.log(clubber.notes); // array containing the audio energy per midi note.
```

The energy per midi note will be contained in the Clubber.notes array. Two mechanisms are provided by the library itself called 'bands' and 'rects'. Both are implemented as closures that when called, will process the current note energies and update a Float32Array of 4 elements. Their output can be passed directly to webgl shaders as vec4s. The data coming from both mechanisms are readily usable as modulators but they can also be aggregated through time for more elaborate transitions etc. 

Both type of processors are defined as rectangular windows on the midi spectrum using the properties "from" - "to" to declare a range of midi notes to watch and "low" - "high" properties for the respective energy thresholds, expressed as midi velocities (0-127). The two type of objects mainly differ on the output metrics they provide which are always normalized floats(0-1).

Bands deal mainly with notes and produce these metrics: 

* the strongest note (where the highest energy is) (x)
* the power weighted average of all notes (y)
* the power of the strongest note (z)
* the average energy of all active notes (w)

Rects do more straight forward measurements on the midi spectrum and produce: 

* the average midi bin where activity took place (x)
* the average midi bin again, but weighted by power (y)
* the ratio of active vs inactive bins in the window (z)
* the area covered by note power relative to the window size (w)

Note that if a rect would cover just a single octave of midi notes, it's "y" element would be identical to a band's "y" covering the same range. Bands don't really take octaves into acount as it's expected that the developer will separate bass from tremble by defining several bands. Rects provide some insight on bass vs treble within the same window because they count bin indexes normally where as bands mod(%) them with 12 to get notes. 

These two object types provide 8 of the most meaningful metrics as discovered in practice. They are split for convenience(grouping them in vec4s). Both types provide exponential smoothing for the values which is controlled by the "smooth" option when instantiating them. This takes a 4 element array of normalized floats as factors for the smoothing of each respective measurement. A value of 1 means instant change and as it goes down to 0 it smooths more. A negative value for an element activates the snap mode. In this mode when the energy rises it gets smoothed by the factor define as the "snap" option which should normally be fast (default is 0.33 which is pretty fast) and when falling, it instead uses the abs(value) as the factor. This comes in handy for eg kicks which you would want to rise fast but slowly fade down, so you would use something like -0.1 or something like that. There's a single "snap" factor for all measurements of the object and it can be overriden in the options.

```javascript
// clubber here is the instantiated object from above
var band = clubber.band({ // or rect
    from: 1, // minimum midi note to take into account
    to: 128 // maximum midi note, up to 160.
    low: 64, // Low velocity/power threshold
    high: 128, // High velocity/power threshold
    smooth: [0.1, 0.1, 0.1, 0.1], // Exponential smoothing factors for each of the four returned values
    adapt: [1, 1, 1, 1], // Adaptive bounds setup
    snap: 0.33
});
clubber.update(); // This should happen first for frequency data to be current for all bands

// Calling the closures updates a provided object which can be Float32Array|Array|Three.Vector4|undefined
var bandArray = band(vec4Object); // The internally used Float32Array is also returned for convenience

var rectArray = band(vec4Object);

```


The "adapt" option enables the adaptive mode for the low and high thresholds. In this mode the "low" and "high" options become the absolute limits for the thresholds but the actual vertical range of the window constantly adjusts within these limits by following the average energy of the band/rect. The option is defined as an array of normalized floats with the 4 following elements:

* the ratio of max height of the band/rect to set the low threshold below the average energy
* a smoothing factor for the upper threshold
* the ratio of max height of the band/rect to set the high threshold above the average energy
* a smoothing factor for the upper threshold

max height would be the high - low options, ie the absolute limits for the thresholds.

The smoothing factors work similarly to the ones for the measurements, including the snap mode.

To get an idea of how it works in practice [click here](http://wizgrav.github.io/clubber/debug/?a1=0.33,0.1,0.33,0.1)  and select the spectrum debug mode(click the debug button twice). The green band will be adaptive. Check the rhythm debugger section for details on how to configure and use the utility.

### Tips ###

Usually one would instantiate several bands and/or rects, each covering a different range of midi notes, low mid high etc, calling them every render iteration and passing the returned arrays/vec4s as uniforms to modulate webgl shaders. Other uses are equally easy, just pick and use elements from the arrays as needed. 

By creatively combining the results of the analysis, the rhythmic patterns in the sound will emerge in the graphics as well. Simple combinations could be finding the min/max between adjacent band notes/energies or multiply them.

A strategy that works well would be to interpret the analysis results as vectors and operate on these. For instance map a bands strongest note on the x axis, the average note on the Y axis and calculate the length of the vector. You can go further and combine notes with powers and elements from different bands/rects. 

And since we're dealing with vectors why not just measure their distances or even dot them and see what comes out(Good stuff :) These combinations are all plausible, you can check some of them in the glsl demos that come with the source. You can also experiment on your own and design your modulators in the [very helpful rhythm debugger](http://wizgrav.github.io/clubber/debug).

You can also tune smoothing via Clubber.smoothing which is a shortcut for the internal analyser's smoothingTimeConstant(the web audio default is 0.8 but mind that it is quite sensitive).

### Rhythm debugger ###

This useful utility is meant to assist in the design of modulators. 4 objects are provided by default and accessed in a shader via the iMusic[0-3] vec4 uniforms. The 3 text input fields allow writing glsl oneliners to play with the measurements and inspect the resulting modulations in the form of RGB shapes. The debug button cycles through two extra views, one with all the measurements from the 4 objects and also a midi spectrogram where you can see the current bounds for each band/rect(useful for live inspection of the adapt option).

By default all objects are of type "band" but you can change that and all other parameters by passing query arguments to the debugger url. Arguments should be in the form of a single letter and a number 0-3 to indicate iMusic[0-3] respectively. So for example ?t0=rect would override the type of iMusic[0] and turn it into a rect instead. ?r0=1,24,32,96 would change the bounds (from, to, low, high). ?s0=0.2,0.1,0.2,0.2 would override the smooth option array. ?a0=0.33,0.1,1,1 would override the adapt option array. 

### Clubber in the wild ###

[Waveform demo by spleen](https://github.com/spleennooname/webg-clubber-demo) 

[AFRAME component & demo by wizgrav](http://wizgrav.github.io/aframe-clubber/demo/)

[Dancing Torus by jiin](http://dancing-torus.s3-website-us-east-1.amazonaws.com/)

[Dancing Torus by jiin - wizgrav's remix](https://wizgrav.github.io/dancing-torus)


## License

This program is free software and is distributed under an [MIT License](LICENSE).
