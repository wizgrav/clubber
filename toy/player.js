(function () {
	'use strict';

	var isCommonjs = typeof module !== 'undefined' && module.exports;
	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;

	var fn = (function () {
		var val;
		var valLength;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			// new WebKit
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			// old WebKit (Safari 5.1)
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1] in document) {
				for (i = 0, valLength = val.length; i < valLength; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var screenfull = {
		request: function (elem) {
			var request = fn.requestFullscreen;

			elem = elem || document.documentElement;

			// Work around Safari 5.1 bug: reports support for
			// keyboard in fullscreen even though it doesn't.
			// Browser sniffing, since the alternative with
			// setTimeout is even worse.
			if (/5\.1[\.\d]* Safari/.test(navigator.userAgent)) {
				elem[request]();
			} else {
				elem[request](keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT);
			}
		},
		exit: function () {
			document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
			if (this.isFullscreen) {
				this.exit();
			} else {
				this.request(elem);
			}
		},
		raw: fn
	};

	if (!fn) {
		if (isCommonjs) {
			module.exports = false;
		} else {
			window.screenfull = false;
		}

		return;
	}

	Object.defineProperties(screenfull, {
		isFullscreen: {
			get: function () {
				return Boolean(document[fn.fullscreenElement]);
			}
		},
		element: {
			enumerable: true,
			get: function () {
				return document[fn.fullscreenElement];
			}
		},
		enabled: {
			enumerable: true,
			get: function () {
				// Coerce to boolean in case of old WebKit
				return Boolean(document[fn.fullscreenEnabled]);
			}
		}
	});

	if (isCommonjs) {
		module.exports = screenfull;
	} else {
		window.screenfull = screenfull;
	}
})();

(function () {
var shaderIds = ["4dsGzH","MsjSW3","4tlSzl", "MdlXRS","lslXDn","XsXXDn","MdBSDt","MlXSWX","XsBXWt"];

function threshold(){
  var id=(count++)% 3;
  clubber.smoothing = [0.66, 0.8, 0.92][id];
}

var count = 1;

var canvas = document.createElement("canvas");
canvas.style.display = "none";
document.body.appendChild(canvas);

  
document.addEventListener("fullscreenchange", function () {
  if (!window.screenfull.isFullscreen) {
    running = false;
    canvas.style.display = "none";
  }
});
function maximize () {
  var fs = el.webkitRequestFullScreen || el.requestFullScreen || msRequestFullScreen;
  canvas.style.display = "block";
  fs.call(canvas);
}

var gl = twgl.getWebGLContext(canvas);
var ext = gl.getExtension("OES_standard_derivatives");
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.BLEND);
gl.clearColor(0, 0, 0, 1);

function load (url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

var arr, correctArray = [0, 1, 1, 1], needsCorrection = false;


var uniforms = {
  iMusic: new Float32Array(16),
  iCorrect: correctArray,
  iResolution: [gl.canvas.width, gl.canvas.height,0],
  iChannel0: twgl.createTexture(gl, {src: "//wizgrav.github.io/clubber/toy/noise.png"}),  
  iChannelResolution: [256,256,0],
  iCorrect: correctArray
};


var shaders = [], currentShaders = [];
shaderIds.forEach(function (id) {
  var shader = new Shader(gl, { 
    source: load("//wizgrav.github.io/clubber/toy/shaders/" + id + ".fs"), 
    uniforms: uniforms, 
    correct: needsCorrection
  });
  shaders.push(shader);
  shader.id = id;
});
currentShaders.push(shaders[0]);
var debugShader = new Shader(gl, { 
    source: load("toy/shaders/debug.fs"), 
    uniforms: uniforms, 
    correct: [0,1,1,1]
  });

debugShader.transition = 0.5;
var debugBands = false;
var data = {};

var clubber = new Clubber({thresholdFactor:0, size: 4096});
var smoothArray = [0.1,0.1,0.1,0.16];
if(getParameterByName("smooth")) {
  smoothArray = getParameterByName("smooth").split(",").forEach(function(s,i){
    if( i < smoothArray.length) smoothArray[i] = parseFloat(s);
  });
}
data.bands = [
  clubber.band({from:1, to:32, smooth: smoothArray }),
  clubber.band({from:32, to:48, smooth: smoothArray }),
  clubber.band({from:48, to:64, smooth: smoothArray }),
  clubber.band({from:64, to:96, smooth: smoothArray })
];
threshold();
var lastObjectUrl = null;

var transitionStart = 0, currentTime = 0;

function onKeyUp(e) {
  var v = parseInt(e.key);
  if(isNaN(v)){
    if(e.key === "v" || e.key === "V") debugBands = !debugBands;
    return;
  };
  if(!v){
    threshold();
    return;
  }
  v--;
  if(!shaders[v]) return;
  if(shaders[v].id === currentShaders[0].id && shaders.length > 1) {
    transitionStart += 0.33 * (currentTime - transitionStart);
  }
  if(shaders[v].id !== currentShaders[0].id){
    while(currentShaders.length > 1) currentShaders.pop();
    var shader = shaders[v];
    shader.startTime = currentTime/1000;
    currentShaders.unshift(shader);
    transitionStart = currentTime;
  }
}

canvas.addEventListener("keyup", onKeyUp);


var transitionTime = 2000;
var running = false
function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
  if(!running) return;
  clubber.update(time);
  for(var i = 0; i< 4; i++) 
    data.bands[i](uniforms.iMusic, 4*i);
  data.time = time/1000;
  gl.clear(gl.COLOR_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  uniforms.iResolution = [gl.canvas.width, gl.canvas.height,0];
  uniforms.iCorrect = correctArray;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  if(currentShaders.length > 1){
    delta = time - transitionStart;
    if(delta > transitionTime) {
      currentShaders = [currentShaders.shift()];
      currentShaders[0].transition=1;
    } else {
      var tr = Math.pow(delta/transitionTime, 2);
      currentShaders.forEach(function (shader, i) {
        shader.transition = i ? 1-tr:tr;
        shader.render(data, true);
      });
      return;
    }
  } 
  currentShaders[0].render(data, true);
  if(debugBands) debugShader.render(data, true);
}

window.clubberize = function (el) {
  clubber.listen(el);
  running = true;
  maximize();
}

render(0);
})();