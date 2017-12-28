CLIENT_ID = "56c4f3443da0d6ce6dcb60ba341c4e8d";
TOY_ID = "rtrtw8";

var info = document.getElementById("info");
 
var audio = document.querySelector("audio");
audio.crossOrigin = "anonymous";

var canvas = document.querySelector("canvas");
var gl = twgl.getWebGLContext(canvas);
var ext = gl.getExtension("OES_standard_derivatives");
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.BLEND);
gl.clearColor(0, 0, 0, 1);

var lastObjectUrl = null;
var data = {}, needsCorrection = false, clubber;

try {
  clubber = new Clubber({thresholdFactor:0, size: 4096});
} catch(exc) {
  console.warn("Can't handle 4096 for fft size, degrading to 2048");
  clubber = new Clubber({thresholdFactor:0, size: 2048});
}

clubber.listen(audio);

var templates = ["0123", "0123", "0123", "0123"];


var smoothArrays = [
  [0.1,0.1,0.1,0.1],
  [0.1,0.1,0.1,0.1],
  [0.1,0.1,0.1,0.1],
  [0.1,0.1,0.1,0.1]
];

var adaptArrays = [
  [1,1,1,1],
  [1,1,1,1],
  [1,1,1,1],
  [1,1,1,1]
];

var rangeArrays = [
  [1, 32, 64, 128],
  [32, 48, 64, 128],
  [48, 64, 64, 128],
  [64, 96,  64, 128]
];

function toggleRepeat(el) {
  
  if( (audio.loop = !audio.loop) ){
    el.classList.remove("disabled");
  } else {
    el.classList.add("disabled");
  }
}

var clubberized = null;

function initClubber (query) {
  for(var i=0; i<4; i++){
    var o = {"s": smoothArrays, "r": rangeArrays, "a": adaptArrays}
    Object.keys(o).forEach(function (k) {
      var arrs = o[k];
      param = getParameterByName(k+i, query);
      if(param) {
        var arr = arrs[i];
        param.split(",").forEach(function(s,i){
          if( i < arr.length) arr[i] = parseFloat(s);
        });
      }
    });
    
    param = getParameterByName("t"+i, query);
    if(param && param.length > i) {
      templates[i] = param;
    }
  }
}

var handleDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
}
var handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var objectUrl = URL.createObjectURL(e.dataTransfer.files[0]);
    play(objectUrl, true);
}

canvas.addEventListener('drop', handleDrop, false);
canvas.addEventListener('dragover', handleDragOver, false);

function maximize () {
  var el = document.querySelector("canvas");
  var fs = el.webkitRequestFullScreen || el.requestFullScreen || msRequestFullScreen;
  fs.call(el);
}

function getParameterByName(name, search) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(search || location.search);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function play (src, dropped) {
  if(lastObjectUrl){
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
  if(window.stream) {
    var track = window.stream.getTracks()[0];
    track.stop();
    window.stream = null;
  }
  if(src instanceof MediaStream) {
    clubber.listen(clubber.context.createMediaStreamSource(src));
    window.stream = src;
    return;
  } else {
    clubber.listen(audio);
    clubber.muted = false;
    if(!dropped) {
      src = '//api.soundcloud.com/tracks/'+src+'/stream?client_id=' + CLIENT_ID;
    } else {
      lastObjectUrl = src;
    }
  }
  audio.src=src;
  audio.play();
}

function load (url, cb) {
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
      if(cb) {
        cb(this.status);
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

function change () {
  var url = localStorage.getItem("soundcloud-track");
  var sa = ["Enter a soundcloud track url"];
  function trunc(s,n){
      return (s.length > n) ? s.substr(0, n-1) + '...' : s;
  };
  if(audioDevices.length){
    sa.push("\nYou can also select live audio input by index:\n\n");
    audioDevices.forEach(function (d,i) {
      sa.push((2 * i) + " - " + trunc(d,24));
      sa.push((2 * i + 1) + " - (muted)" + trunc(d,24));
    });
  }
  url = prompt(sa.join("\n"), url);
  var nurl = parseInt(url);
  var devId = audioDevices[Math.floor(nurl/2)];
  if(devId) {
    navigator.mediaDevices.getUserMedia({audio: { deviceId: { exact: devId } }})
    .then(function(stream) {
      play(stream);
      clubber.muted = nurl & 1 ? true : false;
    })
  } else if (url) soundcloud(url);
}


audio.onerror = function () {
  console.log(audio.currentSrc);
  
  alert(
    audio.currentSrc.match("blob:")  ?
    "Bad audio file"
    :  
    "Soundcloud API limit reached, you could try again later.\nYou can also drop your own audio files in the page.\n\n"
  );
        
}
function soundcloud(url) {
  load("//api.soundcloud.com/resolve?url=" + encodeURIComponent(url.split("?")[0]) + "&client_id=" + CLIENT_ID).then(function (text) {
    var data = JSON.parse(text);
    //console.log(data);
    if (data.kind !== "track"){
      alert( "Please provide a track url, " + data.kind + " urls are not supported.");
      return;
    }
    info.innerHTML = "<a href='"+data.permalink_url+"' target='_blank'>Listening to "+data.title+" by "+data.user.username+"</a>";
    localStorage.setItem("soundcloud-track", url);
    play(data.id);
  }, function () {
    alert(url + " is not a valid soundcloud track url.")
  })
}

function shadertoy(url) {
  url = url.split("?")[0].split("/").pop();
  return load("//www.shadertoy.com/api/v1/shaders/" + url + "?key="+TOY_ID)
  .then(function(text){
    var obj = JSON.parse(text);
    console.log(obj);
    if(obj.Shader){
      return { code: obj.Shader.renderpass[0].code, inputs: obj.Shader.renderpass[0].inputs };
    }
  }); 
}

var audioDevices = [];

function enumerateDevices () {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return;
  }

  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
      if(device.kind !== "audioinput") return;
      audioDevices.push(device.deviceId);
    });
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });

}

enumerateDevices();

function patch(url, fn) {
  var wrap = document.createElement("iframe");
  wrap.style.display="none";
  wrap.setAttribute("sandbox", "allow-same-origin");
  wrap.onload = function () {
    fn(wrap.contentWindow.location.href);
    document.body.removeChild(wrap);
  }
  wrap.src=url;
  document.body.appendChild(wrap);
}

var transpile = GLSL({
    uniform: function (name) {
        return "uniforms."+name;
    }
});

function toJS(conf, silent) {

  function getParameterByName(name, config) {
    var ca = config.split("?");
    config = ca[ca.length - 1];
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(config);
    return results == null ? "0.0" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function parseArray(s) {
    var a = s.split(","), ret = [];
    a.forEach(function (aa) { ret.push(parseFloat(aa)); });
    return ret;
  }

  var fn, bands = [];
  var arr = [
    " uniform vec4 iTemp;",
    " uniform float iGlobalTime;",
  ];
  
  for(var i=0; i < 4; i++) {
      arr.push("  uniform vec4 iMusic_"+i+";");
  } 

  var head = arr.join("\n");

  function parse (config) {
    var fields = {}, glsl = [], exec = [""];
    ["red", "green", "blue", "alpha"].forEach(function (k) {
      fields[k] = getParameterByName(k, config);
    });
  
    for(var i=0; i < 4; i++) {
      var ra = parseArray(getParameterByName("r"+i, config));
      var c = {
        from: ra[0], to: ra[1], low: ra[2], high: ra[3],
        template: getParameterByName("t"+i, config),
        smooth: parseArray(getParameterByName("s"+i, config)),
        adapt: parseArray(getParameterByName("a"+i, config))
      };
      bands.push("clubber.band(" + JSON.stringify(c) + ")");
    }
    
    ["red", "green", "blue", "alpha"].forEach(function (k, i) {
      var ks = fields[k];
      var gprop = ks.replace(
        /\@/g, "iTemp."+k[0]).replace(
        /\$([0-3])/g, "iMusic[$1]").replace(
        /iMusic\[([0-3])\]/g, "iMusic_\$1"
      );
      glsl.push(" float f"+k+"(){ return " + gprop + "; }");
      exec.push(" output["+i + " + _offset ] = iTemp[" + i + "] = f"+k+"();");
    });
    
    var transpiled = transpile(head + glsl.join("\n"));
    var src = transpiled + exec.join("  \n");
    
    return [
      " var bands = [", 
        bands.join(","),
      " ];",
      " var uniforms = {",
      "   iTemp: new Float32Array(4),",
      "   iMusic_0: new Float32Array(4),",
      "   iMusic_1: new Float32Array(4),",
      "   iMusic_2: new Float32Array(4),",
      "   iMusic_3: new Float32Array(4)",
      " };",
      " function fn(output, _offset){",
        src,
      " }",
      " var ret = { bounds: new Array(4), bands: new Array(4) }, currentTime = -1;",
      " var update = function(output, offset) {",
      "   uniforms.iGlobalTime = clubber.time / 1000;",
      "   bands.forEach(function (b,i) { ret.bounds[i] = b(uniforms['iMusic_'+i]); ret.bands[i] = uniforms['iMusic_'+i]; });",
      "   for(var step=1000/clubber.fps; currentTime < clubber.time; currentTime += step){ fn(output, offset || 0); }",
      " }",
      " update.internal = ret;",
      " return update;",
    ].join("\n  ");
  }
  return parse (conf);
}

if(navigator.requestMIDIAccess) document.body.classList.add("midi");


function midi(fn, ins) {
  navigator.requestMIDIAccess().then(function (access) {
    fn(ins ? access.inputs: access.outputs);
  });
}