var shaders = [null];
var info = document.getElementById("info");

initClubber();

var noteTexOptions = {
  src: clubber.notes, min: gl.LINEAR,
  width: 128, height:1, format: gl.LUMINANCE, internalFormat:gl.LUMINANCE
};

var uniforms = {
  iMusic: new Float32Array(16),
  iNotes: twgl.createTexture(gl, noteTexOptions),
  iBounds: new Float32Array(16)
};

["red", "green", "blue"].forEach(function (s){
  var v = localStorage.getItem("rhythm-debugger-"+s);
  if (v) document.querySelector("div." + s + " input[type=text]").value = v;
});

function getChunk(s) {
  var v = document.querySelector("div." + s + " input[type=text]").value;
  var c = document.querySelector("div." + s + " input[type=checkbox]").checked;
  if ( v ) localStorage.setItem("rhythm-debugger-"+s, v); else localStorage.removeItem("rhythm-debugger-"+s); 
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

var debugMode = 0;

function bands(el) {
  debugMode = (++debugMode) % 3;
  if(debugMode){
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
  el.innerHTML = ["debug", "metrics", "spectrum"][debugMode];
}

function reload () {
  
  var rtxt = getChunk("red");
  var gtxt = getChunk("green");
  var btxt = getChunk("blue");
  
  var txt = [
    "void mainImage(out vec4 color, vec2 fragCoord) {",
    " vec2 uv = fragCoord/iResolution.xy;",
    " vec3 fColor = vec3(0.);",
    " vec3 sizes;",
    " sizes.r = " + rtxt + ";",
    " sizes.g = " + gtxt + ";",
    " sizes.b = " + btxt + ";",
    " sizes /= 2.0;",
    " vec2 center = vec2(0.5);",
    " for(int i = 0; i < 3; i++) {",
    "   float d = dot(abs(uv-center), vec2(1.0));",
    "   fColor.r = 1.0 - smoothstep(sizes.r - fwidth(d), sizes.r, d);",
    "   fColor.rgb = fColor.gbr;",
    "   sizes.rgb = sizes.gbr;",
    " }",
    " color.rgb = fColor;",
    "}"
  ].join("\n");  
  var s = new Shader(gl, { 
    source: txt, 
    uniforms: uniforms, 
    correct: needsCorrection
  });
  if(!s.programInfo) {
    alert("error compiling shader");
    return;
  }
  console.log(txt);
  if (shaders[0]) gl.deleteProgram(shaders[0].programInfo.program);
  shaders[0] = s;
}

function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
  clubber.update(time);
  for(var i = 0; i< 4; i++){
    var obj = data.bands[i](uniforms.iMusic, 4*i).scope;
    uniforms.iBounds[4 * i] = obj.config.from / 128;
    uniforms.iBounds[4 * i + 1] = obj.config.to / 128;
    uniforms.iBounds[4 * i + 2] = obj.low / 128;
    uniforms.iBounds[4 * i + 3] = obj.high / 128;
  }
  uniforms.iResolution = [gl.canvas.width, gl.canvas.height,0];
  twgl.setTextureFromArray(gl, uniforms.iNotes, clubber.notes, noteTexOptions);
  data.time = time/1000;
  gl.clear(gl.COLOR_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  shaders[0].transition = 1;
  shaders[debugMode].render(data, true);
  if(debugMode) {
    shaders[0].transition = 0.33;
    shaders[0].render(data, true);
  }
}

reload();
soundcloud(localStorage.getItem("soundcloud-track") || "https://soundcloud.com/draufunddran/drauf-und-dran-2eur");
render(0);