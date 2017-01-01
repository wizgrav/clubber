clubber
========

#### Javascript music analysis library ####
Clubber is a library that analyzes the frequency data from an audio source and extracts the underlying rhythmic information. Instead of a linear distribution, frequency energies are collected in midi note bins which music theory suggest to be a better segregation for music audio. Several measurements are performed and a small collection of useful metrics are produced in a form suitable for use in webgl shaders, or in any other context. This simple flow provides a powerful framework for the rapid development of visualisations that react pleasantly to the audio.

[ClubberToy](http://wizgrav.github.io/clubber/) - A collection of several rewired shadertoys as a vjing tool. 

[Clubber Tool](http://wizgrav.github.io/clubber/tool) - Your true friend in this crazy world. Refer to it's section.

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

First we instantiate a Clubber object and have it listen to an audio element. When we need to process a fresh set of audio samples we call Clubber.update(), usually once per render iteration.

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

The energy per midi note will be contained in the Clubber.notes array. A mechanism for analysis is provided by the library called 'bands'. These are implemented as closures that, when called, will process the current note energies and update Float32Arrays | Arrays | THREE.VectorX objects. Their output data can be passed directly to webgl shaders as vecs. The data coming from both mechanisms are readily usable as modulators but they can also be aggregated through time for more elaborate transitions etc. 

Bands are defined as rectangular windows on the midi spectrum using the properties **from** - **to** to declare a horizontal range of midi notes(0-127) to watch and **low** - **high** properties for the vertical power thresholds within that window, expressed as midi velocities (0-127). The output measurements are always normalized floats(0-1).

The output can be customized with the **template** property. This accepts a string of digits or an array of indices to select the desired measurements among a collection of the following:

* ID - Description
* 
* 0 - Strongest power note index
* 1 - Power weighted note average
* 2 - Power of the strongest note
* 3 - Average energy of active notes
* 4 - Weakest power note index
* 5 - Power weighted average midi index
* 6 - Power weighted average octave index 
* 7 - Ratio of spectrum window area covered
* 8 - Adaptive low threshold relative to absolute limits 
* 9 - Adaptive high threshold relative to absolute limits

If a **template** is not specified it defaults is **0123**, the first four measurements from the collection. The length of the string | array provided to template defines the size of the resulting vector and the internally used Float32Array. 

Bands also provide exponential smoothing for their output values which is controlled by the **smooth** option. This takes a 4 element array of normalized floats as factors for the smoothing of each respective measurement. A value of 1 means instant change and as it goes down to 0 it smooths more. 

A negative value for an element activates the snap mode. In this mode when the energy rises it gets smoothed by the factor define as the **snap** option which should normally be fast (default is 0.33 which is pretty fast) and when falling, it instead uses the abs(value) as the factor. This comes in handy for eg kicks which you would want to rise fast but slowly fade down, so you would use something like -0.1 or something like that. There's a single **snap** factor for all measurements of the object and it can be overriden in the options.

```javascript
var band = clubber.band({ // clubber here is the instantiated object from above
    template: "0123", // alternately [0, 1, 2, 3]
    from: 1, // minimum midi note to watch
    to: 128 // maximum midi note, up to 160
    low: 64, // Low velocity/power threshold
    high: 128, // High velocity/power threshold
    smooth: [0.1, 0.1, 0.1, 0.1], // Exponential smoothing factors for the values
    adapt: [1, 1, 1, 1], // Adaptive bounds setup
    snap: 0.33
});

clubber.update(); // This should happen first for frequency data to be current for all bands

// Calling the closures updates a provided object which can be Float32Array|Array|Three.VectorX
var bounds = band(vec4Object); // Returns object with from to low high bounds of the adapted window

```

The **adapt** option enables the adaptive mode for the low and high thresholds. In this mode the **low** and **high** options become the absolute limits for the thresholds but the actual vertical range of the window constantly adjusts within these limits by following the average energy of the band/rect. The option is defined as an array of normalized floats with the 4 following elements:

* the ratio of max height of the band/rect below the average energy for the low threshold
* a smoothing factor for the lower threshold
* the ratio of max height of the band/rect above the average energy for the high threshold 
* a smoothing factor for the upper threshold

max height would be the high - low options, ie the absolute limits for the thresholds.

The smoothing factors work similarly to the ones for the measurements, including the snap mode.

To get an idea of how it works in practice [click here](http://wizgrav.github.io/clubber/tool/?a1=0.33,0.1,0.33,0.1)  and select the spectrum mode(click the views button twice). The green band will be adaptive. Check the Clubber Tool section for details on how to configure and use the utility.

### Tips ###

Usually one would instantiate several bands, each covering a range of midi notes, low mid high etc, calling them every render iteration and passing the returned arrays/vec4s as uniforms to modulate webgl shaders. Other uses are equally easy, just pick and use elements from the arrays as needed.

By creatively combining the results of the analysis, the rhythmic patterns in the music will emerge in the graphics as well. Simple combinations could be finding the min/max between adjacent band notes/energies or multiply/sub them.

A strategy that works well would be to interpret the analysis results as vectors and operate on these. For instance map a bands strongest note on the x axis, the average note on the Y axis and calculate the length of the vector. You can go further and combine notes with powers and elements from different bands/rects. 

And since we're dealing with vectors why not just measure their distances or even dot them and see what comes out(Good stuff :) These combinations are all plausible, you can check some of them in the glsl demos that come with the source. You can also experiment on your own and design your modulators in this [very helpful tool](http://wizgrav.github.io/clubber/tool).

You can also tune smoothing via Clubber.smoothing which is a shortcut for the internal analyser's smoothingTimeConstant(the web audio default is 0.8 and is quite sensitive).

### Clubber Tool ###

This web app is meant to assist in the design of modulators. 4 objects are provided by default and accessed in a shader via the iMusic[0-3] vec4 uniforms(bands). The 3 text input fields allow writing glsl expressions to play with the measurements and inspect the resulting modulations in the form of RGB shapes. The views button cycles through two extra views, one with all the measurements from the 4 objects and also a midi spectrogram where you can see the current bounds for each band/rect(useful for live inspection of the adapt option).

You can change band configuration through the form or by passing query arguments to the tool url. Arguments should be in the form of a single letter and a number 0-3 to indicate iMusic[0-3] respectively. So for example ?t0=4567 would override the template of iMusic[0]. ?r0=1,24,32,96 would change the bounds (from, to, low, high). ?s0=0.2,0.1,0.2,0.2 would override the smooth option array. ?a0=0.33,0.1,1,1 would override the adapt option array.

The current soundcloud track, glsl field values and band config will be persisted among page reloads. If you want to reset to the defaults you can pass a **?reset=1** argument to the url.

If a shadertoy hash/url is provided, it will be fetched and rendered as well, potentially interacting with modulators as well. Not all shadertoys work yet and those that do must have a special define block to allow band wiring:

```cpp

#ifndef CLUBBER
vec4 iMusic[4];
const float iTransition = 1.0;
#define CLUBBER_R 0.0
#define CLUBBER_G 0.0
#define CLUBBER_B 0.0
#define CLUBBER_A 0.0
#endif

```

When in the context of clubber, The CLUBBER_X defines will have the expressions from the tool's fields. These must evaluate to a single float each, ideally 0-1. In the shadertoy editor, you can place these in the shader wherever they make sense as modulators. In the original shader you should make sure that whenever the define is placed, it gets scaled to the desired range from 0-1 and place some appropriate defaults in the CLUBBER_X defines on the shader to make it look how you want when in the static shadertoy context,

At any point you can copy the address of the **State** link to get a full snapshot of the current state of the tool contained in a long url. Band configs, glsl snippets, current track and shader are all included in the state so this url is essentially a self contained music visualization that can be easily stored and shared. A browser short urling extension would come very handy here.

### Clubber in the wild ###

[Waveform demo by spleen](https://github.com/spleennooname/webg-clubber-demo) 

[AFRAME component & demo by wizgrav](http://wizgrav.github.io/aframe-clubber/demo/)

[Dancing Torus by jiin](http://dancing-torus.s3-website-us-east-1.amazonaws.com/)

[Dancing Torus by jiin - wizgrav's remix](https://wizgrav.github.io/dancing-torus)


## License

This program is free software and is distributed under an [MIT License](LICENSE).
