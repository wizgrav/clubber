/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	/* 
	* clubber.js 1.2.0 Copyright (c) 2016, Yannis Gravezas All Rights Reserved.
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
	  
	  this.thresholdFactor = config.thresholdFactor || 0.33;
	  
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
	    return Math.min(nmidi,160);
	  }
	  var lastkey=0,idx=0;
	  for(var i = 0, inc=(this.audioCtx.sampleRate/2)/this.bufferLength; i < this.bufferLength;i++){
	    var freq = (i+0.5)*inc;
	    var key = freq2midi(freq);
	    this.keys[i] = key;
	    this.weights[key]++;
	  }
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

	Clubber.prototype.band = function (config) {
	  var defaults = { from:1, to:128, snap: 0.33, smooth: [0.1, 0.1, 0.1, 0.1], step: 1000/60 };
	  if(config){
	    for (var k in defaults) {
	      if (!config[k]) config[k] = defaults[k];
	    }
	  } else {
	    config = defaults;
	  } 
	  
	  var obj = {
	    idx: 0,
	    avg: 0,
	    count: 0,
	    scope: this,
	    config:config,
	    data: new Float32Array(4)
	  };  

	  return function (output, offset) {
	    var config = obj.config;
	    offset = offset || 0;
	    if (obj.time > obj.scope.time) {
	      return obj.data;
	    }
	    
	    var s = config.smooth, arr = obj.data;
	    var idx=0, val=0, vsum=0, nsum = 0, cnt=0;

	    for(var i=config.from; i < config.to;i++){
	      var v = obj.scope.notes[i];
	      // Filter with adaptive threshold
	      if (v > obj.scope.thresholds[i]) {
	        
	        // Sum musical keys, octave(bass vs tremble) and overall volume.
	        var vn = Math.max(0, v - 128); 
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

	    // Exponential smoothing. When negative: config.snap is used when value rises and abs(value) when falling.
	    function smooth(v,o,f){
	      v = !v ? 0 : v;
	      f = Math.min(f, obj.config.snap);
	      if (f < 0) { f = v > o ? Math.abs(obj.config.snap) : -f; }
	      return f * v + (1 - f) * o;
	    }
	    
	    // Dont change if notes haven't triggered
	    if(cnt) {
	      obj.idx=(idx%12)/12;
	      obj.avg=(nsum/vsum)/12;
	    }
	    
	    // fixed timestep
	    if (obj.time === undefined) obj.time = obj.scope.time;
	    for (var t = obj.time, step = obj.config.step, tmax = obj.scope.time + step ; t <= tmax; t += step) {
	      arr[0] = smooth(obj.idx, arr[0], s[0]); // Strongest note
	      arr[1] = smooth(obj.avg , arr[1], s[1]); // Power weighted note average
	      arr[2] = smooth(Math.max(0,val-128)/128, arr[2], s[2]); // Strongest note's power
	      arr[3] = smooth(((cnt ? vsum/cnt:0))/128, arr[3], s[3]); // Average note power
	    }
	    
	    obj.time = t;
	    
	    if (output) {
	      if (output instanceof Float32Array) {
	        output.set(arr, offset);
	      } else if(output.set){
	        output.set(arr[0], arr[1], arr[2], arr[3]);
	      } else if(Array.isArray(output)){
	        for (var i = 0; i < 4; i++) output[offset+i] = arr[i];
	      }
	    }
	    return arr;
	  };
	};

	// You can pass the frequency data on your own using the second argument.
	Clubber.prototype.update =  function (time, data) {
	  var c = this.cache, self=this;
	  if (!data) {
	    this.analyser.getByteFrequencyData(this.data);
	    data = this.data;
	  }
	  // Calculate energy per midi note
	  for(var i = 0; i < this.notes.length;i++){
	    this.notes[i] = 0;
	  }
	  for(i = 0; i < this.keys.length;i++){
	    this.notes[this.keys[i]] += data[i];
	  }
	  for(i = 0; i < this.notes.length;i++){
	    this.notes[i] /= this.weights[i];
	    
	    // Adaptive threshold, you can tune it via Clubber.thresholdFactor with a 0.0 - 1.0 value.
	    var tf = this.thresholdFactor;
	    this.thresholds[i] = 128 + Math.max( Math.min(1, Math.max(tf, 0)) * Math.max(0, this.notes[i] - 128), this.thresholds[i]);
	    if(this.thresholds[i] > 128) this.thresholds[i]--;
	  }
	  this.time = time !== undefined ? parseFloat(time) : window.performance.now();
	};

	module.exports = window.Clubber = Clubber;

/***/ }
/******/ ]);