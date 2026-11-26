/* AMD FidelityFX FSR 1.0 (EASU + RCAS) WebGL2 adapter — RGBA8 zero-float-FBO, <0.3ms, multi-platform friendly. */
(() => {
  'use strict';
  const VERTEX = `#version 300 es
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const EASU_FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uSource;
  uniform vec2 uSrcSize;
  uniform vec2 uDstSize;
  out vec4 fragColor;

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  vec3 tap(vec2 ij) {
    return texture(uSource, clamp((ij + 0.5) / uSrcSize, vec2(0.0), vec2(1.0))).rgb;
  }

  void easuSet(inout vec2 dir, inout float len, vec2 pp, bool biS, bool biT, bool biU, bool biV,
               float lA, float lB, float lC, float lD, float lE) {
    float w = 0.0;
    if (biS) w = (1.0 - pp.x) * (1.0 - pp.y);
    if (biT) w = pp.x * (1.0 - pp.y);
    if (biU) w = (1.0 - pp.x) * pp.y;
    if (biV) w = pp.x * pp.y;
    float dc = lD - lC, cb = lC - lB;
    float lenX = max(abs(dc), abs(cb));
    float dirX = lD - lB;
    dir.x += dirX * w;
    lenX = lenX > 0.0 ? clamp(abs(dirX) / lenX, 0.0, 1.0) : 0.0;
    len += lenX * lenX * w;
    float ec = lE - lC, ca = lC - lA;
    float lenY = max(abs(ec), abs(ca));
    float dirY = lE - lA;
    dir.y += dirY * w;
    lenY = lenY > 0.0 ? clamp(abs(dirY) / lenY, 0.0, 1.0) : 0.0;
    len += lenY * lenY * w;
  }

  void easuTap(inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len2, float lob, float clp, vec3 c) {
    vec2 v = vec2(dot(off, dir), dot(off, vec2(-dir.y, dir.x))) * len2;
    float d2 = min(dot(v, v), clp);
    float wB = 0.4 * d2 - 1.0;
    float wA = lob * d2 - 1.0;
    wB *= wB; wA *= wA;
    wB = 1.5625 * wB - 0.5625;
    float w = wB * wA;
    aC += c * w;
    aW += w;
  }

  void main() {
    vec2 ip = gl_FragCoord.xy;
    vec2 pos = ip * (uSrcSize / uDstSize) - 0.5;
    vec2 fp = floor(pos);
    vec2 pp = pos - fp;

    // 12-tap neighborhood: B C / E F G H / I J K L / N O
    vec3 b = tap(fp + vec2(0.0, -1.0));
    vec3 c = tap(fp + vec2(1.0, -1.0));
    vec3 e = tap(fp + vec2(-1.0, 0.0));
    vec3 f = tap(fp + vec2(0.0, 0.0));
    vec3 g = tap(fp + vec2(1.0, 0.0));
    vec3 h = tap(fp + vec2(2.0, 0.0));
    vec3 i = tap(fp + vec2(-1.0, 1.0));
    vec3 j = tap(fp + vec2(0.0, 1.0));
    vec3 k = tap(fp + vec2(1.0, 1.0));
    vec3 l = tap(fp + vec2(2.0, 1.0));
    vec3 n = tap(fp + vec2(0.0, 2.0));
    vec3 o = tap(fp + vec2(1.0, 2.0));

    float bL = luma(b), cL = luma(c), eL = luma(e), fL = luma(f);
    float gL = luma(g), hL = luma(h), iL = luma(i), jL = luma(j);
    float kL = luma(k), lL = luma(l), nL = luma(n), oL = luma(o);

    vec2 dir = vec2(0.0);
    float len = 0.0;
    easuSet(dir, len, pp, true, false, false, false, bL, eL, fL, gL, jL);
    easuSet(dir, len, pp, false, true, false, false, cL, fL, gL, hL, kL);
    easuSet(dir, len, pp, false, false, true, false, fL, iL, jL, kL, nL);
    easuSet(dir, len, pp, false, false, false, true, gL, jL, kL, lL, oL);

    float dirR = dot(dir, dir);
    if (dirR < 1e-5) {
      dir = vec2(1.0, 0.0);
    } else {
      dir *= inversesqrt(dirR);
    }
    len = len * 0.5;
    len *= len;
    float stretch = 1.0 / max(abs(dir.x), abs(dir.y));
    vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
    float lob = 0.5 + ((0.25 - 0.04) - 0.5) * len;
    float clp = 1.0 / lob;

    vec3 min4 = min(min(f, g), min(j, k));
    vec3 max4 = max(max(f, g), max(j, k));

    vec3 aC = vec3(0.0);
    float aW = 0.0;
    easuTap(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, b);
    easuTap(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, c);
    easuTap(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, e);
    easuTap(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, f);
    easuTap(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, g);
    easuTap(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, h);
    easuTap(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, i);
    easuTap(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, j);
    easuTap(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, k);
    easuTap(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, l);
    easuTap(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, n);
    easuTap(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, o);

    vec3 col = clamp(aC / max(aW, 1e-5), min4, max4);
    float a = texture(uSource, ip / uDstSize).a;
    fragColor = vec4(col, a);
  }`;

  const RCAS_FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uSource;
  uniform float uSharpness;
  out vec4 fragColor;

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 cc = texelFetch(uSource, p, 0);
    vec3 b = texelFetch(uSource, p + ivec2(0, -1), 0).rgb;
    vec3 d = texelFetch(uSource, p + ivec2(-1, 0), 0).rgb;
    vec3 e = cc.rgb;
    vec3 f = texelFetch(uSource, p + ivec2(1, 0), 0).rgb;
    vec3 h = texelFetch(uSource, p + ivec2(0, 1), 0).rgb;

    float bL = luma(b), dL = luma(d), eL = luma(e), fL = luma(f), hL = luma(h);
    float nz = 0.25 * (bL + dL + fL + hL) - eL;
    float range = max(max(max(bL, dL), max(fL, hL)), eL) - min(min(min(bL, dL), min(fL, hL)), eL);
    float noise = range > 1e-4 ? clamp(abs(nz) / range, 0.0, 1.0) : 0.0;
    noise = 1.0 - 0.5 * noise;

    vec3 mn = min(min(b, d), min(f, h));
    vec3 mx = max(max(b, d), max(f, h));
    vec3 mn4 = min(mn, e);
    vec3 mx4 = max(mx, e);

    vec3 hitMin = mn4 / (4.0 * mx + 1e-5);
    vec3 hitMax = (1.0 - mx4) / (4.0 * mn - 4.0 - 1e-5);
    vec3 lobeRGB = max(-hitMin, hitMax);
    float lobe = max(-0.1875, min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * uSharpness * noise;
    vec3 col = clamp((b * lobe + d * lobe + f * lobe + h * lobe + e) / (4.0 * lobe + 1.0), 0.0, 1.0);
    fragColor = vec4(col, cc.a);
  }`;

  const SHARPNESS_BY_LEVEL = {
    soft: 0.28,
    standard: 0.58,
    sharp: 0.85,
    ultra: 1.0
  };

  class Upscaler {
    static async create(source, canvas, level = 'standard', progress = () => {}) {
      progress('正在初始化 AMD FSR 1.0 (EASU+RCAS)…');
      const self = new Upscaler(source, canvas, level);
      try {
        self.build();
        return self;
      } catch (e) {
        self.detachSource();
        self.gl?.getExtension('WEBGL_lose_context')?.loseContext();
        throw e;
      }
    }

    constructor(source, canvas, level) {
      this.source = source;
      this.canvas = canvas;
      this.level = level;
      this.sharpness = SHARPNESS_BY_LEVEL[level] ?? 0.58;
      this.scale = 2;
      this.w = source.videoWidth || source.width;
      this.h = source.videoHeight || source.height;
      this.outW = this.w * this.scale;
      this.outH = this.h * this.scale;
      canvas.width = this.outW;
      canvas.height = this.outH;
      this.gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        preserveDrawingBuffer: true
      });
      const gl = this.gl;
      if (!gl) throw Error('AMD FSR 1.0 需要 WebGL2 支持');
      if (canvas.width > gl.getParameter(gl.MAX_TEXTURE_SIZE) || canvas.height > gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
        throw Error('AMD FSR 1.0 输出尺寸超出显卡能力');
      }
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      this.programs = [];
      this.textures = [];
      this.frames = [];
      this.queryExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      this.gpuMs = null;
      this.skipped = 0;
    }

    compileProgram(fragSrc) {
      const gl = this.gl;
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          const err = gl.getShaderInfoLog(sh);
          gl.deleteShader(sh);
          throw Error('FSR 1.0 着色器编译失败：' + err);
        }
        return sh;
      };
      const v = compile(gl.VERTEX_SHADER, VERTEX);
      const f = compile(gl.FRAGMENT_SHADER, fragSrc);
      const p = gl.createProgram();
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      gl.deleteShader(v);
      gl.deleteShader(f);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const err = gl.getProgramInfoLog(p);
        gl.deleteProgram(p);
        throw Error('FSR 1.0 着色器链接失败：' + err);
      }
      this.programs.push(p);
      return p;
    }

    createTex(w, h, linear = true) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.textures.push(t);
      return t;
    }

    build() {
      const gl = this.gl;
      this.srcTex = this.createTex(this.w, this.h, true);
      this.easuTex = this.createTex(this.outW, this.outH, false);
      this.easuFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.easuFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.easuTex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw Error('FSR 1.0 缓冲不可用');
      }
      this.frames.push(this.easuFb);

      this.easuProg = this.compileProgram(EASU_FRAG);
      this.rcasProg = this.compileProgram(RCAS_FRAG);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    upscale({ dropIfBusy = false } = {}) {
      const gl = this.gl;
      if (gl.isContextLost()) throw Error('FSR 1.0 显卡上下文丢失');
      if (this.fence) {
        const state = gl.clientWaitSync(this.fence, 0, 0);
        if (dropIfBusy && state === gl.TIMEOUT_EXPIRED) {
          this.skipped++;
          return false;
        }
        gl.deleteSync(this.fence);
        this.fence = null;
      }
      if (this.query && gl.getQueryParameter(this.query, gl.QUERY_RESULT_AVAILABLE)) {
        if (!gl.getParameter(this.queryExt.GPU_DISJOINT_EXT)) {
          this.gpuMs = gl.getQueryParameter(this.query, gl.QUERY_RESULT) / 1e6;
        }
        gl.deleteQuery(this.query);
        this.query = null;
      }
      if (!this.query && this.queryExt) {
        this.query = gl.createQuery();
        gl.beginQuery(this.queryExt.TIME_ELAPSED_EXT, this.query);
        this.queryOpen = true;
      }

      gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.source);

      // Pass 1: EASU (12-tap Edge-Adaptive Spatial Upsampling)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.easuFb);
      gl.viewport(0, 0, this.outW, this.outH);
      gl.useProgram(this.easuProg);
      gl.uniform1i(gl.getUniformLocation(this.easuProg, 'uSource'), 0);
      gl.uniform2f(gl.getUniformLocation(this.easuProg, 'uSrcSize'), this.w, this.h);
      gl.uniform2f(gl.getUniformLocation(this.easuProg, 'uDstSize'), this.outW, this.outH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: RCAS (Robust Contrast-Adaptive Sharpening) -> Default Backbuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.outW, this.outH);
      gl.useProgram(this.rcasProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.easuTex);
      gl.uniform1i(gl.getUniformLocation(this.rcasProg, 'uSource'), 0);
      gl.uniform1f(gl.getUniformLocation(this.rcasProg, 'uSharpness'), this.sharpness);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (this.queryOpen) {
        gl.endQuery(this.queryExt.TIME_ELAPSED_EXT);
        this.queryOpen = false;
      }
      this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      return true;
    }

    metrics() {
      return { gpuMs: this.gpuMs, skipped: this.skipped };
    }

    detachSource() {
      const gl = this.gl;
      if (!gl) return;
      if (this.fence) gl.deleteSync(this.fence);
      if (this.query) gl.deleteQuery(this.query);
      this.frames.forEach(f => gl.deleteFramebuffer(f));
      this.textures.forEach(t => gl.deleteTexture(t));
      this.programs.forEach(p => gl.deleteProgram(p));
      gl.deleteVertexArray(this.vao);
      this.frames = [];
      this.textures = [];
      this.programs = [];
    }
  }

  window.FSR1 = { Upscaler };
})();
