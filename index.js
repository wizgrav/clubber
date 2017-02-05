/* 
* clubber.js 1.4.3 Copyright (c) 2016-2017, Yannis Gravezas All Rights Reserved.
* Available via the MIT license. Check http://github.com/wizgrav/clubber for info.
*/

var Clubber = function (config) {
  if (!config) config = {};
  this.context = config.context || new (window.AudioContext || window.webkitAudioContext)();
  
  var analyser = this.context.createAnalyser();
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
  
  if (!config.mute) this.analyser.connect(this.context.destination);
  
  this.data = new Uint8Array(this.bufferLength);
  this.keys = new Uint8Array(this.bufferLength);
  this.noteSums = new Uint16Array(128);
  this.notes = new Uint8Array(128);
  this.weights = new Uint8Array(128);
  
  this.maxBin = 0;
  var lastkey=0,idx=0;
  for(var i = 0, inc=(this.context.sampleRate/2)/this.bufferLength; i < this.bufferLength;i++){
    var freq = (i+0.5)*inc;
    this.maxBin = i;
    if(freq > 13280) {
      break;
    }
    var key = Math.floor(17.3123405046 * Math.log(.12231220585 * freq));
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
    this.source = this.context.createMediaElementSource(obj);
  }
  this.source.connect(this.analyser);
};

Clubber.prototype.band = function (config) {
  var scope = this;
  
  var parseConfig = function(config) {
    var defaults = { 
      from:1, to:128, low:64, high:128, 
      smooth: [0.1, 0.1, 0.1, 0.1],
      adapt: [1.0, 1.0, 1.0, 1.0],
      snap: 0.33, step: 1000/60,
      template: [0, 1, 2, 3]
    };
    
    if(config){
      for (var k in defaults) {
        if (!config[k]) config[k] = defaults[k];
      }
      if(typeof config.template === "string") {
        var t = [];
        for(var i = 0; i < config.template.length; i++)
          t.push(parseInt(config.template[i]));
        config.template = t;
      }
      var rect = {
        from: config.from,
        to: config.to,
        low: this.rect ? this.rect.low : config.low,
        high: this.rect ? this.rect.high : config.high,
      };
      this.rect = rect;
      var data = new Float32Array(config.template.length);
      if (this.data) data.set(this.data);
      this.config = config;
      this.data = data;
    }
    return this;
  };

  var obj = parseConfig.call({}, config);
  
  return function (output, offset) {    
    
    function fill(arr, output, offset) {
      if (output) {
        if (output instanceof Float32Array) {
          output.set(arr, offset);
        } else if(Array.isArray(output)){
          for (var i = 0; i < 4; i++) output[offset+i] = arr[i];
        } else if(output.fromArray){
          output.fromArray(arr);
        } 
      }
    };
    
    var config = obj.config, data = obj.data, rect = obj.rect;
    if(typeof offset === "object"){
      parseConfig.call(obj, offset);
      offset = arguments[2];
    }
    
    offset = offset || 0;
    
    if (obj.time > scope.time){
      fill(data, output, offset);
      return rect;
    }
    
    var s = config.smooth, snap = config.snap, idx=0, val=0, midx=0, mval=128, vsum=0, nsum=0, xsum=0, psum=0, osum = 0, cnt=0;

    for(var i=config.from; i < config.to;i++){
      var V = scope.notes[i] / 2;
      var v = Math.min(rect.high, V);
      if (v >= rect.low) {
        
        // Sum musical keys and power.
        v -= rect.low; 
        var x = i - config.from;
        osum += Math.floor( i  / 12) * v;
        nsum += ( i % 12 ) * v;
        psum += x * v;
        vsum += v;
        xsum += x;
        cnt++;

        // Strongest note.
        if (V > val){
          idx = i;
          val = V;
        } else if(v < mval) {
          midx = i;
          mval = v;
        }
      }
    }

    // Dont change note info if no activity was recorded
    if(cnt) {
      obj.midx=(midx % 12) / 12;
      obj.idx=(idx % 12) / 12;
      obj.avg=(nsum / vsum) / 12;
    }
    
    // Exponential smoothing. When negative: snap is used when value rises and abs(value) when falling.
    function smoothFn (v, o, f, snap){
      v = !v ? 0 : v;
      f = f === undefined ? 0.1 : f;
      f = Math.min(f, snap);
      if (f < 0) { f = v > o ? Math.abs(snap) : -f; }
      return f * v + (1 - f) * o;
    };
    
    var width = config.to - config.from, av = cnt ? vsum / cnt : 0;
    var height = rect.high - rect.low, _height = config.high - config.low, area = width * height;
    var ah = Math.min(config.high, config.low + av + config.adapt[2] * _height);
    var al = Math.max(config.low, config.low + av - config.adapt[0] * _height);
    var of = Math.floor(config.from / 12), ot = Math.floor(config.to / 12);
    val = height ? Math.min(rect.high, Math.max(0, val - rect.low)) / height : 0;
    
    // fixed timestep
    if (obj.time === undefined) obj.time = scope.time;
    for (var t = obj.time, step = obj.config.step, tmax = scope.time + step ; t <= tmax; t += step) {
      config.template.forEach(function (k,i) {
        switch (k) {
          default: 
            data[i] = smoothFn(obj.idx, data[i], s[i], snap); break;
          case 1: 
            data[i] = smoothFn(obj.midx, data[i], s[i], snap); break;
          case 2: 
            data[i] = smoothFn(obj.avg , data[i], s[i], snap); break;
          case 3: 
            data[i] = smoothFn(val, data[i], s[i], snap); break;
          case 4: 
            data[i] = smoothFn(cnt && height ? av / height : 0, data[i], s[i], snap); break;
          case 5: 
            data[i] = smoothFn(vsum ? ((psum / vsum)) / width : 0 , data[i], s[i], snap); break;
          case 6: 
            data[i] = smoothFn(vsum ? ((osum / vsum - of)) / (ot - of) : 0, data[i], s[i], snap); break;
          case 7: 
            data[i] = smoothFn(area ? vsum/area:0, data[i], s[i], snap); break;
          case 8: 
            data[i] = smoothFn((rect.high - config.low) / _height, data[i], s[i], snap); break;
          case 9: 
            data[i] = smoothFn((rect.low - config.low) / _height, data[i], s[i], snap); break;
        }
      });
      rect.high = smoothFn(ah, rect.high, config.adapt[3], snap);
      rect.low = smoothFn(al, rect.low, config.adapt[1], snap);
    }
    
    obj.time = t;
    fill(data, output, offset);
    return rect;
  };
};

// You can pass the frequency data on your own using the second argument.
Clubber.prototype.update =  function (time, data) {
  var c = this.cache, self=this;
  if (!data) {
    this.analyser.getByteFrequencyData(this.data);
    data = this.data;
  }
  // Calculate energy per midi note and fill holes in the lower octaves
  for(var i = 0; i < this.notes.length; i++){
    this.noteSums[i] = 0;
  }
  for(i = 0; i < this.maxBin; i++){
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
    for(var j = lastIndex ? 1 : 0 ; j < di; j++) {
      this.notes[lastIndex + j] = lastVal + j * dv/di; 
    }
    lastVal = v;
    lastIndex = i;
  }
  
  this.time = time !== undefined ? parseFloat(time) : window.performance.now();
};

Clubber.prototype.descriptions = [
  "Most powerful note index",
  "Least powerfull note index",
  "Power weighted note average",
  "Power of the strongest note",
  "Average power of active notes",
  "Power weighted average midi index",
  "Power weighted average octave index", 
  "Ratio of spectrum window area covered",
  "Adaptive low threshold relative to bounds", 
  "Adaptive high threshold relative to bounds"
];

module.exports = window.Clubber = Clubber;
