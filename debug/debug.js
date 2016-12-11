var shader = null;
var info = document.getElementById("info");

var uniforms = {
  iMusic: new Float32Array(16)
};

function getChunk(s) {
  var v = document.querySelector("div." + s + " input[type=text]").value;
  var c = document.querySelector("div." + s + " input[type=checkbox]").checked;
  return v && c ? v : "0.0";
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
    "   float d = distance(center, uv);",
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
  if (shader) gl.deleteProgram(shader.programInfo.program);
  shader = s;
}

function  render(time) {
  currentTime = time;
  window.requestAnimationFrame(render);
  clubber.update(time);
  for(var i = 0; i< 4; i++) 
    data.bands[i](uniforms.iMusic, 4*i);
  uniforms.iResolution = [gl.canvas.width, gl.canvas.height,0];
  data.time = time/1000;
  gl.clear(gl.COLOR_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  shader.render(data, true);
}

reload();
soundcloud("https://soundcloud.com/draufunddran/drauf-und-dran-2eur");
render(0);