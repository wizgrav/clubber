CLIENT_ID = "56c4f3443da0d6ce6dcb60ba341c4e8d";
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
var data = {}, needsCorrection = false;

var clubber = new Clubber({thresholdFactor:0, size: 4096});
clubber.listen(audio);

var smoothArray = [0.1,0.1,0.1,0.1];

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

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function play (src, dropped) {
  if(lastObjectUrl){
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
  if(!dropped) {
    src = '//api.soundcloud.com/tracks/'+src+'/stream?client_id=' + CLIENT_ID;
  } else {
    lastObjectUrl = src;
  }
  audio.src=src;
  audio.play();
}

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

function change () {
  var url = prompt("Enter a soundcloud track url", "");
  if (url) soundcloud(url);
}

function soundcloud(url) {
  load("http://api.soundcloud.com/resolve?url=" + encodeURIComponent(url.split("?")[0]) + "&client_id=" + CLIENT_ID).then(function (text) {
    var data = JSON.parse(text);
    console.log(data);
    if (data.kind !== "track"){
      alert( "Please provide a track url, " + data.kind + " urls are not supported.");
      return;
    }
    info.innerHTML = "<a href='"+data.permalink_url+"' target='_blank'>Listening to "+data.title+" by "+data.user.username+"</a>";
    play(data.id);
  }, function () {
    alert("This is not a valid soundcloud track url.")
  })
}

