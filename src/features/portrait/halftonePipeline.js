/**
 * halftonePipeline.js
 *
 * WebGL2 Halftone Rendering Pipeline.
 * Renders an interactive portrait as a crisp, digital-print halftone matrix
 * composed of square pixel cells (cellSize: 7.0px, angle: 0°) on transparent substrate.
 *
 * - Dynamic dot sizing that strictly follows the active frame's shading and luminance.
 * - Transparent negative space between cells.
 * - Silhouette alpha preservation: original cutout boundary is respected.
 * - Dynamic active frame sync: in-place 512×512 sub-image upload keeps halftone dots
 *   updated with head gaze tracking across all 340 frames.
 * - Pure permanent halftone: hover colour reveal has been removed.
 */

export const HALFTONE_CONFIG = {
  mode: 0,                 // 0: mono
  shape: 2,                // 2: square pixel cell (digital print aesthetic)
  cellSize: 7.0,           // Square grid pitch in CSS px
  angle: 0,                // 0° for axis-aligned horizontal/vertical square pixels
  dotScale: 1.0,           // Scaling factor for cells
  inkColor: [1.0, 1.0, 1.0],         // Pure white square cells
  paperColor: [0.0, 0.0, 0.0],       // Black/transparent substrate
  contrast: 1.15,          // Balanced tonal contrast for distinct highlights and midtones
  brightness: 0.02,        // Brightness calibration for natural skin rendering
  invert: false,           // Negative print
  roughness: 0.0,          // 0.0 gives crisp, mathematically pure square edges
};

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const VIEW_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uResolution;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uFrame;
uniform float uTexels;
uniform float uShape;
uniform float uCell;
uniform float uAngle;
uniform float uScale;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uContrast;
uniform float uBrightness;
uniform float uInvert;
uniform float uRough;
uniform float uFormation;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

mat2 rotate(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec4 photo(vec2 p, float lod, float margin) {
  vec2 uv = (p - uFrame.xy) / uFrame.zw;
  vec4 c = textureLod(uImage, clamp(uv, 0.0, 1.0), lod);
  vec2 slack = margin * uCell / uFrame.zw;
  vec2 inside = step(-slack, uv) * step(uv, 1.0 + slack);
  float keep = inside.x * inside.y * c.a;
  return vec4(c.rgb, keep);
}

float metric(vec2 f) {
  if (uShape < 0.5) return length(f);
  if (uShape < 1.5) return length(f * vec2(0.8, 1.15));
  if (uShape < 2.5) return max(abs(f.x), abs(f.y));
  if (uShape < 3.5) return abs(f.x) + abs(f.y);
  if (uShape < 4.5) return abs(f.y);
  return min(abs(f.x), abs(f.y));
}

float reach(float t) {
  t = clamp(t, 0.0, 1.0);
  if (uShape < 2.5) {
    if (t <= 0.001) return 0.0;
    return mix(0.065, 0.44, pow(t, 0.82));
  }
  if (uShape < 3.5) return t < 0.5 ? sqrt(t * 0.5) : 1.0 - sqrt((1.0 - t) * 0.5);
  if (uShape < 4.5) return 0.52 * t;
  return (1.0 - sqrt(1.0 - t)) * 0.5 + 0.02 * t;
}

vec2 center(vec2 p, float angle) {
  vec2 q = rotate(angle) * p / uCell;
  vec2 c = floor(q) + 0.5;
  if (uShape > 3.5 && uShape < 4.5) c.x = q.x;
  return rotate(-angle) * c * uCell;
}

float dots(vec2 p, float angle, float t, float seed) {
  vec2 q = rotate(angle) * p / uCell;
  float d = metric(fract(q) - 0.5);
  if (uRough > 0.0) {
    d += (noise(p * 0.42 + seed * 17.0) - 0.5) * uRough * 0.18;
  }
  float r = reach(t) * uScale;
  float w = max(fwidth(d), 0.0001) * 0.75;
  return smoothstep(r + w, r - w, d) * clamp(r / (w * 2.0), 0.0, 1.0);
}

float coverage(vec4 image) {
  float luma = dot(image.rgb, LUMA);
  if (luma <= 0.02) return 0.0;
  float t = smoothstep(0.02, 0.96, luma);
  t = pow(t, 0.92);
  return clamp(t, 0.0, 1.0) * image.a;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  float base = uAngle;

  vec4 sharp = photo(p, 0.0, 0.0);
  if (sharp.a <= 0.001) {
    outColor = vec4(0.0);
    return;
  }

  // Formation sequence check (0.0 = fully unformed, 1.0 = fully formed steady-state)
  if (uFormation < 1.0) {
    if (uFormation <= 0.0) {
      outColor = vec4(0.0);
      return;
    }
    // Discrete cell center in normalized UV space [0..1]
    vec2 c = center(p, base);
    vec2 uvCell = (c - uFrame.xy) / uFrame.zw;

    // Focal origin at facial center (eyes & bridge of nose)
    vec2 delta = uvCell - vec2(0.50, 0.38);
    // Spatially coherent radial distance with slight vertical priority
    float dist = length(delta * vec2(1.05, 0.95));

    // Deterministic cell grid coordinates for pseudo-random jitter
    vec2 cellGrid = floor((rotate(base) * p) / uCell);
    float j = (hash(cellGrid) - 0.5) * 0.14;

    // Order key: cells with orderKey <= uFormation are revealed
    float orderKey = clamp((dist + j) / 0.78, 0.001, 0.999);
    if (orderKey > uFormation) {
      outColor = vec4(0.0);
      return;
    }
  }

  vec4 sampleAtCenter = photo(center(p, base), 0.0, 0.5);
  float t = coverage(sampleAtCenter);
  float kDot = dots(p, base, t, 0.0);

  // Pure halftone output: white dots over transparent negative space.
  outColor = vec4(uInk * kDot * sharp.a, kDot * sharp.a);
}
`;

// ── WebGL Helpers ─────────────────────────────────────────────────────────────

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[HalftonePipeline] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[HalftonePipeline] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function locateUniforms(gl, program, names) {
  const uniforms = {};
  for (const name of names) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return uniforms;
}

// ── Pipeline Class ────────────────────────────────────────────────────────────

export class HalftonePipeline {
  constructor(gl, _initialWidth, _initialHeight) {
    this.gl = gl;
    this.lastUploadedIdx = -1;

    // Compile view program
    this.viewProgram = linkProgram(gl, VERTEX_SHADER, VIEW_SHADER);
    if (!this.viewProgram) {
      throw new Error('Failed to compile Halftone shader program');
    }

    // Locate uniforms
    this.viewUniforms = locateUniforms(gl, this.viewProgram, [
      'uImage', 'uResolution', 'uView', 'uDpr',
      'uFrame', 'uTexels', 'uShape', 'uCell', 'uAngle',
      'uScale', 'uInk', 'uPaper', 'uContrast', 'uBrightness',
      'uInvert', 'uRough', 'uFormation'
    ]);

    // Geometry: Full-screen triangle covering [-1, 1] clip space
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Image Texture: Pre-allocated 512×512 RGBA
    this.imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  resize(_viewWidth, _viewHeight) {
    // Interface compatibility
  }

  updateFrameTexture(img, idx) {
    if (!img || !img.complete || img.naturalWidth !== 512 || img.naturalHeight !== 512) return;
    if (this.lastUploadedIdx === idx) return;

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.lastUploadedIdx = idx;
  }

  render(img, idx, viewWidth, viewHeight, canvasWidth, canvasHeight, dpr, formationProgress = 1.0) {
    const gl = this.gl;

    // 1. Upload frame image if index changed
    this.updateFrameTexture(img, idx);

    // 2. Render Halftone View Pass (direct to canvas)
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.viewProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.viewUniforms.uImage, 0);

    gl.uniform2f(this.viewUniforms.uResolution, canvasWidth, canvasHeight);
    gl.uniform2f(this.viewUniforms.uView, viewWidth, viewHeight);
    gl.uniform1f(this.viewUniforms.uDpr, dpr);
    gl.uniform4f(this.viewUniforms.uFrame, 0, 0, viewWidth, viewHeight);
    gl.uniform1f(this.viewUniforms.uTexels, 512 / viewWidth);
    gl.uniform1f(this.viewUniforms.uShape, HALFTONE_CONFIG.shape);
    gl.uniform1f(this.viewUniforms.uCell, HALFTONE_CONFIG.cellSize);
    gl.uniform1f(this.viewUniforms.uAngle, (HALFTONE_CONFIG.angle * Math.PI) / 180);
    gl.uniform1f(this.viewUniforms.uScale, HALFTONE_CONFIG.dotScale);
    gl.uniform3fv(this.viewUniforms.uInk, HALFTONE_CONFIG.inkColor);
    gl.uniform3fv(this.viewUniforms.uPaper, HALFTONE_CONFIG.paperColor);
    gl.uniform1f(this.viewUniforms.uContrast, HALFTONE_CONFIG.contrast);
    gl.uniform1f(this.viewUniforms.uBrightness, HALFTONE_CONFIG.brightness);
    gl.uniform1f(this.viewUniforms.uInvert, HALFTONE_CONFIG.invert ? 1 : 0);
    gl.uniform1f(this.viewUniforms.uRough, HALFTONE_CONFIG.roughness);
    gl.uniform1f(this.viewUniforms.uFormation, formationProgress);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    if (this.imageTexture) gl.deleteTexture(this.imageTexture);
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.viewProgram) gl.deleteProgram(this.viewProgram);
  }
}
