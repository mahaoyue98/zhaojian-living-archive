const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_state;
  uniform float u_energy;

  #define PI 3.14159265359

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rotation * p * 2.03 + 13.7;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 palette(float t, float state) {
    vec3 a = vec3(0.55, 0.55, 0.57);
    vec3 b = vec3(0.38, 0.30, 0.28);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.02, 0.18, 0.34);
    if (state > 0.5 && state < 1.5) {
      a = vec3(0.50, 0.53, 0.48);
      b = vec3(0.42, 0.34, 0.38);
      d = vec3(0.14, 0.02, 0.48);
    } else if (state > 1.5) {
      a = vec3(0.56, 0.48, 0.42);
      b = vec3(0.42, 0.29, 0.25);
      d = vec3(0.02, 0.28, 0.22);
    }
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = (frag - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    uv.x -= 0.14;
    vec2 pointer = (u_pointer - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
    pointer.x -= 0.18;

    float phase = u_time * (0.055 + u_state * 0.012);
    float breathing = sin(phase * 2.1) * 0.035;
    vec2 warp = vec2(fbm(uv * 2.1 + phase), fbm(uv * 2.0 - phase + 8.3)) - 0.5;
    float pointerField = exp(-5.5 * length(uv - pointer));
    uv += warp * (0.18 + u_state * 0.025) + normalize(uv - pointer + 0.001) * pointerField * (0.08 + u_energy * 0.11);

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float silhouette = 0.57 + breathing + 0.075 * sin(angle * 3.0 + phase * 1.5) + 0.05 * sin(angle * 5.0 - phase);
    silhouette += (fbm(vec2(angle * 1.2, phase * 0.5)) - 0.5) * 0.16;
    float shape = smoothstep(silhouette + 0.022, silhouette - 0.022, radius);

    float inner = fbm(uv * 3.4 + warp * 1.8 + phase * 0.4);
    float veins = pow(abs(sin((inner + radius * 0.8 - angle * 0.06) * 18.0)), 10.0);
    float spectral = inner * 1.8 + angle / PI * 0.18 + phase * 0.1;
    vec3 pearl = palette(spectral, u_state);
    vec3 silver = mix(vec3(0.81, 0.84, 0.82), vec3(0.19, 0.22, 0.25), inner);
    vec3 material = mix(silver, pearl, 0.62 + pointerField * 0.25);
    material += veins * vec3(0.28, 0.24, 0.20);

    float edge = smoothstep(0.065, 0.0, abs(radius - silhouette));
    material += edge * vec3(0.62, 0.68, 0.70) * 0.35;
    float ca = smoothstep(silhouette + 0.014, silhouette - 0.014, radius);
    material.r *= smoothstep(silhouette + 0.035, silhouette - 0.015, radius);
    material.b += (ca - shape) * 0.5;

    vec3 ground = vec3(0.91, 0.90, 0.87);
    float shadow = smoothstep(0.95, 0.30, radius) * 0.08;
    ground -= shadow * vec3(0.50, 0.46, 0.39);
    vec3 color = mix(ground, material, shape * 0.94);
    color = mix(color, ground, (1.0 - shape) * pointerField * 0.08);

    float vignette = smoothstep(1.3, 0.25, length((frag / u_resolution) - 0.5));
    color *= 0.96 + vignette * 0.045;
    color += (hash(frag + u_time) - 0.5) * 0.018;
    color = pow(color, vec3(0.94));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

export function createMaterial(canvas, { onTick, reducedMotion }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, 'a_position');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    pointer: gl.getUniformLocation(program, 'u_pointer'),
    time: gl.getUniformLocation(program, 'u_time'),
    state: gl.getUniformLocation(program, 'u_state'),
    energy: gl.getUniformLocation(program, 'u_energy')
  };

  let state = 0;
  let energy = 0;
  let pointer = { x: 0.62, y: 0.48 };
  let targetPointer = { ...pointer };
  const startedAt = performance.now();

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.floor(innerWidth * ratio);
    const height = Math.floor(innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function move(event) {
    const point = event.touches?.[0] || event;
    targetPointer.x = point.clientX / innerWidth;
    targetPointer.y = 1 - point.clientY / innerHeight;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('touchmove', move, { passive: true });
  resize();

  function frame(now) {
    pointer.x += (targetPointer.x - pointer.x) * 0.035;
    pointer.y += (targetPointer.y - pointer.y) * 0.035;
    energy *= 0.975;
    const time = reducedMotion.matches ? 12.0 : (now - startedAt) / 1000;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.state, state);
    gl.uniform1f(uniforms.energy, energy);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    onTick?.(time, pointer);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setState(value) { state = value; },
    addEnergy(value) { energy = Math.min(1, energy + value); },
    getPointer() { return { ...pointer }; }
  };
}
