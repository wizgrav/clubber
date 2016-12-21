// Shadertoy ids
var shaderIds = ["4dsGzH","MsjSW3","4tlSzl", "MdlXRS","lslXDn","XsXXDn","MdBSDt","MlXSWX","XsBXWt"];
templates = ["0234", "0234", "0234", "0234"];

shaderIds.forEach(function (s, i) {
  var p = getParameterByName("sh"+i);
  if (p) shaderIds[i] = p;
})

var smoothing = document.getElementById("smoothing");

function threshold(){
  var id=(count++)% 3;
  smoothing.innerHTML = ["low", "mid", "high"][id];
  smoothing.style.opacity = 0.2 + 0.3 * id;
  clubber.smoothing = [0.66, 0.8, 0.92][id];
}

var count = 1;

var arr, correctArray = [0, 1, 1, 1];
if(arr = getParameterByName("correct")) {
  arr.split(",").forEach(function (v, i) {correctArray[i] = parseFloat(v);});
  needsCorrection = true;
}
var noise = document.querySelector("#noise");
var uniforms = {
  iMusic: new Float32Array(16),
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
    correct: needsCorrection
  });

debugShader.transition = 0.5;
var debugBands = false;

threshold();
    
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
    attribution(v);
  }
}

window.addEventListener("keyup", onKeyUp);

var orig = document.querySelector("#orig");
  
function attribution(i) {
  orig.setAttribute("href", "https://www.shadertoy.com/view/"+shaderIds[i]);
}
 
smoothArrays = [
  [0.08,0.09,0.1,0.1],
  [0.08,0.09,0.1,0.1],
  [0.08,0.09,0.1,0.1],
  [0.08,0.09,0.1,0.1]
];

initClubber();

var transitionTime = 2000;

function render(time) {
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
      var tr = Math.pow(delta/transitionTime, 1.6);
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

attribution(8);
soundcloud("https://soundcloud.com/draufunddran/drauf-und-dran-2eur");
render(0);
