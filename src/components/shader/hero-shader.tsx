"use client";

import { useEffect, useRef } from "react";

import { readShaderPalette } from "./palettes";

/**
 * HeroShader — WebGL background used behind the homepage hero.
 *
 * Design notes
 * - Monochrome. Three drifting blobs blended into the canvas color; the
 *   third blob tracks the pointer with a smooth lerp for perceived weight.
 * - Theme-aware. Observes `<html class>` and swaps palettes without reload.
 * - Reduced-motion safe. Paints once at a stable time offset and stops.
 *
 * Known-good init order (this is what the previous version got wrong and
 * why it sometimes appeared blank until refresh):
 *   1. create program, bind buffer, look up uniforms
 *   2. resize()                 — sets u_resolution from clientWidth/Height
 *   3. applyPalette() + uMouse  — sets all remaining uniforms
 *   4. drawArrays()              — first paint with a valid fragment math
 *   5. start RAF                  — only after all of the above
 */

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_canvas;
uniform vec3  u_tintA;
uniform vec3  u_tintB;
uniform vec3  u_tintC;
uniform float u_density;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return exp(-d * d / (r * r));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  float aspect = u_resolution.x / u_resolution.y;
  p.x *= aspect;

  // Mouse: convert 0..1 client-space to same signed aspect-corrected space,
  // inverting y because fragment y is bottom-up and client y is top-down.
  vec2 m = u_mouse * 2.0 - 1.0;
  m.x *= aspect;
  m.y = -m.y;

  float t = u_time * 0.05;

  // Two ambient blobs drift on their own orbits.
  vec2 cA = vec2(sin(t * 0.9) * 0.55 - 0.5, cos(t * 0.7) * 0.35 + 0.2);
  vec2 cB = vec2(cos(t * 0.6) * 0.55 + 0.45, sin(t * 0.8) * 0.4 - 0.1);

  // Third blob leans 85% toward the mouse, blended with its own slow orbit
  // so it never feels "locked" to the cursor — it follows with weight.
  vec2 orbit = vec2(sin(t * 0.5 + 1.2) * 0.5, cos(t * 0.4 + 0.8) * 0.45);
  vec2 cM = mix(orbit, m, 0.85);

  float bA = blob(p, cA, 1.1)  * u_density;
  float bB = blob(p, cB, 0.95) * u_density;
  float bM = blob(p, cM, 0.85) * u_density;

  vec3 col = u_canvas;
  col = mix(col, u_tintA, bA);
  col = mix(col, u_tintB, bB * 0.9);
  col = mix(col, u_tintC, bM * 0.8);

  // Whisper of film grain to keep the gradient from banding.
  float g = noise(uv * 180.0 + u_time * 8.0) - 0.5;
  col += g * 0.01;

  // Soft radial vignette back to canvas — keeps edges calm.
  float v = smoothstep(0.3, 1.4, length(p * vec2(0.78, 1.0)));
  col = mix(col, u_canvas, v * 0.45);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile failed: " + log);
  }
  return shader;
}

type HeroShaderProps = {
  className?: string;
};

export function HeroShader({ className = "" }: HeroShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    let program: WebGLProgram | null = null;
    try {
      const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
      program = gl.createProgram();
      if (!program) throw new Error("Failed to create program");
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Program link failed: " + gl.getProgramInfoLog(program));
      }
    } catch (err) {
      console.warn("[hero-shader] setup failed; falling back silently", err);
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uCanvas = gl.getUniformLocation(program, "u_canvas");
    const uTintA = gl.getUniformLocation(program, "u_tintA");
    const uTintB = gl.getUniformLocation(program, "u_tintB");
    const uTintC = gl.getUniformLocation(program, "u_tintC");
    const uDensity = gl.getUniformLocation(program, "u_density");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const mouse = { x: 0.5, y: 0.45 };
    const target = { x: 0.5, y: 0.45 };

    function resize() {
      if (!gl || !canvas) return;
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
      }
    }

    function applyPalette() {
      if (!gl) return;
      const p = readShaderPalette();
      gl.useProgram(program);
      gl.uniform3fv(uCanvas, p.canvas);
      gl.uniform3fv(uTintA, p.tintA);
      gl.uniform3fv(uTintB, p.tintB);
      gl.uniform3fv(uTintC, p.tintC);
      gl.uniform1f(uDensity, p.density);
    }

    // ORDER MATTERS — see class doc.
    resize();
    applyPalette();
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTime, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      applyPalette();
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReduced = reducedQuery.matches;
    const reducedHandler = (e: MediaQueryListEvent) => {
      prefersReduced = e.matches;
    };
    reducedQuery.addEventListener("change", reducedHandler);

    let rafId = 0;
    let visible = true;

    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = entries[0]?.isIntersecting ?? true;
        if (nextVisible && !visible && !prefersReduced) {
          rafId = requestAnimationFrame(render);
        }
        visible = nextVisible;
      },
      { rootMargin: "120px" },
    );
    observer.observe(canvas);

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      // Let the pointer push slightly beyond the canvas edges so the blob
      // can exit the frame naturally rather than sticking to the border.
      target.x = Math.min(1.25, Math.max(-0.25, x));
      target.y = Math.min(1.25, Math.max(-0.25, y));
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const startedAt = performance.now();

    function render(now: number) {
      if (!gl) return;
      const t = (now - startedAt) / 1000;

      // Framerate-tolerant ease — larger factor reaches target faster.
      const ease = 0.08;
      mouse.x += (target.x - mouse.x) * ease;
      mouse.y += (target.y - mouse.y) * ease;

      gl.uniform1f(uTime, prefersReduced ? 2.4 : t);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (visible && !prefersReduced) {
        rafId = requestAnimationFrame(render);
      }
    }

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      observer.disconnect();
      reducedQuery.removeEventListener("change", reducedHandler);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block size-full ${className}`}
    />
  );
}
