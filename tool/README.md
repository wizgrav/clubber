# Clubber Tool #

This web app is a capable designer for audio reactive modulators. It builds on the powerfull concept of Audio Shaders<sup>TM</sup>. It packs four clubber bands of four measurements. The 4 text input fields allow writing glsl expressions to interact with the band measurements. The band measurements are accessible through the iMusic[0-3] vec4 uniforms and the current time through iTime.  The resulting modulations are presented in the form of RGBA bars(A is drawn as white). The debug button toggles an overlay showing the measurements from the 4 bands, modulators and a midi spectrogram where you can also see the bounds for the currently selected band configuration(useful for live inspection of the adapt option).

You can change the band configurations using the numeric inputs or by passing query arguments to the tool url. Arguments should be in the form of a single letter and a number 0-3 to indicate iMusic[0-3] respectively. So for example ?t0=4567 would override the template of iMusic[0]. ?r0=1,24,32,96 would change the bounds (from, to, low, high). ?s0=0.2,0.1,0.2,0.2 would override the smooth option array. ?a0=0.33,0.1,1,1 would override the adapt option array for the first band.

The current soundcloud track, glsl field values and band config will be persisted among page reloads in localStorage. If you want to reset to the defaults you can pass a **?reset=1** argument to the url.

If a shadertoy hash/url is provided, it will be fetched and rendered, and it can be made to interact with modulators as well. Not all shadertoys work yet and those that do must have a special define block on the head to allow wiring the mods with clubber tool:

```cpp

#ifndef CLUBBER
#define CLUBBER_R 0.0
#define CLUBBER_G 0.0
#define CLUBBER_B 0.0
#define CLUBBER_A 0.0
#endif

```

When in the context of clubber, The CLUBBER_X defines will evaluate to the results from the expressions in tool's fields. These must evaluate to a single float each, ideally 0-1. In the shadertoy editor, you can place these in the shader wherever they make sense as modulators and place some appropriate defaults in the CLUBBER_X defines on the shader text. The iMusic[N] uniforms can be provided with shortcuts using $ like eg $0.x = iMusic[0].x The previous frame's value for every field can be retrieved using the single character "@" and is very useful for smoothing the modulator's output with mix() and many other uses.

## SAVING PATCHES ##

At any point, you can copy the address of the **State** link to get a full snapshot of the current state of the tool contained in a long url. Band configs, glsl snippets, current track and shader are all serialized so this url is essentially a self contained music vis patch that can be easily stored and shared. Just short url it and you're good to go.

## JS EXPORT ##
The glsl provided in the modulator fields is actually transpiled to JS using the awesome [glsl-transpiler](https://github.com/stackgl/glsl-transpiler). If you'd like to use the modulators you designed in your own apps, just click the code button to toggle a textarea containing the javascript code produced from the current modulator configuration. 

A factory function is provided that takes a clubber instance as its only argument and returns a closure, linked to the clubber instance, which you can then call passing it an array as argument. This array will be filled with the current modulator values, but you also need to update the parent clubber instance manually before any linked closure is called for the measurements to be current. This scheme allows for a single clubber instance to link with many modulator closures.

## MIDI SEND ##
Finally, the tool can output midi controller values from the fields. This works only on chrome for now till the other browsers implement web midi as well. Just click on the small button located on the right side of each field and follow the instructions. 

This feature has huge potential for controlling external filters/synths when producing or live djing. Coupled with a low latency audio/midi loopback setup, it's essentially the most configurable sidechaining mechanism available out there. It's also a perfect opportunity for audiophiles to learn some glsl basics. It's as good for audio as it is for visuals ;)