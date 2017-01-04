
var DESCRIPTIONS = Clubber.prototype.descriptions;

var descriptions = [];
var descriptionEl = document.querySelector("#descriptions");
function initDescriptions () {
  var el = descriptionEl;
  for(var i=0; i< 20; i++){
    var el2 = document.createElement("div");
    el2.setAttribute("title", "");
    el2.style.left = (100*i/20) + "vw";
    descriptions.push(el2);
    el.appendChild(el2);
  }
}

initDescriptions();

var bandIndex = 0;

function changeTemplate(el) {
  var t = templates[bandIndex];
  var a = ["Change data types for iMusic[" + bandIndex + "] vec4. String of indices. Available indices:\n"];
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
  initClubber("?");
  updateDescriptions();
}

numinputs = document.querySelectorAll("#config input");
templateButton = document.querySelector("#config #template");
selectEl = document.querySelector("select");


function selectBand(idx) {
  bandIndex = idx;
  selectEl.selectedIndex = idx;
  selectEl.style.backgroundColor = ["rgb(255,220,220)", "rgb(220,255,220)","rgb(220,220,255)","rgb(232,232,232)"][idx];
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
  initClubber("?");
}

function updateDescriptions() {
  for(var i=0; i< 4; i++){
    for(var j=0; j< 4; j++){
      var el = descriptions[5*i + j];
      var t = templates[i][j];
      var h = "iMusic["+i+"]."+("xyzw"[j]);
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
  iMusic: new Float32Array(16),
  iNotes: twgl.createTexture(gl, noteTexOptions),
  iBounds: new Float32Array(16)
};

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
    source: load("../toy/shaders/debug.fs"), 
    uniforms: uniforms, 
    correct: false
  })
);

shaders.push(new Shader(gl, { 
    source: load("../toy/shaders/spectrum.fs"), 
    uniforms: uniforms, 
    correct: false
  })
);

var ALT = null; 
var ALTEXT = null;
var renderMods = true;

function loadShader(s) {
  s = s || prompt("Provide a shadertoy url.", ALT ? ALT: "");
  if(!s) return;
  shadertoy(s).then(function(t){ ALT=s; ALTEXT=t; reloadAll(); });
}

if(getParameterByName("shader")){
  loadShader(getParameterByName("shader"));
  document.getElementById("mods").onclick();
} 
var altShader = null;

var debugMode = 0;

function toggleMods(el) {
  renderMods = !renderMods;
  if(renderMods){
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
}

function bands(el) {
  debugMode = (++debugMode) % 3;
  octaves.classList.remove("show");
  descriptionEl.classList.remove("show");
  if(debugMode){
    if(debugMode == 2) {
      octaves.classList.add("show");
    } else if(debugMode == 1){
      descriptionEl.classList.add("show");
    }
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
  el.innerHTML = ["1 views", "1 bands", "1 spectrum"][debugMode];
}

function stateLink(el){
  el.href = window.location.origin+window.location.pathname+"?"+genState();
}

function sourceLink(el){
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


function reloadAll () {
  reload();
  if(ALTEXT) reload(ALTEXT);
}

function reload (alt) {
  
  var rtxt = getChunk("red");
  var gtxt = getChunk("green");
  var btxt = getChunk("blue");
  var atxt = getChunk("alpha");
  
  var defines = {
    "CLUBBER": "1",
    "CLUBBER_R": rtxt,
    "CLUBBER_G": gtxt,
    "CLUBBER_B": btxt,
    "CLUBBER_A": atxt
  };
  
  var txt = [
    "void mainImage(out vec4 color, vec2 fragCoord) {",
    " vec2 uv = fragCoord/iResolution.xy;",
    " vec4 fColor = vec4(0.);",
    " vec4 fields;",
    " fields.r = CLUBBER_R;",
    " fields.g = CLUBBER_G;",
    " fields.b = CLUBBER_B;",
    " fields.a = CLUBBER_A;",
    " fields *= 0.25;",
    " for(float i = 0.; i < 2.; i++) {",
    "   for(float j = 0.; j < 2.; j++) {",
    "     vec2 center = 0.25 + vec2(mod(i, 2.0), 1.0 - mod(j,2.0)) * 0.5;",
    "     float d = dot(abs(uv-center), vec2(1.0));",
    "     float f1 = 1.0 - smoothstep(fields.r - fwidth(d), fields.r, d);",
    "     float f2 = 1.0 - smoothstep(0.25 - fwidth(d), 0.25, d);",
    "     fColor.r = (0.01 * f2 + 0.99 * f1);",
    "     fColor.rgba = fColor.gbar;",
    "     fields.rgba = fields.gbar;",
    "   }",
    " }",
    " color.rgb = fColor.a > 0. ? vec3(fColor.a):  fColor.rgb;",
    " if(color.r + color.g + color.b > 0.) color.rgb += 0.33;",
    "}"
  ].join("\n");
  
  var s = new Shader(gl, { 
    source: alt ?  alt: txt , 
    uniforms: uniforms,
    defines: defines,
    correct: needsCorrection,
    ondone: function (obj) {
      if(!obj.programInfo) return;
      if(alt){
        if (altShader) gl.deleteProgram(altShader.programInfo.program);
        altShader = obj; 
      } else {
        if (shaders[0]) gl.deleteProgram(shaders[0].programInfo.program);
        shaders[0] = obj; 
      }    
    }
  });
  
  console.log(defines);
  
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


function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
  if(!shaders[0]) return;
  clubber.update(time);
  for(var i = 0; i< 4; i++){
    var obj = data.bands[i](uniforms.iMusic, 4*i);
    uniforms.iBounds[4 * i] = obj.from / 128;
    uniforms.iBounds[4 * i + 1] = obj.to / 128;
    uniforms.iBounds[4 * i + 2] = obj.low / 128;
    uniforms.iBounds[4 * i + 3] = obj.high / 128;
  }
  uniforms.iResolution = [gl.canvas.width, gl.canvas.height,0];
  twgl.setTextureFromArray(gl, uniforms.iNotes, clubber.notes, noteTexOptions);
  data.time = time/1000;
  gl.clear(gl.COLOR_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  shaders[0].transition = altShader ? 0.8 : 1;
  if(altShader) altShader.transition = renderMods || debugMode ? 0.4 : 1;
  if(debugMode) {
    shaders[0].transition = 0.66;
    shaders[debugMode].render(data, true);
  }
  
  if(renderMods) shaders[0].render(data, true);
  if(altShader) altShader.render(data,true);
}

reloadAll();
updateDescriptions();
soundcloud(TRACK || localStorage.getItem("soundcloud-track") || "https://soundcloud.com/draufunddran/drauf-und-dran-2eur");
render(0);