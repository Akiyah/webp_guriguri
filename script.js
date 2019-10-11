var dataURLs;

function mouseMove(event) {
  move(event.offsetX);
}

function touchMove(event) {
  var touch = event.touches[0];
  var x = touch.pageX - touch.target.offsetLeft;
  move(x);
}

function move(x) {
  var width = document.getElementById('outputImg').width;
  var f = Math.floor(x / width * dataURLs.length)
  f = Math.max(f, 0);
  f = Math.min(f, dataURLs.length - 1);
  show(f);
}

function show(f) {
  document.getElementById('outputImg').src = dataURLs[f];
}

function loadfile(filename) {
  var http = new XMLHttpRequest();
  http.open('get', filename);
  http.overrideMimeType('text/plain; charset=x-user-defined');

  http.onreadystatechange = function() {
    if (http.readyState == 4) {
      dataURLs = decode(http.responseText);
      show(0);
    }
  };
  http.send(null);
}

function convertTextToArray(text) {
  return text.split('').map(function(e) {
    return e.charCodeAt(0) & 0xff;
  });
}

function copyRgba(rgbaTo, rgbaFrom, rgbaFromOld, width, height) {
  for (var i = 0; i < width * height * 4; i += 4) {
    if (!rgbaFromOld || rgbaFrom[i + 3] > 0) {
      rgbaTo[i + 3] = rgbaFrom[i + 3];
      rgbaTo[i    ] = rgbaFrom[i   ];
      rgbaTo[i + 1] = rgbaFrom[i + 1];
      rgbaTo[i + 2] = rgbaFrom[i + 2];
    } else {
      rgbaTo[i + 3] = rgbaFromOld[i + 3];
      rgbaTo[i    ] = rgbaFromOld[i    ];
      rgbaTo[i + 1] = rgbaFromOld[i + 1];
      rgbaTo[i + 2] = rgbaFromOld[i + 2];
    }
  }
}

function decode(responseText) {
  var webpdecoder = new WebPDecoder();
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext('2d');

  var dataURLs = [];
  var responseArray = convertTextToArray(responseText);
  var imagearray = WebPRiffParser(responseArray, 0);

  var header = imagearray['header'] ? imagearray['header'] : null;
  var frames = imagearray['frames'] ? imagearray['frames'] : null;

  if (header) {
    canvas.width = header['canvas_width'];
    canvas.height = header['canvas_height'];
  }

  for (var f = 0; f < frames.length; f++) {
    var frame = frames[f];

    var offset_x = frame['offset_x'] ? frame['offset_x'] : 0;
    var offset_y = frame['offset_y'] ? frame['offset_y'] : 0;

    var widthParam = [0];
    var heightParam = [0];
    var rgba = webpdecoder.WebPDecodeRGBA(responseArray, frame['src_off'], frame['src_size'], widthParam, heightParam);
    var width = widthParam[0];
    var height = heightParam[0];

    if (!header) {
      canvas.width = width;
      canvas.height = height;
    }

    var imageDataOld = ctx.getImageData(offset_x, offset_y, width, height);
    var imageData = ctx.createImageData(width, height);

    var imageDataOld_data = null;
    if (frame['blend'] == 0) {
      imageDataOld_data = imageDataOld.data;
    }
    copyRgba(imageData.data, rgba, imageDataOld_data, width, height);

    ctx.putImageData(imageData, offset_x, offset_y);

    dataURLs.push(canvas.toDataURL("image/png"));

    if (frame['dispose'] == 1) {
      ctx.clearRect(offset_x, offset_y, width, height);
    }
  }

  return dataURLs;
}

