var Shader = function (renderer, config) {
  this.renderer = renderer;
  var source = config.source;
  var self = this;
  this.startTime = 0;
  
  function compile (source) {
    if(!source) {
      alert("Shader not found");
      return;
    }
    var defines = config.defines || {}, def=[];
    Object.keys(defines).forEach(function (d) {
      def.push("#define "+d+" "+defines[d]);
    });
    self.programInfo = twgl.createProgramInfo(self.renderer, 
      [self.vertexShader, [self.fragmentHeader, def.join("\n"), source, config.correct ? self.fragmentCorrect : self.fragmentMain].join("\n")],
      function(msg, line){
        alert(msg);
    });
    if(config.ondone) config.ondone(self);
  }
  if (config.source instanceof Promise) {
    config.source.then(compile);                                                          
  } else {
    compile(config.source);                                                       
  }
  var arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
  };
  this.bufferInfo = twgl.createBufferInfoFromArrays(this.renderer, arrays);
  this.mouse = [0, 0, 0, 0];
  this.transition = 1;
  this.uniforms = config.uniforms;
};

Shader.prototype.render = function (data, clear) {
  if(!this.programInfo) return;
  var gl = this.renderer;
  var uniforms = {
    iTransition: this.transition,
    iGlobalTime: (data.time - this.startTime) % (Math.PI*60),
    iMouse: this.mouse,
  }
  
  gl.useProgram(this.programInfo.program);
  twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
  twgl.setUniforms(this.programInfo, uniforms);
  if(this.uniforms) twgl.setUniforms(this.programInfo, this.uniforms);
  twgl.drawBufferInfo(gl, gl.TRIANGLES, this.bufferInfo);
};

Shader.prototype.vertexShader = [
  "precision highp float;",
  "attribute vec3 position;",
  "void main() {",
  "  gl_Position = vec4(position.xy,1.0, 1.0 );",
  "}"
].join("\n");

Shader.prototype.fragmentHeader = [
  "#extension GL_OES_standard_derivatives : enable",
  "precision highp float;",
  "uniform float iTransition;",
  "uniform vec4 iCorrect;",
  "uniform float iGlobalTime;",
  "uniform vec3 iResolution;",
  "uniform vec4 iMusic[4];",
  "uniform vec3 iMouse;",
  "uniform sampler2D iChannel0;",
  "uniform sampler2D iChannel1;",
  "uniform sampler2D iChannel2;",
  "uniform sampler2D iChannel3;",
  "uniform vec3 iChannelResolution[4];",
].join("\n")

Shader.prototype.fragmentMain = [
    "void main () {",
    " vec4 color = vec4(0.0);",
    " mainImage(color, gl_FragCoord.xy);",
    " const vec3 W = vec3(0.2125, 0.7154, 0.0721);",
    " float l = dot(color.rgb, W);",
    " color.a = iTransition < 1.0 ? iTransition * clamp(0.2,1.0,l): 1.0;",
    " gl_FragColor = color;",
    "}"
].join("\n");

Shader.prototype.fragmentCorrect = [
    "vec3 rgb2hsv(vec3 c)",
    "{",
    "    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);",
    "    vec4 p = c.y < c.b ? vec4(c.zy, K.wz) : vec4(c.yz, K.xy);",
    "    vec4 q = c.x < p.x ? vec4(p.xyw, c.x) : vec4(c.x, p.yzx);",
    "",
    "    float d = q.x - min(q.w, q.y);",
    "    float e = 1.0e-10;",
    "    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);",
    "}",
    "",
    "vec3 hsv2rgb(vec3 c)",
    "{",
    "    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
    "    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
    "    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
    "}",
    "void main () {",
    " vec4 color = vec4(0.0);",
    " mainImage(color, gl_FragCoord.xy);",
    " vec3 hsv = rgb2hsv(color.rgb);",
    " float l = hsv.z;",
    " hsv.yz *= iCorrect.zw;",
    " hsv.x = mix(iCorrect.x, iCorrect.y, hsv.x);",
    " color.rgb = hsv2rgb(hsv);",
    " color.a = iTransition < 1.0 ? iTransition * clamp(0.2,1.0,l): 1.0;",
    " gl_FragColor = color;",
    "}"
].join("\n");