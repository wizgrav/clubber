clubber
========

![Clubber tool screenshot](https://wizgrav.github.io/clubber/screen.png)

This lib analyzes the frequency data from audio sources and extracts the underlying rhythmic information. The linear frequency energies are converted into midi notes which music theory suggests to be a better segregation for music audio. 

A set of meaningful measurements are produced in a form suitable for direct use in webgl shaders, or any other context. This simple flow provides a powerful framework for the rapid development of awesome audio reactive visualisations.

[A short introduction to the music vectorization technique on Medium.com](https://medium.com/@wizgrav/music-reactive-visualizations-924df006f2ae#.6z10i27c1)

[ClubberToy](http://wizgrav.github.io/clubber/) - A collection of several rewired shadertoys as a vjing tool(Currently getting refactored). 

[Clubber Tool](http://wizgrav.github.io/clubber/tool) - A web app for making awesome audio reactive visualizations. It's also a first class tool for music analysis and, probably, the most advanced sidechaining mechanism you could hope for.

[Check the documentation for the tool](https://github.com/wizgrav/clubber/tool)

Some example patches for your audiovisual enjoyment: 

[Imperial Sea]()

Older but still good:
[Sea, Sun & Zorba](https://goo.gl/7tDFmr), [Cubes & Roses](https://goo.gl/411PTg), [Electro Fractal Land](https://goo.gl/9yBZnJ), [Bello Electro](https://goo.gl/VTGmz7), [Boom Generators](https://goo.gl/XH88Gf)


[Clubberize](https://github.com/wizgrav/clubberize) - A helper lib to utilize the tool's modulators in js apps, webgl or other.(Kind of obsolete now since the tool can export its state in pure javascript)


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

The energy per midi note will be contained in the Clubber.notes array. A mechanism for analysis is provided by the library called 'bands'. These are implemented as closures that, when called, will process the current note energies and update Float32Arrays | Arrays | THREE.VectorX objects passed as the first argument, with the second argument being an offset for the case when arrays are used. Their output data can be passed directly to webgl shaders as vecs. The data coming out are readily usable as modulators but they can also be aggregated through time for more elaborate transitions etc. 

Bands are defined as rectangular windows on the midi spectrum using the properties **from** - **to** to declare a horizontal range of midi notes(0-127) to watch and **low** - **high** properties for the vertical power thresholds within that window, expressed as midi velocities (0-127). The output measurements are always normalized floats(0-1).

The output can be customized with the **template** property. This accepts a string of digits or an array of indices to select the desired measurements among a collection of the following:

* ID - Description
* 
* 0 - Strongest power note index
* 1 - Weakest powered note index
* 2 - Power weighted note average
* 3 - Power of the strongest note
* 4 - Average energy of active notes
* 5 - Power weighted average midi index
* 6 - Power weighted average octave index 
* 7 - Ratio of spectrum window area covered
* 8 - Adaptive low threshold relative to absolute limits 
* 9 - Adaptive high threshold relative to absolute limits

If a **template** is not specified it defaults is **0123**, the first four measurements from the set. The length of the string | array provided as the template defines the size of the resulting vector and the internally used Float32Array.

Bands also provide exponential smoothing for the measurements which is controlled by the **smooth** option. This takes an element array of normalized floats, same length as the template property, to use as factors for the smoothing of each respective measurement. A value of 1 means instant change and as it goes down to 0 it smooths more. 

A negative value for an element activates the snap mode. In this mode when the energy rises it gets smoothed by the factor defined as the **snap** option which should normally be fast (default is 0.33 which is pretty fast) and when falling, it instead uses the abs(value) as the factor. This comes in handy for eg kicks which you would want the value to rise fast but slowly fade down, so you would use something like -0.1 or something like that. There's a single **snap** factor for all measurements of the object and it can be overriden in the options.

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

// This should happen first for the frequency data to be current
// Time is optional but is useful for performing offline analysis
clubber.update(currentTimeInMs); 

// Calling the closures fills the provided object which can be Float32Array|Array|Three.VectorX
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

Sometimes the audio source maybe located away from the box doing the presentations. In that case you can setup a minimal clubber app(no bands defined) to listen to the audio and perform the fft -> midi transform, extract the clubber.notes array and transmit them to another. You can then import them on the rendering box like this:

```javascript

// The third(true) argument indicates that the data are already converted to midi space
clubber.update(time, noteArray, true); 

```

There's no need to listen to anything on the rendering box in this case. You just create and use bands as usual. Time is optional and you can just provide it with a null value to use the internal clock.

### Tips ###

Usually one would instantiate several bands, each covering a range of midi notes, low mid high etc, calling them every render iteration and passing the returned arrays/vec4s as uniforms to modulate webgl shaders. Other uses are equally easy, just pick and use elements from the arrays as needed.

By creatively combining the results of the analysis, the rhythmic patterns in the music will emerge in the graphics as well. Simple combinations could be finding the min/max between adjacent band notes/energies or multiply/sub them.

A strategy that works well would be to interpret the analysis results as vectors and operate on these. For instance map a bands strongest note on the x axis, the average note on the Y axis and calculate the length of the vector. You can go further and combine notes with powers and elements from different bands/rects. 

And since we're dealing with vectors why not just measure their distances or even dot them and see what comes out(Good stuff :) These combinations are all plausible, you can check some of them in the glsl demos that come with the source. You can also experiment on your own and design your modulators in this [very helpful tool](http://wizgrav.github.io/clubber/tool).

You can also tune smoothing via Clubber.smoothing which is a shortcut for the internal analyser's smoothingTimeConstant(the web audio default is 0.8 and is quite sensitive).



### Clubber in the wild ###

[Waveform demo by spleen](https://github.com/spleennooname/webg-clubber-demo) 

[AFRAME component & demo by wizgrav](http://wizgrav.github.io/aframe-clubber/demo/)

[Dancing Torus by jiin](http://dancing-torus.s3-website-us-east-1.amazonaws.com/)

[Dancing Torus by jiin - wizgrav's remix](https://wizgrav.github.io/dancing-torus)

[Copernicus - featuring Mike Gao's track Adventura](https://wizgrav.github.io/copernicus)

[Shepard glitch by spleen](https://spleennooname.github.io/shepard-glitch-me/build/index.html)

[Several shaders by alvarobyrne](http://jsdo.it/alvarobyrne/6Gk2)

## Contributors

Neri Barnini [<neri.barnini@gmail.com>](mailto:neri.barnini@gmail.com)

Fabien Motte [<hello@fabienmotte.com>](mailto:hello@fabienmotte.com)

## License

This program is free software and is distributed under an [MIT License](LICENSE).
