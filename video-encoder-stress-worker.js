const kWidth = 640;
const kHeight = 480;
const kFps = 30.0;

let iterations = 20;

let status = {
  frameCountIn: 0,
  frameCountOut: 0,
  encodeTime: 0,
};

function reportProgress() {
  postMessage(status);
}

function createFrame(r, g, b) {
  const pixelSize = 4;
  const init = {
    timestamp: status.frameCountIn * 1000.0 * 1000.0 / kFps,  // us
    codedWidth: kWidth,
    codedHeight: kHeight,
    format: "RGBA",
  };
  const data = new Uint8Array(init.codedWidth * init.codedHeight * pixelSize);
  for (let x = 0; x < init.codedWidth; x++) {
    for (let y = 0; y < init.codedHeight; y++) {
      const offset = (y * init.codedWidth + x) * pixelSize;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 0x0ff; // Alpha
    }
  }
  return new VideoFrame(data, init);
}

function encodeFrame(encoder, frame) {
  const keyFrame = status.frameCountIn % 150 == 0;
  encoder.encode(frame, { keyFrame });
  frame.close();

  reportProgress();

  status.frameCountIn++;
}

function runEncodeLoop() {
  let startTime = performance.now(); 
  let encodeStartTime = null;

  const init = {
    output: _ => {
      if (encodeStartTime == null) {
        encodeStartTime = performance.now();
      }
      status.frameCountOut++;
    },
    error: (e) => {
      console.log(e.message);
      postMessage({ error: e.message });
    },
  };

  const config = {
    codec: "avc1.420034",
    width: kWidth,
    height: kHeight,
    bitrate: 2_000_000, // 2 Mbps
    framerate: kFps,
  };

  const encoder = new VideoEncoder(init);
  encoder.configure(config);

  let r = 0;
  let g = 100;
  let b = 200;
  for (let i = 0; i < 2000; i++) {
    r = (r + 1) % 255;
    g = (g + 1) % 255;
    b = (b + 1) % 255;
    encodeFrame(encoder, createFrame(r, g, b));
  }

  encoder.flush().then(_ => {
    status.encodeTime += performance.now() - encodeStartTime;
    encoder.close();
    reportProgress();

    --iterations;
    if (iterations > 0) {
      setTimeout(_ => runEncodeLoop());
    }
  });
}

runEncodeLoop();
