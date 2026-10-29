/**
 * halftonePipeline.js
 *
 * WebGL2 Halftone Reveal Rendering Pipeline.
 * Adapted from React Bits HalftoneReveal for interactive multi-frame portraiture.
 *
 * Features:
 * - WebGL2 (#version 300 es) with ping-pong mask FBOs for smooth brush trail accumulation.
 * - Dynamic texture updating via gl.texSubImage2D on a pre-allocated 512×512 texture.
 * - Alpha transparency preservation: respects original PNG silhouette, outputting vec4(0.0)
 *   outside the subject so LightRays and GridCanvas remain visible.
 * - Photographic monochrome halftone printing (dot matrix) and sharp photographic reveal.
 * - Graceful lifecycle: handles context loss/restoration and resource cleanup.
 */

export const HALFTONE_CONFIG = {
  mode: 0,              // 0: mono
  shape: 0,             // 0: dot
  cellSize: 4.8,        // Spacing of the halftone screen in CSS px (preserves fine facial detail)
  angle: 45,            // Halftone screen angle (degrees)
  dotScale: 0.94,       // Dot size scale (keeps dots separated in midtones)
  inkColor: [0.04, 0.04, 0.05],   // Deep charcoal/black ink
  paperColor: [0.96, 0.95, 0.93], // Archival warm off-white paper
  contrast: 1.06,       // Contrast curve before dot mapping
  brightness: 0.0,      // Brightness offset
  invert: false,        // Invert negative/positive
  roughness: 0.012,     // Subtle paper fiber roughness
  revealRadius: 135,    // Reveal radius in CSS px around pointer
  softness: 0.65,       // Edge blend softness (smooth photographic falloff)
  linger: 1.15,         // Seconds for the reveal trail to fade back to halftone
};

const MASK_SCALE = 0.5;

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const MASK_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec2 uTexture;
uniform vec2 uView;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uSoftness;
uniform float uStrength;
uniform float uFade;
out vec4 outColor;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  return length(p - a - ab * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uTexture;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uView;
  float trail = max(texture(uPrevious, uv).r - uFade, 0.0);
  float band = max(uRadius * uSoftness, 1.0);
  float brush = clamp((uRadius - segment(p, uFrom, uTo)) / band, 0.0, 1.0);
  brush = brush * brush * (3.0 - 2.0 * brush);
  outColor = vec4(max(trail, brush * uStrength), 0.0, 0.0, 1.0);
}
`;

const VIEW_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uMask;
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

float grade(float v) {
  v = clamp((v - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  return mix(v, 1.0 - v, uInvert);
}

vec3 gradeColor(vec3 c) {
  return vec3(grade(c.r), grade(c.g), grade(c.b));
}

vec3 tone(vec3 c) {
  return pow(max(c, 0.0), vec3(1.5));
}

float press(float t, float alpha) {
  return (0.05 + clamp(t, 0.0, 1.0) * 0.89) * alpha;
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
  if (uShape < 0.5) return t < 0.785 ? sqrt(t / 3.14159) : mix(0.5, 0.72, (t - 0.785) / 0.215);
  if (uShape < 1.5) return t < 0.7 ? sqrt(t * 0.92 / 3.14159) : mix(0.4497, 0.72, (t - 0.7) / 0.3);
  if (uShape < 2.5) return 0.5 * sqrt(t) + 0.02 * t;
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
  d += (noise(p * 0.42 + seed * 17.0) - 0.5) * uRough * 0.18;
  float r = reach(t) * uScale;
  float w = max(fwidth(d), 0.0001) * 0.75;
  return smoothstep(r + w, r - w, d) * clamp(r / (w * 2.0), 0.0, 1.0);
}

float coverage(vec4 image) {
  float shade = dot(tone(gradeColor(image.rgb)), LUMA);
  float paper = dot(tone(uPaper), LUMA);
  float span = dot(tone(uInk), LUMA) - paper;
  float t = abs(span) < 0.02 ? 1.0 - shade : (shade - paper) / span;
  return press(t, image.a);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  float lod = log2(max(uCell * uTexels, 1.0));
  float base = uAngle;

  // Sharp photographic sample at exact fragment position
  vec4 sharp = photo(p, 0.0, 0.0);

  // Preserve silhouette transparency: discard completely if alpha is near zero
  if (sharp.a <= 0.001) {
    outColor = vec4(0.0);
    return;
  }

  // 1. Photographic halftone mono print calculation
  float kDot = dots(p, base, coverage(photo(center(p, base), lod, 0.5)), 0.0);
  vec3 print = mix(uPaper, uInk, kDot);

  // 2. Cursor reveal mask sampling
  vec2 maskUv = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  float shown = texture(uMask, maskUv).r;
  shown = shown * shown * (3.0 - 2.0 * shown);

  vec2 q = rotate(base) * p / uCell;
  float d = metric(fract(q) - 0.5);
  float r = reach(1.0) * 1.08 * shown;
  float w = max(fwidth(d), 0.0001) * 0.75;
  float k = smoothstep(r + w, r - w, d) * clamp(r / (w * 2.0), 0.0, 1.0);

  // 3. Monochrome photographic tone for revealed image
  float sharpLuma = dot(sharp.rgb, LUMA);
  vec3 real = vec3(sharpLuma);

  // 4. Composite print with sharp photo
  vec3 composite = mix(print, real, k);

  // 5. Premultiplied alpha for clean silhouette edge antialiasing
  outColor = vec4(composite * sharp.a, sharp.a);
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

function createMaskFBO(gl, width, height, floatMask) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (floatMask) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { texture, framebuffer, width, height };
}

function destroyMaskFBO(gl, mask) {
  if (!mask) return;
  if (mask.framebuffer) gl.deleteFramebuffer(mask.framebuffer);
  if (mask.texture) gl.deleteTexture(mask.texture);
}

// ── Pipeline Class ────────────────────────────────────────────────────────────

export class HalftonePipeline {
  constructor(gl, initialWidth, initialHeight) {
    this.gl = gl;
    this.floatMask = !!gl.getExtension('EXT_color_buffer_float');
    this.lastUploadedIdx = -1;

    // Compile programs
    this.maskProgram = linkProgram(gl, VERTEX_SHADER, MASK_SHADER);
    this.viewProgram = linkProgram(gl, VERTEX_SHADER, VIEW_SHADER);
    if (!this.maskProgram || !this.viewProgram) {
      throw new Error('Failed to compile HalftoneReveal shader programs');
    }

    // Locate uniforms
    this.maskUniforms = locateUniforms(gl, this.maskProgram, [
      'uPrevious', 'uTexture', 'uView', 'uFrom', 'uTo',
      'uRadius', 'uSoftness', 'uStrength', 'uFade'
    ]);

    this.viewUniforms = locateUniforms(gl, this.viewProgram, [
      'uImage', 'uMask', 'uResolution', 'uView', 'uDpr',
      'uFrame', 'uTexels', 'uShape', 'uCell', 'uAngle',
      'uScale', 'uInk', 'uPaper', 'uContrast', 'uBrightness',
      'uInvert', 'uRough'
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

    // Ping-pong mask framebuffers
    const mw = Math.max(2, Math.round(initialWidth * MASK_SCALE));
    const mh = Math.max(2, Math.round(initialHeight * MASK_SCALE));
    this.masks = [
      createMaskFBO(gl, mw, mh, this.floatMask),
      createMaskFBO(gl, mw, mh, this.floatMask)
    ];

    // Pointer brush smoothing state
    this.brush = { x: initialWidth / 2, y: initialHeight / 2, px: initialWidth / 2, py: initialHeight / 2 };
    this.presence = 0;
  }

  resize(viewWidth, viewHeight) {
    const gl = this.gl;
    const mw = Math.max(2, Math.round(viewWidth * MASK_SCALE));
    const mh = Math.max(2, Math.round(viewHeight * MASK_SCALE));
    if (mw !== this.masks[0].width || mh !== this.masks[0].height) {
      this.masks.forEach(m => destroyMaskFBO(gl, m));
      this.masks = [
        createMaskFBO(gl, mw, mh, this.floatMask),
        createMaskFBO(gl, mw, mh, this.floatMask)
      ];
    }
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

  render(img, idx, pointerState, dt, viewWidth, viewHeight, canvasWidth, canvasHeight, dpr) {
    const gl = this.gl;

    // 1. Upload frame image if index changed
    this.updateFrameTexture(img, idx);

    // 2. Advance pointer brush smoothing
    const targetX = pointerState.x;
    const targetY = pointerState.y;

    if (pointerState.fresh) {
      this.brush.x = this.brush.px = targetX;
      this.brush.y = this.brush.py = targetY;
      pointerState.fresh = false;
    } else {
      const follow = 1 - Math.exp(-dt / 0.035);
      this.brush.x += (targetX - this.brush.x) * follow;
      this.brush.y += (targetY - this.brush.y) * follow;
    }

    // Advance presence (active when pointer is inside portrait canvas bounds)
    const engaged = pointerState.inside;
    this.presence += ((engaged ? 1 : 0) - this.presence) * (1 - Math.exp(-dt / 0.16));

    // 3. Render Mask Pass (Ping-pong FBO feedback)
    const minimumFade = this.floatMask ? 0 : 1.5 / 255;
    const fade = Math.max(HALFTONE_CONFIG.linger > 0 ? dt / HALFTONE_CONFIG.linger : 1, minimumFade);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.masks[1].framebuffer);
    gl.viewport(0, 0, this.masks[1].width, this.masks[1].height);
    gl.useProgram(this.maskProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.masks[0].texture);
    gl.uniform1i(this.maskUniforms.uPrevious, 0);

    gl.uniform2f(this.maskUniforms.uTexture, this.masks[1].width, this.masks[1].height);
    gl.uniform2f(this.maskUniforms.uView, viewWidth, viewHeight);
    gl.uniform2f(this.maskUniforms.uFrom, this.brush.px, this.brush.py);
    gl.uniform2f(this.maskUniforms.uTo, this.brush.x, this.brush.y);
    gl.uniform1f(this.maskUniforms.uRadius, HALFTONE_CONFIG.revealRadius * (0.45 + 0.55 * this.presence));
    gl.uniform1f(this.maskUniforms.uSoftness, HALFTONE_CONFIG.softness);
    gl.uniform1f(this.maskUniforms.uStrength, this.presence);
    gl.uniform1f(this.maskUniforms.uFade, fade);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Swap mask buffers
    this.masks.reverse();
    this.brush.px = this.brush.x;
    this.brush.py = this.brush.y;

    // 4. Render View Pass (To Canvas)
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.viewProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.viewUniforms.uImage, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.masks[0].texture);
    gl.uniform1i(this.viewUniforms.uMask, 1);

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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    this.masks.forEach(m => destroyMaskFBO(gl, m));
    if (this.imageTexture) gl.deleteTexture(this.imageTexture);
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.maskProgram) gl.deleteProgram(this.maskProgram);
    if (this.viewProgram) gl.deleteProgram(this.viewProgram);
  }
}
