/* 
* clubber.js 1.3.0 Copyright (c) 2016, Yannis Gravezas All Rights Reserved.
* Available via the MIT license. More on http://github.com/wizgrav/clubber.
*/

var Clubber = function (config) {
  if (!config) config = {};
  this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  var analyser = this.audioCtx.createAnalyser();
  analyser.fftSize = config.size || 2048;
  
  Object.defineProperty(this, 'smoothing', {
    get: function() {
      return analyser.smoothingTimeConstant;
    },
    set: function(value) {
      analyser.smoothingTimeConstant = value;
    }
  });
  
  this.analyser = analyser;
  
  this.bufferLength = this.analyser.frequencyBinCount;
  
  if (!config.mute) this.analyser.connect(this.audioCtx.destination);
  
  this.data = new Uint8Array(this.bufferLength);
  this.keys = new Uint8Array(this.bufferLength);
  this.noteSums = new Uint16Array(160);
  this.notes = new Uint8Array(160);
  this.weights = new Uint8Array(160);
  
  function freq2midi (freq){
    var r=1.05946309436, lala=523.251, notetest=eval(freq), ref=lala, hauteur=1, octave=4, alteration, supinf=0, compteur=0, hautnb=1, noteton, ref1=0, ref2=0, temp, flag=0, nmidi=72;
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
    return Math.min(nmidi,160);
  }
  var lastkey=0,idx=0;
  for(var i = 0, inc=(this.audioCtx.sampleRate/2)/this.bufferLength; i < this.bufferLength;i++){
    var freq = (i+0.5)*inc;
    var key = freq2midi(freq);
    this.keys[i] = key;
    this.weights[key]++;
  }
  var holeIndex = 0;
  for(i=0;i<128;i++){
    if(!this.weights[i]) holeIndex = i;
  }
  this.holeIndex = holeIndex + 1;
};

Clubber.prototype.listen = function (obj) {
  if (this.source) { this.source.disconnect(this.analyser); }
  if ( obj instanceof AudioNode ) {
    this.el = null;
    this.source = obj;
  } else {
    this.el = obj;
    this.source = this.audioCtx.createMediaElementSource(obj);
  }
  this.source.connect(this.analyser);
};


// Exponential smoothing. When negative: snap is used when value rises and abs(value) when falling.
Clubber.prototype.smoothFn = function (v, o, f, snap){
  v = !v ? 0 : v;
  f = Math.min(f, snap);
  if (f < 0) { f = v > o ? Math.abs(snap) : -f; }
  return f * v + (1 - f) * o;
};

Clubber.prototype.parseConfig = function(config, obj) {
  var defaults = { 
    from:1, to:128, low:64, high:128, 
    smooth: [0.1, 0.1, 0.1, 0.1],
    adapt: [1.0, 1.0, 1.0, 1.0],
    snap: 0.33, step: 1000/60 
  };
  if(config){
    for (var k in defaults) {
      if (!config[k]) config[k] = defaults[k];
    }
  } else {
    config = defaults;
  }
  obj.data = new Float32Array(4);
  obj.high = config.high;
  obj.low = config.low;
  obj.data.scope = obj;
  obj.config = config;
  return obj;
};

Clubber.prototype.band = function (config) {
  var scope = this;
  
  var obj = this.parseConfig(config, { idx: 0, avg: 0});

  return function (output, offset) {
    var config = obj.config;
    offset = offset || 0;
    if (obj.time > scope.time) {
      return scope.output(obj.data, output, offset);
    }
    
    var s = config.smooth, arr = obj.data, snap = config.snap;
    var idx=0, val=0, vsum=0, nsum = 0, cnt=0;

    for(var i=config.from; i < config.to;i++){
      var v = Math.min(obj.high, scope.notes[i] / 2);
      if (v >= obj.low) {
        
        // Sum musical keys and power.
        var vn = v - obj.low; 
        vsum += vn;
        nsum += ( i % 12 ) * vn;
        cnt++;

        // Strongest note.
        if (v > val){
          idx = i;
          val = v;
        }
      }
    }

    // Dont change if notes haven't triggered
    if(cnt) {
      obj.idx=(idx%12)/12;
      obj.avg=(nsum/vsum)/12;
    }
    var smoothFn = scope.smoothFn;
    var av = cnt ? vsum / cnt : 0;
    var height = obj.high - obj.low, _height = config.high - config.low;
    var ah = Math.min(config.high, config.low + av + Math.abs(config.adapt[2] * _height));
    var al = Math.max(config.low, config.low + av - Math.abs(config.adapt[0] * _height));
    val = Math.max(0, val - obj.low)/height;
    
    // fixed timestep
    if (obj.time === undefined) obj.time = scope.time;
    for (var t = obj.time, step = obj.config.step, tmax = scope.time + step ; t <= tmax; t += step) {
      arr[0] = smoothFn(obj.idx, arr[0], s[0], snap); // Strongest note
      arr[1] = smoothFn(obj.avg , arr[1], s[1], snap); // Power weighted note average
      arr[2] = smoothFn(val, arr[2], s[2], snap); // Strongest note's power
      arr[3] = smoothFn(av / height, arr[3], s[3], snap); // Average note power
      obj.high = smoothFn(ah, obj.high, config.adapt[3], snap);
      obj.low = smoothFn(al, obj.low, config.adapt[1], snap);
    }
    obj.time = t;
    
    return scope.output(arr, output, offset);
  };
};

Clubber.prototype.rect = function (config) {
  var scope = this;
    
  var obj = this.parseConfig(config, {});

  return function (output, offset) {
    var config = obj.config;
    offset = offset || 0;
    if (obj.time > scope.time) {
      return scope.output(obj.data, output, offset);
    }
    
    var s = config.smooth, arr = obj.data, snap = config.snap;
    var xsum=0, vsum = 0, cnt=0, psum=0;

    for(var i = config.from; i < config.to; i++){
      var v = Math.min(obj.high, scope.notes[i] / 2); // Convert to midi velocity range
      if (v >=  obj.low){
        var y = v - obj.low;
        var x = i - config.from;
        psum += x * y;
        xsum += x;
        vsum += y;
        cnt++;
      }
    }

    var smoothFn = scope.smoothFn;
    var av = cnt ? vsum / cnt : 0;
    var height = obj.high - obj.low, _height = config.high - config.low;
    var ah = Math.min(config.high, config.low + av + Math.abs(config.adapt[2] * _height));
    var al = Math.max(config.low, config.low + av - Math.abs(config.adapt[0] * _height));
    var width = config.to - config.from, area = width * height;
    
    // fixed timestep
    if (obj.time === undefined) obj.time = scope.time;
    for (var t = obj.time, step = obj.config.step, tmax = scope.time + step ; t <= tmax; t += step) {
      arr[0] = smoothFn((xsum/cnt)/width, arr[0], s[0], snap); // Average X
      arr[1] = smoothFn(((psum/vsum))/width , arr[1], s[1], snap); // Power weighted average X
      arr[2] = smoothFn(cnt/width, arr[2], s[2], snap); // Active notes
      arr[3] = smoothFn(vsum/area, arr[3], s[3], snap); // Window active area, overall power
      obj.high = smoothFn(ah, obj.high, config.adapt[3], snap);
      obj.low = smoothFn(al, obj.low, config.adapt[1], snap);
    }
    
    obj.time = t;
    
    return scope.output(arr, output, offset);
  };
};

Clubber.prototype.output =  function (arr, output, offset) {
  if (output) {
    if (output instanceof Float32Array) {
      output.set(arr, offset);
    } else if(Array.isArray(output)){
      for (var i = 0; i < 4; i++) output[offset+i] = arr[i];
    } else if(output.set){
      output.set(arr[0], arr[1], arr[2], arr[3]);
    } 
  }
  return arr;
};

// You can pass the frequency data on your own using the second argument.
Clubber.prototype.update =  function (time, data) {
  var c = this.cache, self=this;
  if (!data) {
    this.analyser.getByteFrequencyData(this.data);
    data = this.data;
  }
  // Calculate energy per midi note
  for(var i = 0; i < this.notes.length; i++){
    this.noteSums[i] = 0;
  }
  for(i = 0; i < this.keys.length; i++){
    this.noteSums[this.keys[i]] += data[i];
  }
  
  var lastIndex = 0, lastVal=0;
  for(i = 0; i < this.notes.length; i++){
    var w = this.weights[i];
    if(!w) continue;
    var v = this.noteSums[i] / w;
    this.notes[i] = v;
    if (i > this.holeIndex) continue;
    var di = i - lastIndex;
    var dv = v - lastVal;
    for(var j = 1; j < di; j++) {
      this.notes[lastIndex + j] = lastVal + j * dv/di; 
    }
    lastVal = v;
    lastIndex = i;
  }
  
  this.time = time !== undefined ? parseFloat(time) : window.performance.now();
};

module.exports = window.Clubber = Clubber;