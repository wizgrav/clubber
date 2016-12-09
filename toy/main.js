function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Shadertoy ids
var shaderIds = ["4dsGzH","MsjSW3","4tlSzl", "MdlXRS","lslXDn","XsXXDn","MdBSDt","MlXSWX","XsBXWt"];

shaderIds.forEach(function (s, i) {
  var p = getParameterByName("s"+i);
  if (p) shaderIds[i] = p;
})

var info = document.getElementById("info");

function threshold(){
  var id=(count++)% 3;
  info.innerHTML = ["low", "mid", "high"][id];
  info.style.opacity = 0.2 + 0.3 * id;
  clubber.smoothing = [0.66, 0.8, 0.92][id];
}
var count = 1;

audio = document.getElementById("audio");
audio.crossOrigin = "anonymous";

function play (src) {
  var url = 'http://api.soundcloud.com/tracks/'  + parseInt(document.querySelector("input").value) + '/stream' +
  '?client_id=56c4f3443da0d6ce6dcb60ba341c4e8d';
  audio.src=url;
  audio.play();
}

function maximize () {
  var el = document.querySelector("canvas");
  var fs = el.webkitRequestFullScreen || el.requestFullScreen || msRequestFullScreen;
  fs.call(el);
}
var canvas = document.getElementById("canvas");
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

var id = getParameterByName("id");
if (id) document.getElementById("tid").value = id;

var arr, correctArray = [0, 1, 1, 1], needsCorrection = false;
if(arr = getParameterByName("correct")) {
  arr.split(",").forEach(function (v, i) {correctArray[i] = parseFloat(v);});
  needsCorrection = true;
}
var noise = document.querySelector("#noise");
var uniforms = {
  iMusic: new Float32Array(16),
  iCorrect: correctArray,
  iResolution: [gl.canvas.width, gl.canvas.height,0],
  iChannel0: twgl.createTexture(gl, {src: noise}),  
  iChannelResolution: [256,256,0],
  iCorrect: correctArray
};

noise.addEventListener("load", function () {
  twgl.setTextureFromElement(gl, uniforms.iChannel0, this);
})

var shaders = [], currentShaders = [];
shaderIds.forEach(function (id) {
  var shader = new Shader(gl, { 
    source: load("toy/shaders/" + id + ".fs"), 
    uniforms: uniforms, 
    correct: needsCorrection
  });
  shaders.push(shader);
  shader.id = id;
});
currentShaders.push(shaders[8]);
var debugShader = new Shader(gl, { 
    source: load("toy/shaders/debug.fs"), 
    uniforms: uniforms, 
    correct: [0,1,1,1]
  });

debugShader.transition = 0.5;
var debugBands = false;
var data = {};

var clubber = new Clubber({thresholdFactor:0, size: 4096});
clubber.listen(audio);
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

function play (src) {
  if(lastObjectUrl){
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
  if(!src) {
    var val = document.querySelector("input").value;
    src = 'http://api.soundcloud.com/tracks/'  + val + '/stream' + '?client_id=56c4f3443da0d6ce6dcb60ba341c4e8d';
  } else {
    lastObjectUrl = src;
  }
  audio.src=src;
  audio.play();
}

var handleDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
}
var handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var objectUrl = URL.createObjectURL(e.dataTransfer.files[0]);
    play(objectUrl);
}

canvas.addEventListener('drop', handleDrop, false);
canvas.addEventListener('dragover', handleDragOver, false);
    
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

window.addEventListener("keyup", onKeyUp);


var transitionTime = 2000;

function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
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

play();
render(0);
