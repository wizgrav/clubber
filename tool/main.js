
var DESCRIPTIONS = Clubber.prototype.descriptions;

var descriptions = [];
var descriptionEl = document.querySelector("#descriptions");
function initDescriptions () {
  var el = descriptionEl;
  for(var i=0; i < 20; i++){
    var el2 = document.createElement("div");
    el2.setAttribute("title", "");
    el2.style.left = (100*i/25 - 2) + "vw";
    descriptions.push(el2);
    el.appendChild(el2);
  }
}

initDescriptions();

var bandIndex = 0;

function changeTemplate(el) {
  var t = templates[bandIndex];
  var a = ["Change data types for iMusic[" + bandIndex + "] vec4. Pack of single digit indices. Available indices:\n"];
  DESCRIPTIONS.forEach(function (k,i){
    a.push(i + (t.match(i) ? " * " : "   ") + k);
  });
  var s = prompt(a.join("\n"),t);
  if(!s ) return;
  if(!s.match(/^[0-9]{4,4}$/)){
    alert("template must be exactly 4 characters long and consist of indices 0-9");
    return;
  }
  el.innerHTML = s;
  templates[bandIndex] = s;
  initClubber("?" + genState());
  reMod();
  updateDescriptions();
}

numinputs = document.querySelectorAll("#config input");
templateButton = document.querySelector("#config #template");
selectEl = document.querySelector("select");

var currentBand = 0;

function selectBand(idx) {
  bandIndex = idx;
  selectEl.selectedIndex = idx;
  selectEl.style.backgroundColor = selectEl.options[idx].style.backgroundColor;
  selectEl.style.color = selectEl.options[idx].style.color;
  for(j=0;j<12;j++) {
    numinputs[j].value = [rangeArrays,smoothArrays,adaptArrays][Math.floor(j/4)][bandIndex][j&3]; 
  }
  templateButton.innerHTML = templates[bandIndex];
}


function updateBand() {
  for(j=0;j<12;j++) {
    [rangeArrays,smoothArrays,adaptArrays][Math.floor(j/4)][bandIndex][j&3] = parseFloat(numinputs[j].value); 
  }
  localStorage.setItem("clubber-config-"+bandIndex, "?"+serialize(bandIndex, true));
  reMod();
}

function updateDescriptions() {
  for(var i=0; i< 4; i++){
    for(var j=0; j< 4; j++){
      var el = descriptions[5*i + j];
      var t = templates[i][j];
      var h = ("xyzw"[j]);
      el.setAttribute("title", h + " = " + (t ? DESCRIPTIONS[parseInt(t)]:"Invalid index, using strongest note"));
    }
  }
}

var shaders = [null];
var info = document.getElementById("info");
var octaves = document.getElementById("octaves");
for(var i=0; i<11; i++){
  var el = document.createElement("div");
  el.classList.add("octave");
  el.innerHTML = 12*i;
  el.style.left = 0.33 + 100*i/10.66 + "vw";
  octaves.appendChild(el);
}

for(var i=0; i < 4; i++) {
  var s = localStorage.getItem("clubber-config-"+i);
  if(s) initClubber("?"+s);
}

initClubber();

if (getParameterByName("reset")){
  localStorage.removeItem("soundcloud-track");
}

selectBand(0);

var noteTexOptions = {
  src: clubber.notes, min: gl.LINEAR,
  width: 128, height:1, format: gl.LUMINANCE, internalFormat:gl.LUMINANCE
};

var uniforms = {
  iClubber: new Float32Array(4),
  iMusic: new Float32Array(16),
  iNotes: twgl.createTexture(gl, noteTexOptions),
  iBounds: new Float32Array(4)
};

function getChannels(inputs) {
  var ret = {}, pf = "http://www.shadertoy.com";
  inputs.forEach(function (ch,i) {
    if(ch.ctype === "cubemap"){
      var src = [pf+ch.src];
      var prefix = ch.src.split(".")[0];
      for(var j=1; j < 6; j++) src.push(pf + prefix + "_" + j + ".png");
      ret["iChannel"+i] = twgl.createTexture({ target: gl.TEXTURE_CUBE_MAP, src: src });
    } else {
      ret["iChannel"+i] = twgl.createTexture({ src: ch.src });
    }
  });
  return ret;
}

["red", "green", "blue", "alpha"].forEach(function (s){
  var v = getParameterByName(s);
  v = v ? decodeURIComponent(v) : localStorage.getItem("clubber-tool-"+s);
  if (v) document.querySelector("div." + s + " input[type=text]").value = v;
});

var TRACK = getParameterByName("track");

function getChunk(s) {
  var v = document.querySelector("div." + s + " input[type=text]").value;
  var c = document.querySelector("div." + s + " input[type=checkbox]").checked;
  if ( v ) localStorage.setItem("clubber-tool-"+s, v); else localStorage.removeItem("clubber-tool-"+s); 
  return v && c ? v : "0.0";
}

shaders.push(new Shader(gl, { 
    source: load("../assets/shaders/debug.fs"), 
    uniforms: uniforms,
    correct: false,
    debug: true
  })
);

shaders.push(new Shader(gl, { 
    source: load("../assets/shaders/spectrum.fs"), 
    uniforms: uniforms, 
    correct: false,
    debug: true,
  })
);

var ALT = null; 
var ALTEXT = null;

var defaultShaders = {
  "No shader": "*",
  "Generators by Kali": "https://www.shadertoy.com/view/XtySDy",
  "Fractal land by Kali": "https://www.shadertoy.com/view/ltyXR1",
  "Seascape by TDM": "https://www.shadertoy.com/view/4lKSzh",
  "Cypher by dila": "https://www.shadertoy.com/view/MlGSzW",
  "Bello by wizgrav": "https://www.shadertoy.com/view/MtGSWz",
};

function loadShader(s) {
  var texts = [], shaders=[];
  Object.keys(defaultShaders).forEach(function(k,i){
    texts.push(i + ") " + k);
    shaders.push(defaultShaders[k]);
  });
  s = s || prompt("Provide a shadertoy url or  single digit to select from the defaults:\n\n"+texts.join("\n"), ALT ? ALT: "");
  if(!s) return;
  var si = parseInt(s);
  s = shaders[si] ? shaders[si]:s;
  if(s === "*") {
    ALT = ALTEXT = null;
    if(altShader) {
      gl.deleteProgram(altShader.programInfo.program);
      altShader = null;
    }
    return;
  }
  shadertoy(s).then(function(t){ ALT=s; ALTEXT=t; reloadAll(); RATIO=4;});
}

if(getParameterByName("shader")){
  loadShader(getParameterByName("shader"));
} 
var altShader = null;

var debugMode = 0;

var textArea = document.querySelector("#export textarea");

function toggleExport(el) {
  
  if(el.classList.contains("disabled")) {
    document.querySelector("#export").style.display = "block";
    el.classList.remove("disabled");
  } else {
    document.querySelector("#export").style.display = "none";
    el.classList.add("disabled");
  }
}

function bands(el) {
  debugMode = (++debugMode) % 2;
  octaves.classList.remove("show");
  descriptionEl.classList.remove("show");
  if(debugMode){
    octaves.classList.add("show");
    descriptionEl.classList.add("show");
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
}

function stateLink(el){
  el.href = "https://wizgrav.github.io/clubber/tool/index.html?"+genState();
}

function sourceLink(el){
  if(!ALT) return;
  el.href = "//www.shadertoy.com/view/" + ALT.split("?")[0].split("/").pop();
}

function genState() {
  var a = ["tool=1"];
  for(var i=0;i<4;i++){
    a.push(serialize(i, true));
  }
  ["red", "green", "blue", "alpha"].forEach(function (s){
    var vs = localStorage.getItem("clubber-tool-"+s);
    if(vs) a.push(s+"="+encodeURIComponent(vs));
  });
  var v = localStorage.getItem("soundcloud-track");
  if(v) a.push("track="+encodeURIComponent(v));
  if(ALT) a.push("shader="+encodeURIComponent(ALT))
  return a.join("&");
}

function serialize(i,clean) {
  var s = "t" + i + "= " + templates[i];
  s += " &r" + i + "= " + rangeArrays[i].join(", ");
  s += " &s" + i + "= " + smoothArrays[i].join(", ");
  s += " &a" + i + "= " + adaptArrays[i].join(", ");
  return clean ? s.replace(/\s/g, '') : s;
}
function handleClick(e) {
  if (!debugMode) return;
  var i = false, x = e.clientX/this.clientWidth;
  if(debugMode === 1) {
    i = Math.floor(4 * x);
  } else {
    for (var j=0; j < 4; j++) {
      if( x > uniforms.iBounds[4 * j] && x < uniforms.iBounds[4 * j + 1]) {
        i = j;
        break;
      }
    }
  }
  if (i === false) return;
  selectBand(i);
}
canvas.addEventListener("click", handleClick);
descriptionEl.addEventListener("click", handleClick);


function reloadAll (onlyMods) {
  if(ALTEXT) reload(ALTEXT);
}

function reMod(){
  ["red", "green", "blue", "alpha"].forEach(getChunk);
  var src = toJS(genState());
  textArea.textContent = ["function cl_"+Date.now()+"(clubber) {", src, "}"].join("\n");
  var fn = new Function("clubber", "config", src);
  modFn = fn(clubber);
}

function reload (alt) {
  var defines = {
    "CLUBBER": "1",
    "CLUBBER_R": "iClubber.r",
    "CLUBBER_G": "iClubber.g",
    "CLUBBER_B": "iClubber.b",
    "CLUBBER_A": "iClubber.a"
  };
  
  var s = new Shader(gl, { 
    source: alt.code, 
    uniforms: uniforms,
    channels: getChannels(alt.inputs),
    defines: defines,
    correct: needsCorrection,
    ondone: function (obj) {
      if(!obj.programInfo) return;
      if (altShader) gl.deleteProgram(altShader.programInfo.program);
      altShader = obj; 
    }
  });
}


var buttons = document.querySelectorAll("button");
window.addEventListener("keydown", function (e){
  if (e.altKey && e.key != "Alt") {
    var k = e.key.toLowerCase();
    var i = parseInt(k);
    var keys = {
      "r": "red",
      "g": "green",
      "b": "blue"
    };
    var pkeys = {
      "p": 0,
      "k": -5,
      "l": 5,
      "n": -30,
      "m": 30
    }
    if(!isNaN(i) && buttons[i-1].onclick){
      buttons[i-1].onclick();
    } else if(k in keys) {
      var el = document.querySelector("div."+keys[k]+" input[type=checkbox]");
      el.checked = !el.checked;
      el.onchange();
    } else if(k in pkeys) {
      var v = pkeys[k];
      if(!v) {
        if(audio.paused){
          audio.play();
        }else {
          audio.pause();
        }
      } else {
        audio.currentTime += v;
      }
    }
  }
});

var RATIO = 4;
var count = 0;
var lastRatio = 0;

function resizeCanvasToDisplaySize(canvas, time) {
  if(++count % 30 == 0 && RATIO > 1){
    if(lastRatio && time - lastRatio < 550){ RATIO *= 0.8; RATIO=Math.max(1,Math.floor(RATIO * 10) / 10); }
    lastRatio = time;
  }
  multiplier = RATIO > 0 ? 1/RATIO : 1;
  var width  = canvas.clientWidth  * multiplier | 0;
  var height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

window.addEventListener("resize", function () { RATIO=4; });

var modFn = null;
var editors = document.querySelectorAll("#editor > div > div");

var midiConfig = [
  {dev: null, channel: 0, ctrl: 0, id: 0},
  {dev: null, channel: 0, ctrl: 0, id: 0},
  {dev: null, channel: 0, ctrl: 0, id: 0},
  {dev: null, channel: 0, ctrl: 0, id: 0}
];

function setMidi(el, id) {
  var da = [null];
  var sa = [
    "Setup midi controller output, 3 arguments,  empty disables", "<DEVICE ID> <CHANNEL 0-15> <CONTROLLER 0-127>",
    "", "Available device IDs:", "0) Disable midi"];
  midi(function (ds) {
    var i = 0;
    ds.forEach(function (d) {
      i++;
      da.push(d);
      sa.push(i + ") " + d.name);
    });
    var mc = midiConfig[id];
    var res = prompt(sa.join("\n"), mc.id + " " + (mc.channel) + " " + ( mc.ctrl));
    var ra = res ? res.split(" ") : [0];
    
    el.textContent = "---";
    el.classList.add("disabled");  
  
    if(!ra.length || ra[0] == "0") {
      mc.dev = null; 
      return;
    }
    
    
    mc.id = parseInt(ra[0]);
    mc.dev = da[mc.id];
    mc.channel = ra[1] ? parseInt(ra[1]) : mc.channel;
    mc.ctrl = ra[2] ? parseInt(ra[2]) : mc.ctrl;
    
    el.textContent = "000".substring(0, 3 - mc.ctrl.toString().length) +  mc.ctrl;
    el.classList.remove("disabled");  
  
  }, false);
}

function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
  clubber.update(time);
  modFn(uniforms.iClubber);
  for(var i = 0; i< 4; i++){
    if(i === selectEl.selectedIndex) {
      var obj = modFn.internal.bounds[i];
      uniforms.iBounds[0] = obj.from / 128;
      uniforms.iBounds[1] = obj.to / 128;
      uniforms.iBounds[2] = obj.low / 128;
      uniforms.iBounds[3] = obj.high / 128;
    }
    var mc = midiConfig[i];
    if(mc.dev) {
      mc.dev.send([176 + mc.channel, mc.ctrl, Math.max(0,Math.min(1, uniforms.iClubber[i])) * 127]);
    }
    uniforms.iMusic.set( modFn.internal.bands[i], 4 * i);
    editors[i].style.width = (100 - 100 * uniforms.iClubber[i]) + "vw";
  }
  twgl.setTextureFromArray(gl, uniforms.iNotes, clubber.notes, noteTexOptions);
  data.time = time/1000;
  gl.clear(gl.COLOR_BUFFER_BIT);
  resizeCanvasToDisplaySize(gl.canvas, time);
  
  var h = gl.canvas.height, w = gl.canvas.width;

  uniforms.iResolution = [w, h, 0];
  gl.viewport(0, 0, w, h);
  
  if(altShader) altShader.render(data,true);
  if(debugMode) {
    gl.viewport(0,  h * 0.52, w, h * 0.25);
    uniforms.iResolution[1] = h * 0.25;
    uniforms.iResolution[2] = h * 0.52;
    shaders[1].transition = altShader ? 0.66 : 1.0;
    shaders[1].render(data, true);
    gl.viewport(0, 0, w, h * 0.49);
    uniforms.iResolution[1] = h * 0.49;
    uniforms.iResolution[2] = 0;
    shaders[2].transition = altShader ? 0.66 : 1.0;
    shaders[2].render(data, false);
  }
}

reMod();
selectBand(0);
reloadAll();
updateDescriptions();
soundcloud(TRACK || localStorage.getItem("soundcloud-track") || "https://soundcloud.com/draufunddran/drauf-und-dran-2eur");
render(0);