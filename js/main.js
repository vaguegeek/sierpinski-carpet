// Sierpinski Carpet 렌더링 (WebGL)
//
// 알고리즘: 정사각형을 3x3 격자(9칸)로 나눈 뒤 정중앙 칸을 제거하고,
// 남은 8개의 칸에 대해 동일한 과정을 depth가 0이 될 때까지 재귀적으로 반복한다.
// depth == 0 인 사각형만 실제로 그려지는 leaf(잎) 사각형이 된다.

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("이 브라우저는 WebGL을 지원하지 않습니다.");
  throw new Error("WebGL not supported");
}

const depthSlider = document.getElementById("depth");
const depthValueEl = document.getElementById("depthValue");
const fillColorInput = document.getElementById("fillColor");
const bgColorInput = document.getElementById("bgColor");
const squareCountEl = document.getElementById("squareCount");

// ---------- 셰이더 ----------

const VERTEX_SHADER_SRC = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("셰이더 컴파일 오류: " + log);
  }
  return shader;
}

function createProgram(gl, vertexSrc, fragmentSrc) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    throw new Error("프로그램 링크 오류: " + log);
  }
  return program;
}

const program = createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
gl.useProgram(program);

const aPositionLoc = gl.getAttribLocation(program, "aPosition");
const uColorLoc = gl.getUniformLocation(program, "uColor");

const vertexBuffer = gl.createBuffer();

// ---------- Sierpinski Carpet 좌표 생성 ----------

// (x, y): 정사각형의 좌하단 좌표, size: 한 변의 길이. 클립 좌표계 [-1, 1] 기준.
function subdivide(x, y, size, depth, squares) {
  if (depth === 0) {
    squares.push([x, y, size]);
    return;
  }
  const step = size / 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue; // 가운데 칸은 제거
      subdivide(x + i * step, y + j * step, step, depth - 1, squares);
    }
  }
}

function buildVertices(depth) {
  const squares = [];
  subdivide(-1, -1, 2, depth, squares);

  // 정사각형 하나당 삼각형 2개 = 정점 6개, 정점당 2개의 float(x, y)
  const vertices = new Float32Array(squares.length * 6 * 2);
  let idx = 0;
  for (const [x, y, size] of squares) {
    const x0 = x, y0 = y;
    const x1 = x + size, y1 = y + size;

    // 삼각형 1: (x0,y0) (x1,y0) (x0,y1)
    vertices[idx++] = x0; vertices[idx++] = y0;
    vertices[idx++] = x1; vertices[idx++] = y0;
    vertices[idx++] = x0; vertices[idx++] = y1;

    // 삼각형 2: (x1,y0) (x1,y1) (x0,y1)
    vertices[idx++] = x1; vertices[idx++] = y0;
    vertices[idx++] = x1; vertices[idx++] = y1;
    vertices[idx++] = x0; vertices[idx++] = y1;
  }

  return { vertices, squareCount: squares.length };
}

// ---------- 색상 유틸 ----------

function hexToRGBA(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

// ---------- 렌더링 ----------

let vertexCount = 0;

function render() {
  const [br, bg, bb] = hexToRGBA(bgColorInput.value);
  gl.clearColor(br, bg, bb, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.uniform4fv(uColorLoc, hexToRGBA(fillColorInput.value));

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function rebuild() {
  const depth = parseInt(depthSlider.value, 10);
  depthValueEl.textContent = depth;

  const { vertices, squareCount } = buildVertices(depth);
  vertexCount = vertices.length / 2;
  squareCountEl.textContent = squareCount.toLocaleString();

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  render();
}

depthSlider.addEventListener("input", rebuild);
fillColorInput.addEventListener("input", render);
bgColorInput.addEventListener("input", render);

gl.viewport(0, 0, canvas.width, canvas.height);
rebuild();
