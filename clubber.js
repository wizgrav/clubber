/* 
* clubber.js 1.0.0 Copyright (c) 2016, Yannis Gravezas All Rights Reserved.
* Available via the MIT license. More on http://github.com/wizgrav/clubber.
*/

var Clubber = function (config) {
  if (!config) config = {};
  this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  this.analyser = this.audioCtx.createAnalyser();
  this.analyser.fftSize = config.size || 2048;
  this.bufferLength = this.analyser.frequencyBinCount;
  
  this.thresholdFactor = config.thresholdFactor || 0.66;
  
  if (!config.mute) this.analyser.connect(this.audioCtx.destination);
  
  this.data = new Uint8Array(this.bufferLength);
  this.keys = new Uint8Array(this.bufferLength);
  this.notes = new Uint16Array(160);
  this.thresholds = new Uint8Array(160);
  this.weights = new Uint8Array(160);
  
  function freq2midi (freq){
    var r=1.05946309436;
    var lala=523.251;
    var notetest=eval(freq);
    var ref=lala;
    var hauteur=1;
    var octave=4;
    var alteration;
    var supinf=0;
    var compteur=0;
    var hautnb=1;
    var noteton;
    var ref1=0;
    var ref2=0;
    var temp;
    var flag=0;
    var nmidi=72;
    tableau=new Array();

    while (notetest<ref){
        ref=Math.floor(1000*ref/r)/1000;
        compteur=compteur+1;
        supinf=-1;
        flag=1;
        ref1=ref;
    }	

    while (notetest>ref){
        ref=Math.floor(1000*ref*r)/1000;
        compteur=compteur-1;
        supinf=1;
        ref2=ref;
    }

    if (Math.abs(notetest-ref1)<Math.abs(notetest-ref2)) {
      supinf=-1;
      compteur=compteur+1;
    } else {
      if (flag==1){ supinf=-1;}
    }

    if (ref1==0) {
      ref1=Math.floor(1000*ref/r)/1000;
      if (Math.abs(notetest-ref1)<Math.abs(notetest-ref2)) {
        compteur=compteur+1;
        supinf=1;
      }
    }

    compteur=Math.abs(compteur);

    while (compteur != 0 ){
        if ((hautnb==1 && supinf==-1) || (hautnb==12 && supinf==1) ) {
          octave=octave+eval(supinf);
          if (supinf==1) hautnb=0;
          if (supinf==-1) hautnb=13;
        }
        hautnb=hautnb+supinf;
        nmidi=nmidi+supinf;
        compteur=compteur-1;
    }
    return nmidi;
  }
  for(var i = 0, inc=(this.audioCtx.sampleRate/2)/this.bufferLength; i < this.bufferLength;i++){
    var freq = (i+0.5)*inc;
    var key = freq2midi(freq);
    this.keys[i] = key;
    this.weights[key]++;
  }
  
  this.count = 0;
};

Clubber.prototype.listen = function (el) {
  this.el = el;
  if (this.source) { this.source.disconnect(this.analyser); }
  this.source = this.audioCtx.createMediaElementSource(el);
  this.source.connect(this.analyser);
};

Clubber.prototype.band = function (config) {
  var defaults = { from:1, to:128, snap: 0.66, smooth: [0.33, 0.33, 0.33, 0.33], step: 1000/60 };
  if(config){
    for (var k in defaults) {
      if (!config[k]) config[k] = defaults[k];
    }
  } else {
    config = defaults;
  } 
  
  var obj = {
    count: 0,
    scope: this,
    config:config,
    data: new Float32Array(4)
  };  

  return function (config) {
    if (config) {
      for (var k in obj.config) {
        if (config[k] !== undefined) obj.config[k] = config[k]
      }
    }
    config = obj.config;
    
    if (obj.time > obj.scope.time) {
      return obj.data;
    }
    
    var s = config.smooth, arr = obj.data;
    var idx=-1, val=0, osum=0, vsum=0, nsum = 0, cnt=0;

    for(var i=config.from; i < config.to;i++){
      var v = obj.scope.notes[i];
      var thr = obj.scope.thresholds[i];
      // Filter with adaptive threshold
      if (v > thr) {
        // Sum musical keys, octave(bass vs tremble) and overall volume.
        vsum += Math.max(0, v - 128);
        nsum += i % 12;
        osum += i;
        cnt++;

        // Strongest note.
        if (v > val){
          idx = i;
          val = v;
        }
      }
    }

    // Exponential smoothing. When negative config.snap is used when value rises and abs(value) when falling.
    function smooth(v,o,f){
      v = !v ? 0 : v;
      f = Math.min(f, obj.config.snap);
      if (f < 0) { f = v > o ? Math.abs(obj.config.snap) : -f; }
      return f * v + (1 - f) * o;
    }
    
    if (obj.time === undefined) obj.time = obj.scope.time;
    for (var t = obj.time, step = obj.config.step, tmax = obj.scope.time + step ; t <= tmax; t += step) {
      arr[0] = smooth((idx % 12)/12, arr[0], s[0]);
      arr[1] = smooth((cnt ? nsum/cnt : 0)/12 , arr[1], s[1]);
      arr[2] = smooth(((cnt ? osum/cnt : 0) - config.from)/(config.to - config.from), arr[2], s[2]);
      arr[3] = smooth(((cnt ? vsum/cnt:0))/128, arr[3], s[3]);
    }
    obj.time = t;
    obj.count = obj.scope.count;
    
    return arr;
  };
};

// You can pass the frequency data on your own using the second argument.
Clubber.prototype.update =  function (time, data) {
  if (!data) {
    this.analyser.getByteFrequencyData(this.data);
    data=data;
  }
  // Calculate energy per midi note
  for(var i = 0; i < this.notes.length;i++){
    this.notes[i] = 0;
  }
  for(i = 0; i < this.keys.length;i++){
    this.notes[this.keys[i]] += this.data[i];
  }
  for(i = 0; i < this.notes.length;i++){
    this.notes[i] /= this.weights[i];
    
    // Adaptive threshold, you can tune it via Clubber.thresholdFactor with a 0.0 - 1.0 value.
    var tf = this.thresholdFactor;
    this.thresholds[i] = 128 + Math.max( Math.min(1, Math.max(tf, 0)) * Math.max(0, this.notes[i] - 128), this.thresholds[i]);
    if(this.thresholds[i] > 128) this.thresholds[i]--;
  }
  this.time = time !== undefined ? parseFloat(time) : window.performance.now();
  this.count++;
};

module.exports = Clubber;
