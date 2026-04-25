"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useMagneticButton } from "@/hooks/use-magnetic-button";
import * as THREE from "three";

// Simplex noise for vertex displacement
const simplexNoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
uniform float uTime;
uniform float uMouseInfluence;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

${simplexNoise}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec3 pos = position;
  
  float noise = snoise(pos * 1.5 + uTime * 0.3);
  float noise2 = snoise(pos * 3.0 - uTime * 0.2);
  float displacement = noise * 0.25 + noise2 * 0.08;
  
  pos += normal * displacement;
  vDisplacement = displacement;
  vPosition = pos;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
  
  float colorMix = vDisplacement * 2.0 + 0.5;
  vec3 baseColor = mix(uColor1, uColor2, colorMix);
  baseColor = mix(baseColor, uColor3, fresnel * 0.6);
  
  // Metallic reflection
  vec3 reflection = vec3(0.9, 0.92, 1.0) * fresnel * 1.2;
  
  // Rim light
  float rim = pow(1.0 - abs(dot(viewDirection, vNormal)), 4.0);
  vec3 rimColor = vec3(0.0, 0.4, 1.0) * rim * 0.8;
  
  vec3 finalColor = baseColor + reflection + rimColor;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fixed 3D Canvas — stays pinned to viewport so wave backdrop-filter can see it
// ─────────────────────────────────────────────────────────────────────────────
export function Hero3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { scrollY } = useScroll();
  const rawCameraZ = useTransform(scrollY, [0, 1200], [3.5, 0.5]);
  const rawSphereScale = useTransform(scrollY, [0, 1000], [1, 2.5]);
  const rawSphereOpacity = useTransform(scrollY, [0, 1600], [1, 0]);
  const cameraZ = useSpring(rawCameraZ, { stiffness: 60, damping: 20 });
  const sphereScale = useSpring(rawSphereScale, { stiffness: 60, damping: 20 });
  const sphereOpacity = useSpring(rawSphereOpacity, { stiffness: 80, damping: 20 });

  // Background opacity fades so the canvas becomes transparent behind the wave
  const rawCanvasBgOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const canvasBgOpacity = useSpring(rawCanvasBgOpacity, { stiffness: 80, damping: 25 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const WAVE_HEIGHT = 120;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight + WAVE_HEIGHT);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 3.5;

    const geometry = new THREE.IcosahedronGeometry(1.2, 64);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color("#0066FF") },
        uColor2: { value: new THREE.Color("#D4AF37") },
        uColor3: { value: new THREE.Color("#00C9A7") },
      },
      wireframe: false,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 12;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x4488ff,
      size: 0.015,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const mouse = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    let raf: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      (material.uniforms as Record<string, THREE.Uniform>).uTime!.value = elapsed;

      targetRotation.x = mouse.y * 0.3;
      targetRotation.y = mouse.x * 0.3;
      sphere.rotation.x += (targetRotation.x - sphere.rotation.x) * 0.05;
      sphere.rotation.y += (targetRotation.y - sphere.rotation.y) * 0.05;
      sphere.rotation.y += 0.002;

      particles.rotation.y = elapsed * 0.02;
      particles.rotation.x = elapsed * 0.01;

      const camZ = cameraZ.get();
      const sScale = sphereScale.get();
      const sOpacity = sphereOpacity.get();

      camera.position.z = camZ;
      sphere.scale.setScalar(sScale);
      material.opacity = sOpacity;
      particleMaterial.opacity = sOpacity * 0.4;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight + WAVE_HEIGHT);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [cameraZ, sphereScale, sphereOpacity]);

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
      {/* Solid dark background that fades out with scroll */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "#0A0F1A",
          opacity: canvasBgOpacity,
        }}
      />
      {/* 3D canvas — always visible, alpha: true so transparent where no geometry */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full"
        style={{
          height: "calc(100vh + 120px)",
          background: "transparent",
        }}
      />
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(10,15,26,0.8) 100%)",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Text Content — normal document flow, scrolls with page
// ─────────────────────────────────────────────────────────────────────────────
export function Hero3DContent() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const magneticRef = useMagneticButton({ threshold: 120, strength: 0.35 });

  const { scrollY } = useScroll();
  const rawTextY = useTransform(scrollY, [0, 1200], [0, -180]);
  const rawTextOpacity = useTransform(scrollY, [0, 800], [1, 0]);
  const textY = useSpring(rawTextY, { stiffness: 100, damping: 30 });
  const textOpacity = useSpring(rawTextOpacity, { stiffness: 100, damping: 30 });

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <motion.div
        style={{ y: reduced ? 0 : textY, opacity: reduced ? 1 : textOpacity }}
        className="relative z-10 max-w-[900px] text-center px-6"
      >
        {/* Eyebrow */}
        <motion.div
          initial={reduced ? {} : { y: 20, filter: "blur(4px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">
            <span className="w-8 h-[1px] bg-white/20" />
            RWA Tokenization Platform
            <span className="w-8 h-[1px] bg-white/20" />
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={reduced ? {} : { y: 30, filter: "blur(8px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="font-display text-[clamp(56px,10vw,140px)] font-bold leading-[0.95] tracking-[-0.03em] mb-8"
        >
          <span className="block text-white">The Future</span>
          <motion.span
            initial={reduced ? {} : { y: 20, filter: "blur(6px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
            className="block text-white/30"
          >
            of
          </motion.span>
          <motion.span
            initial={reduced ? {} : { y: 20, filter: "blur(8px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
            className="block hero-glow-text"
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #E5C76B 40%, #0066FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Real Assets
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={reduced ? {} : { y: 10, filter: "blur(4px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-base md:text-lg text-white/60 max-w-[600px] mx-auto leading-[1.7] mb-12 font-normal"
        >
          Tokenized real-world assets backed by institutional-grade security.
          Earn sustainable yields, transparently.
        </motion.p>

        {/* CTA */}
        <motion.button
          ref={magneticRef}
          initial={reduced ? {} : { scale: 0.95, filter: "blur(2px)" }}
          animate={{ scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 1.1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative inline-flex items-center gap-3 h-[52px] px-8 rounded-full bg-white text-[#0A0F1A] text-sm font-semibold tracking-wide transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] will-change-transform"
        >
          Explore Assets
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Hero3D — renders fixed canvas + scrollable content
// ─────────────────────────────────────────────────────────────────────────────
export function Hero3D() {
  return (
    <>
      <Hero3DCanvas />
      <Hero3DContent />
    </>
  );
}
