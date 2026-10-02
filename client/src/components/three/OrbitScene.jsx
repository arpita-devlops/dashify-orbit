import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const PALETTE = {
  dark: { core: '#ffb547', coreHot: '#fff1cc', urgent: '#ff6b6b', high: '#ffb547', medium: '#6c8cff', low: '#34d399', ring: '#8b93c9', star: '#c7ccff', bg: '#080a13', additive: true },
  light: { core: '#f59e0b', coreHot: '#fde68a', urgent: '#e04848', high: '#e2840e', medium: '#4a62ec', low: '#0e9e6e', ring: '#6b7095', star: '#7c82b0', bg: '#f6f4ef', additive: false },
};

// Closer orbit = more urgent. Each planet is a task.
const ORBITS = [
  { radius: 1.75, priority: 'urgent', planets: [{ label: 'Fix auth bug', size: 0.17 }, { size: 0.11 }] },
  { radius: 2.65, priority: 'high', planets: [{ label: 'Ship v2 dashboard', size: 0.2 }, { size: 0.13 }, { label: 'Review PRs', size: 0.12 }] },
  { radius: 3.55, priority: 'medium', planets: [{ label: 'System design notes', size: 0.15 }, { size: 0.1 }, { size: 0.12 }] },
  { radius: 4.45, priority: 'low', planets: [{ label: 'Evening run', size: 0.13 }, { size: 0.09 }] },
];

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function OrbitScene({ showLabels = true, className = '', intensity = 1 }) {
  const mountRef = useRef(null);
  const labelsRef = useRef([]);
  const { theme } = useTheme();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const palette = PALETTE[theme] ?? PALETTE.dark;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    const disposables = [];
    const track = (obj) => {
      disposables.push(obj);
      return obj;
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 2.6, 11);

    const system = new THREE.Group();
    system.rotation.set(0.5, 0, -0.16);
    scene.add(system);

    const glow = track(glowTexture());
    const sprite = (color, scale, opacity) => {
      const mat = track(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity, blending, depthWrite: false }));
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(scale);
      return s;
    };

    // Focus core
    const core = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.62, 64, 64)),
      track(new THREE.MeshBasicMaterial({ color: palette.core })),
    );
    system.add(core);
    core.add(sprite(palette.core, 4.2 * intensity, palette.additive ? 0.9 : 0.55));
    core.add(sprite(palette.coreHot, 1.8, palette.additive ? 0.9 : 0.7));

    const shell = new THREE.LineSegments(
      track(new THREE.WireframeGeometry(track(new THREE.IcosahedronGeometry(0.98, 1)))),
      track(new THREE.LineBasicMaterial({ color: palette.core, transparent: true, opacity: palette.additive ? 0.28 : 0.4 })),
    );
    system.add(shell);

    scene.add(new THREE.AmbientLight(0xffffff, palette.additive ? 0.35 : 0.9));
    const light = new THREE.PointLight(palette.core, palette.additive ? 60 : 30, 30, 1.6);
    system.add(light);

    // Orbits, planets and trails
    const planets = [];
    ORBITS.forEach((orbit, oi) => {
      const color = new THREE.Color(palette[orbit.priority]);
      const ringPoints = Array.from({ length: 181 }, (_, i) => {
        const a = (i / 180) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * orbit.radius, 0, Math.sin(a) * orbit.radius);
      });
      const ring = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints(ringPoints)),
        track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: palette.additive ? 0.22 : 0.35 })),
      );
      system.add(ring);

      orbit.planets.forEach((p, pi) => {
        const mesh = new THREE.Mesh(
          track(new THREE.SphereGeometry(p.size, 32, 32)),
          track(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: palette.additive ? 0.45 : 0.25, roughness: 0.35, metalness: 0.1 })),
        );
        mesh.add(sprite(color, p.size * 9, palette.additive ? 0.55 : 0.3));
        system.add(mesh);

        const TRAIL = 48;
        const trailGeo = track(new THREE.BufferGeometry());
        trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
        const colors = new Float32Array(TRAIL * 3);
        const bg = new THREE.Color(palette.bg);
        for (let i = 0; i < TRAIL; i++) {
          const c = color.clone().lerp(bg, i / TRAIL);
          colors.set([c.r, c.g, c.b], i * 3);
        }
        trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const trail = new THREE.Line(trailGeo, track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending })));
        system.add(trail);

        planets.push({
          mesh,
          trail,
          radius: orbit.radius,
          angle: (pi / orbit.planets.length) * Math.PI * 2 + oi * 0.9,
          speed: 0.55 / Math.pow(orbit.radius, 1.25),
          wobble: Math.random() * Math.PI * 2,
          label: p.label,
          labelIndex: p.label ? planets.filter((x) => x.label).length : -1,
        });
      });
    });

    // Asteroid belt of "someday" ideas
    const beltCount = 900;
    const belt = new Float32Array(beltCount * 3);
    for (let i = 0; i < beltCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 5.1 + Math.random() * 0.7;
      belt.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.18, Math.sin(a) * r], i * 3);
    }
    const beltGeo = track(new THREE.BufferGeometry());
    beltGeo.setAttribute('position', new THREE.BufferAttribute(belt, 3));
    const beltPoints = new THREE.Points(beltGeo, track(new THREE.PointsMaterial({ size: 0.045, color: palette.ring, map: glow, transparent: true, opacity: 0.7, depthWrite: false, blending })));
    system.add(beltPoints);

    // Star field
    const starCount = 700;
    const stars = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(25 + Math.random() * 25);
      stars.set([v.x, v.y, v.z], i * 3);
    }
    const starGeo = track(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    const starPoints = new THREE.Points(starGeo, track(new THREE.PointsMaterial({ size: 0.12, color: palette.star, map: glow, transparent: true, opacity: palette.additive ? 0.8 : 0.5, depthWrite: false, blending })));
    scene.add(starPoints);

    // Interaction
    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let width = 1;
    let height = 1;
    const resize = () => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      // Pull the camera back on narrow screens so all orbits stay visible.
      camera.position.z = width < 640 ? 15 : 11;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(mount);

    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05) * (reduceMotion ? 0.15 : 1);
      const t = clock.elapsedTime;

      system.rotation.y += (pointer.x * 0.35 - system.rotation.y) * 0.04;
      system.rotation.x += (0.5 + pointer.y * 0.12 - system.rotation.x) * 0.04;
      shell.rotation.y += dt * 0.25;
      shell.rotation.x += dt * 0.1;
      core.scale.setScalar(1 + Math.sin(t * 2.2) * 0.035);
      beltPoints.rotation.y += dt * 0.02;
      starPoints.rotation.y += dt * 0.005;

      for (const p of planets) {
        p.angle += p.speed * dt;
        p.mesh.position.set(Math.cos(p.angle) * p.radius, Math.sin(t + p.wobble) * 0.06, Math.sin(p.angle) * p.radius);

        const arr = p.trail.geometry.attributes.position.array;
        arr.copyWithin(3, 0, arr.length - 3);
        arr[0] = p.mesh.position.x;
        arr[1] = p.mesh.position.y;
        arr[2] = p.mesh.position.z;
        p.trail.geometry.attributes.position.needsUpdate = true;

        const el = p.labelIndex >= 0 ? labelsRef.current[p.labelIndex] : null;
        if (el) {
          p.mesh.getWorldPosition(tmp);
          const depth = tmp.distanceTo(camera.position);
          tmp.project(camera);
          const x = (tmp.x * 0.5 + 0.5) * width;
          const y = (-tmp.y * 0.5 + 0.5) * height;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -150%)`;
          el.style.opacity = String(Math.min(1, Math.max(0.25, (13 - depth) / 3.5)));
        }
      }

      renderer.render(scene, camera);
    };

    // Seed trails so they don't start collapsed at the origin.
    for (const p of planets) {
      const arr = p.trail.geometry.attributes.position.array;
      for (let i = 0; i < arr.length / 3; i++) {
        const a = p.angle - i * p.speed * 0.016;
        arr.set([Math.cos(a) * p.radius, 0, Math.sin(a) * p.radius], i * 3);
      }
    }
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme, intensity]);

  const labels = ORBITS.flatMap((o) => o.planets.filter((p) => p.label).map((p) => ({ text: p.label, priority: o.priority })));
  const dot = { urgent: 'bg-coral', high: 'bg-accent', medium: 'bg-ion', low: 'bg-mint' };

  return (
    <div ref={mountRef} className={`relative h-full w-full ${className}`} aria-hidden="true">
      {showLabels &&
        labels.map((label, i) => (
          <div
            key={label.text}
            ref={(el) => {
              labelsRef.current[i] = el;
            }}
            className="pointer-events-none absolute left-0 top-0 z-10 hidden whitespace-nowrap rounded-full border border-fg/10 bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-fg shadow-soft backdrop-blur-md will-change-transform sm:flex sm:items-center sm:gap-1.5"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot[label.priority]}`} />
            {label.text}
          </div>
        ))}
    </div>
  );
}
