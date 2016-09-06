var Demo = function (el, source) {
  this.renderer = twgl.getWebGLContext(el);
  this.renderer.getExtension("OES_standard_derivatives");
  
  this.programInfo = twgl.createProgramInfo(this.renderer, [this.vertexShader, source? source: this.fragmentShader]);
  var arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
  };
  this.bufferInfo = twgl.createBufferInfoFromArrays(this.renderer, arrays);
  this.mouse = [0,0];
};

Demo.prototype.update = function (time, data) {
  var gl = this.renderer;
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  var uniforms = {
    iGlobalTime: time,
    iResolution: [gl.canvas.width, gl.canvas.height],
    //iMouse: [this.mouse[0]/gl.canvas.width, this.mouse[1]/gl.canvas.height,0,0],
    iMouse: [0.,-0.05,0,0],
    iMusicLow: data.low,
    iMusicMid: data.mid,
    iMusicHigh: data.high
  }
  gl.useProgram(this.programInfo.program);
  twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
  twgl.setUniforms(this.programInfo, uniforms);
  twgl.drawBufferInfo(gl, gl.TRIANGLES, this.bufferInfo);
};

Demo.prototype.vertexShader = [
  "precision highp float;",
	"attribute vec3 position;",
	"varying vec2 vUv;",
	"void main() {",
	"vUv = position.xy * 0.5 + 0.5;",
	"gl_Position = vec4(position.xy,1.0, 1.0 );",
	"}"
].join("\n");

Demo.prototype.fragmentShader = [
   "precision highp float;",
	 "varying vec2 vUv;",
	"uniform float iGlobalTime;",
	"uniform vec2 iResolution;",
	"uniform vec4 iMusicLow;",
    "uniform vec4 iMusicMid;",
    "uniform vec4 iMusicHigh;",

    "void main () {",
    " gl_FragColor.rgb =  mix(iMusicMid.rgb, iMusicHigh.bgr, gl_FragCoord.x/iResolution.x);",
    " gl_FragColor.a = 1.0;",
    "}"
].join("\n");