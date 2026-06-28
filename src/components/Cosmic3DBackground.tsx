import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  
  // COSMIC (default cluster) coordinates
  cosmicX: number;
  cosmicY: number;
  cosmicZ: number;
  cosmicColor: string;
  
  // BRAIN coordinates & styled attributes
  brainX: number;
  brainY: number;
  brainZ: number;
  brainColor: string;
  brainSize: number;
  role: 'structure' | 'synapse' | 'root' | 'dendrite' | 'ember' | 'cerebellum';
  parentIndex: number | null; // For branching structures (dendrites & roots)
  
  // BULB coordinates
  bulbX: number;
  bulbY: number;
  bulbZ: number;
  bulbColor: string;
  
  shape: 'triangle' | 'circle' | 'diamond' | 'dot';
  size: number;
  angle: number;
  speed: number;
}

type Mode = 'COSMIC' | 'BRAIN' | 'BULB';

interface Cosmic3DBackgroundProps {
  isLoginPage?: boolean;
}

export default function Cosmic3DBackground({ isLoginPage = false }: Cosmic3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [currentMode, setCurrentMode] = useState<Mode>('COSMIC');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 500 particles for extreme fidelity and density
    const particleCount = 520;
    const particles: Particle[] = [];

    const shapes: ('triangle' | 'circle' | 'diamond' | 'dot')[] = ['triangle', 'circle', 'diamond', 'dot'];
    
    // Core color schemes
    const colors = {
      violet: 'rgba(128, 82, 255, 0.65)',
      violetFaint: 'rgba(128, 82, 255, 0.3)',
      cyan: 'rgba(0, 212, 255, 0.7)',
      cyanFaint: 'rgba(0, 212, 255, 0.3)',
      amber: 'rgba(255, 160, 20, 0.9)',
      amberFaint: 'rgba(255, 160, 20, 0.3)',
      white: 'rgba(255, 255, 255, 0.8)',
      whiteFaint: 'rgba(255, 255, 255, 0.25)'
    };

    // --- PRE-CALCULATE BRAIN STRUCTURE WITH HIGHEST ACCURACY ---
    // In reference image:
    // 1. Dual-color: Cyan/Blue cortex shell & cerebellum. Amber/Orange internal synapses and stem.
    // 2. High-density constellation filaments.
    // 3. Root system branching out downwards from the stem.
    // 4. Dendrite fibers branching out upwards from the top cerebral lobes.
    // 5. Cerebellum has a distinct beautiful cross-line grid mesh.
    
    const brainData: { x: number; y: number; z: number; color: string; size: number; role: Particle['role']; parentIndex: number | null }[] = [];

    // Pre-initialize indices to coordinate generation
    // Structure: 220 particles
    // Cerebellum: 80 particles (mapped to latitude/longitude mesh)
    // Synapses: 80 particles
    // Stem/Roots (Dendrite bottom): 70 particles (structured tree)
    // Top Dendrites: 50 particles (structured tree)
    // Embers: 20 particles (floaters)

    // Helper for random in sphere
    const randomInSphere = (rad: number) => {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * rad;
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi)
      };
    };

    // 1. Generate Cortex Structure (Gyri & folds, colored cyan/blue)
    for (let i = 0; i < 220; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      
      // Spherical coordinates
      const u = Math.random() * Math.PI; // latitude
      const v = Math.random() * Math.PI * 2; // longitude

      // Oval ellipsoid base
      const rx = 65;
      const ry = 55;
      const rz = 70; // elongated along Z axis (anterior-posterior)

      // Cortex folds using combination of waves to match the reference image's wavy folds
      const foldRipple = 1.0 + Math.sin(u * 12) * 0.08 * Math.cos(v * 12) * 0.08;
      
      // Separate left and right hemispheres slightly, avoiding the centerline
      let x = side * (rx * Math.sin(u) * Math.cos(v) * foldRipple) + (side * 8);
      // Flatten bottom slightly, dome at top
      let y = ry * Math.cos(u) * foldRipple - 18;
      let z = rz * Math.sin(u) * Math.sin(v) * foldRipple;

      // Adjust shape: human brain profile is tapered at the front (negative Z)
      const taper = z < 0 ? (1.0 + (z / rz) * 0.25) : 1.0;
      x *= taper;
      y *= taper;

      brainData.push({
        x,
        y,
        z,
        color: colors.cyan,
        size: 1.5 + Math.random() * 2.5,
        role: 'structure',
        parentIndex: null
      });
    }

    // 2. Generate Cerebellum Grid (Spherical mesh, colored electric cyan)
    // Placed at the lower back (posterior-inferior: positive Y, positive Z, right/left side)
    const cerebellumCenter = { x: 30, y: 35, z: -40 };
    const cerebellumParticlesStartIndex = brainData.length;
    
    // Create a perfect latitude/longitude grid of particles so we can link them with mesh lines
    const lats = 8;
    const lons = 10;
    const cerRad = 26;
    for (let lat = 0; lat < lats; lat++) {
      const phi = (lat / (lats - 1)) * Math.PI;
      for (let lon = 0; lon < lons; lon++) {
        const theta = (lon / lons) * Math.PI * 2;
        
        const cx = cerebellumCenter.x + cerRad * Math.sin(phi) * Math.cos(theta);
        const cy = cerebellumCenter.y + cerRad * Math.sin(phi) * Math.sin(theta);
        const cz = cerebellumCenter.z + cerRad * Math.cos(phi);

        brainData.push({
          x: cx,
          y: cy,
          z: cz,
          color: colors.cyan,
          size: 1.2 + Math.random() * 1.5,
          role: 'cerebellum',
          parentIndex: null // connected structurally in the render loop!
        });
      }
    }

    // 3. Generate Synapses (Amber glowing cores inside the brain lobes)
    for (let i = 0; i < 80; i++) {
      // Put them inside the cerebrum lobes
      const pt = randomInSphere(40);
      brainData.push({
        x: pt.x,
        y: pt.y - 15,
        z: pt.z,
        color: colors.amber,
        size: 2.2 + Math.random() * 3.0, // Thicker glowing nodes
        role: 'synapse',
        parentIndex: null
      });
    }

    // 4. Generate Root System (Stem branching downwards, colored Amber)
    // Stem extends from (0, 30, 0) down to (0, 85, 0)
    const stemStartIdx = brainData.length;
    
    // Main vertical spine nodes
    const spineNodes = 12;
    for (let i = 0; i < spineNodes; i++) {
      const progress = i / (spineNodes - 1);
      const sy = 25 + progress * 50;
      // Slight curvature in brainstem
      const sx = Math.sin(progress * 3) * 6;
      const sz = -5 + Math.cos(progress * 2) * 4;

      brainData.push({
        x: sx,
        y: sy,
        z: sz,
        color: colors.amber,
        size: 2.5 - progress * 1.0, // tapered down
        role: 'root',
        parentIndex: i === 0 ? null : (stemStartIdx + i - 1) // Spine daisy-chained
      });
    }

    // Root branches extending off the stem (exactly like reference image fibers)
    const rootBranches = 4;
    const nodesPerBranch = 14;
    
    for (let b = 0; b < rootBranches; b++) {
      const branchAngle = (b / rootBranches) * Math.PI * 2 + Math.random() * 0.5;
      let lastNodeIdx = stemStartIdx + spineNodes - 4; // Start branching from mid-stem

      for (let n = 0; n < nodesPerBranch; n++) {
        const progress = n / (nodesPerBranch - 1);
        const parentNode = brainData[lastNodeIdx];
        
        // Curve downwards and outwards like roots
        const rx = parentNode.x + Math.cos(branchAngle) * (5 + n * 1.2) + (Math.random() - 0.5) * 4;
        const ry = parentNode.y + (4 + Math.random() * 5);
        const rz = parentNode.z + Math.sin(branchAngle) * (5 + n * 1.2) + (Math.random() - 0.5) * 4;

        brainData.push({
          x: rx,
          y: ry,
          z: rz,
          color: colors.amber,
          size: 1.8 - progress * 1.0, // getting thinner
          role: 'root',
          parentIndex: lastNodeIdx
        });

        lastNodeIdx = brainData.length - 1; // chain to this node
      }
    }

    // 5. Generate Top Dendrites (Fibers branching out from top of brain upwards, colored Amber)
    // Starting from random locations on top cortex shell (y < -35)
    const dendriteBranches = 4;
    const nodesPerDendrite = 12;

    for (let b = 0; b < dendriteBranches; b++) {
      // Pick a random top cerebrum point as anchor
      const anchorIdx = Math.floor(Math.random() * 150);
      const anchor = brainData[anchorIdx];
      let lastNodeIdx = anchorIdx;

      const angleX = (Math.random() - 0.5) * 0.5;
      const angleZ = (Math.random() - 0.5) * 0.5;

      for (let n = 0; n < nodesPerDendrite; n++) {
        const progress = n / (nodesPerDendrite - 1);
        const parentNode = brainData[lastNodeIdx];

        // Grow upwards and branch outward
        const dx = parentNode.x + angleX * 12 + (Math.random() - 0.5) * 5;
        const dy = parentNode.y - (6 + Math.random() * 6); // Moving up
        const dz = parentNode.z + angleZ * 12 + (Math.random() - 0.5) * 5;

        brainData.push({
          x: dx,
          y: dy,
          z: dz,
          color: colors.amber,
          size: 1.6 - progress * 0.8,
          role: 'dendrite',
          parentIndex: lastNodeIdx
        });

        lastNodeIdx = brainData.length - 1;
      }
    }

    // 6. Generate Embers (Floating amber dust exactly like the reference image)
    const embersStartIdx = brainData.length;
    for (let i = 0; i < 25; i++) {
      const pt = randomInSphere(180);
      brainData.push({
        x: pt.x,
        y: pt.y - 40, // spread upwards
        z: pt.z,
        color: colors.amber,
        size: 0.8 + Math.random() * 1.6,
        role: 'ember',
        parentIndex: null
      });
    }

    // --- BULB STRUCTURE PRE-CALCULATE ---
    const generateBulbPoints = (count: number) => {
      const points: { x: number; y: number; z: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        let x = 0;
        let y = 0;
        let z = 0;
        let color = colors.cyan;

        if (i % 6 === 0) {
          // Double arch internal glowing filament
          const progress = (i % 30) / 30;
          const theta = progress * Math.PI;
          x = Math.sin(theta) * 16;
          y = -42 + Math.cos(theta) * 14;
          z = (Math.random() - 0.5) * 4;
          color = colors.amber; // filament glows warm amber!
        } else if (i % 6 === 1) {
          // Metal support wire leads
          x = (i % 2 === 0 ? -6 : 6);
          y = -20 + (i % 15) * 4;
          z = 0;
          color = colors.white;
        } else if (i % 6 === 2) {
          // Screw threads at bottom of bulb
          const angle = (i * 0.7) % (Math.PI * 2);
          const threadY = 46 + (i % 12) * 3;
          x = Math.cos(angle) * 24;
          y = threadY;
          z = Math.sin(angle) * 24;
          color = colors.violet;
        } else if (i % 6 === 3) {
          // Contact cap point
          x = (Math.random() - 0.5) * 12;
          y = 82 + Math.random() * 10;
          z = (Math.random() - 0.5) * 12;
          color = colors.violetFaint;
        } else {
          // Tapered glass silhouette
          const glassY = -92 + Math.random() * 138;
          let r = 0;
          if (glassY < -15) {
            const distToSphereCenter = glassY - (-30);
            r = Math.sqrt(Math.max(0, 62 * 62 - distToSphereCenter * distToSphereCenter));
          } else {
            const progress = (glassY - (-15)) / (46 - (-15));
            r = 62 - progress * 37;
          }

          const angle = Math.random() * Math.PI * 2;
          x = Math.cos(angle) * r;
          y = glassY;
          z = Math.sin(angle) * r;
          color = colors.cyan;
        }

        points.push({ x, y, z, color });
      }
      return points;
    };

    const bulbPoints = generateBulbPoints(particleCount);

    // Initialize the main loop's particles
    for (let i = 0; i < particleCount; i++) {
      // Cosmic positions (ambient galaxy)
      const theta = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 260;
      
      const cx = Math.cos(theta) * r;
      const cy = Math.sin(theta) * r;
      const cz = (Math.random() - 0.5) * 400;

      // Map to pre-calculated BRAIN structure arrays smoothly
      const brainPt = brainData[i] || brainData[i % brainData.length];

      particles.push({
        x: cx,
        y: cy,
        z: cz,
        cosmicX: cx,
        cosmicY: cy,
        cosmicZ: cz,
        cosmicColor: i % 2 === 0 ? colors.violet : colors.cyan,
        
        brainX: brainPt.x * 2.3, // Scaled up beautifully
        brainY: brainPt.y * 2.3,
        brainZ: brainPt.z * 2.3,
        brainColor: brainPt.color,
        brainSize: brainPt.size,
        role: brainPt.role,
        parentIndex: brainPt.parentIndex,
        
        bulbX: bulbPoints[i].x * 2.2,
        bulbY: bulbPoints[i].y * 2.2,
        bulbZ: bulbPoints[i].z * 2.2,
        bulbColor: bulbPoints[i].color,
        
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: 1.2 + Math.random() * 3.5,
        angle: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.4
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Transition state machine
    let activeMode: Mode = 'COSMIC';
    let lastStateChange = 0;
    const tickInterval = 8500; // Eases and holds shapes for 8.5s
    const modeCycle: Mode[] = ['COSMIC', 'BRAIN', 'COSMIC', 'BULB'];
    let cycleIndex = 0;

    let tick = 0;

    // Smooth horizontal easing variables for left/right alignment
    let currentCenterX = width / 2;

    const render = () => {
      tick++;

      // Evaluate Mode state machine
      const now = Date.now();
      if (now - lastStateChange > tickInterval) {
        cycleIndex = (cycleIndex + 1) % modeCycle.length;
        activeMode = modeCycle[cycleIndex];
        setCurrentMode(activeMode);
        lastStateChange = now;
      }

      ctx.fillStyle = '#020106'; // Velvet dark space
      ctx.fillRect(0, 0, width, height);

      // Extract clover coordinates and scale parameters for environmental ripple interaction
      let cloverCenterX = 0;
      let cloverCenterY = 0;
      let cloverSVGWidth = 0;
      let hasClover = false;
      let minK = 0;
      let maxK = 0;
      let animStart = 0;

      if (isLoginPage) {
        const cloverEl = document.getElementById('clover-logo-svg');
        if (cloverEl) {
          const rect = cloverEl.getBoundingClientRect();
          cloverCenterX = rect.left + rect.width / 2;
          cloverCenterY = rect.top + rect.height / 2;
          cloverSVGWidth = rect.width;
          hasClover = true;

          animStart = (window as any).cloverAnimationStartTime || 0;
          if (!animStart) {
            animStart = Date.now();
            (window as any).cloverAnimationStartTime = animStart;
          }

          if (animStart > 0) {
            // Each wave takes 4.4s to complete, and spawns every 1.1s
            minK = Math.floor((now - animStart - 4400) / 1100);
            maxK = Math.floor((now - animStart) / 1100);
          }
        }
      }

      // Smooth mouse easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;

      // Handle off-center layout dynamically when isLoginPage is true
      let targetXOffset = width / 2;
      if (isLoginPage && width >= 768) {
        // Shift to the right side (70% width) to keep left side open for the form
        targetXOffset = width * 0.70;
      }
      
      currentCenterX += (targetXOffset - currentCenterX) * 0.05; // smooth slide transition!

      // Ambient orbit offset
      const centerX = currentCenterX + Math.sin(tick * 0.005) * 40;
      const centerY = height / 2 + Math.cos(tick * 0.007) * 25;

      // Perspective rotations
      // In BRAIN mode, rotate slowly to reveal 3D roots and fibers beautifully!
      const angleY = mX * 0.35 + (activeMode === 'BRAIN' ? tick * 0.0022 : tick * 0.003);
      const angleX = -mY * 0.28 + (activeMode === 'BRAIN' ? Math.sin(tick * 0.001) * 0.08 : 0);

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const fov = 420;

      // Project particles to screen
      const projected = particles.map((p, i) => {
        let tx = p.cosmicX;
        let ty = p.cosmicY;
        let tz = p.cosmicZ;
        let tColor = p.cosmicColor;
        let tSize = p.size;

        if (activeMode === 'BRAIN') {
          tx = p.brainX;
          ty = p.brainY;
          tz = p.brainZ;
          tColor = p.brainColor;
          tSize = p.brainSize;

          // Embers drift upwards over time
          if (p.role === 'ember') {
            p.brainY -= 0.65;
            if (p.brainY < -240) {
              // Recycle ember at bottom
              p.brainY = 160 + Math.random() * 50;
              p.brainX = (Math.random() - 0.5) * 160;
              p.brainZ = (Math.random() - 0.5) * 160;
            }
          }
        } else if (activeMode === 'BULB') {
          tx = p.bulbX;
          ty = p.bulbY;
          tz = p.bulbZ;
          tColor = p.bulbColor;
        }

        // Apply visual spring interpolation
        p.x += (tx - p.x) * 0.065;
        p.y += (ty - p.y) * 0.065;
        p.z += (tz - p.z) * 0.065;

        // Apply orbital drift
        p.angle += p.speed * 0.005;
        const drift = Math.sin(tick * 0.003 + p.z * 0.012) * 2.5;
        const curX = p.x + Math.cos(p.angle) * drift;
        const curY = p.y + Math.sin(p.angle) * drift;
        const curZ = p.z;

        // Rotate Y
        let x1 = curX * cosY - curZ * sinY;
        let z1 = curX * sinY + curZ * cosY;

        // Rotate X
        let y2 = curY * cosX - z1 * sinX;
        let z2 = curY * sinX + z1 * cosX;

        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y2 * scale;

        // Apply subtle environmental ripple displacement
        let dispX = 0;
        let dispY = 0;

        if (hasClover && animStart > 0) {
          const dx = screenX - cloverCenterX;
          const dy = screenY - cloverCenterY;
          const distToClover = Math.sqrt(dx * dx + dy * dy);

          if (distToClover > 1) {
            const dirX = dx / distToClover;
            const dirY = dy / distToClover;

            const R_min = 15;
            const R_max = cloverSVGWidth * 1.25;

            // Stable pseudorandom parameters based on particle index 'i'
            const rand = Math.sin(p.z * 1000 + i * 50) * 0.5 + 0.5;
            const lag = 80 + rand * 70; // 80ms to 150ms
            const duration = 800 + rand * 400; // 800ms to 1200ms
            const maxDisp = 2.0 + rand * 2.0; // 2px to 4px outward drift

            // Loop over active waves to accumulate displacement
            const now = Date.now();
            for (let k = minK; k <= maxK; k++) {
              const spawnTime = animStart + k * 1100;
              const age = now - spawnTime;
              if (age >= 0 && age < 4400) {
                // Find when this wave reaches the particle's distance
                const val = (distToClover - R_min) / (R_max - R_min);
                if (val >= 0 && val <= 1) {
                  // Math.pow(val, 1 / 1.8) is the inverse of the ripple's expansion easing
                  const age_reach = 4400 * Math.pow(val, 1 / 1.8);
                  const t_elapsed = age - age_reach;

                  const tau = t_elapsed - lag;
                  if (tau >= 0 && tau <= duration) {
                    const outwardDuration = duration * 0.3;
                    const returnDuration = duration * 0.7;
                    let env = 0;

                    if (tau < outwardDuration) {
                      const u_out = tau / outwardDuration;
                      env = Math.sin(u_out * Math.PI / 2);
                    } else {
                      const u_ret = (tau - outwardDuration) / returnDuration;
                      env = Math.pow(1 - u_ret, 2.5);
                    }

                    dispX += dirX * maxDisp * env;
                    dispY += dirY * maxDisp * env;
                  }
                }
              }
            }
          }
        }

        return {
          px: screenX + dispX,
          py: screenY + dispY,
          scale,
          shape: p.shape,
          size: tSize * scale,
          color: tColor,
          role: p.role,
          parentIndex: p.parentIndex,
          z: z2
        };
      });

      // --- RENDERING CONSTELATION FILAMENTS & BRAIN TREE CONNECTIONS ---
      ctx.lineWidth = 0.55;

      if (activeMode === 'BRAIN') {
        // 1. Draw structured Golden/Amber branching trees (Roots and Dendrites)
        projected.forEach((p1) => {
          if (p1.parentIndex !== null && (p1.role === 'root' || p1.role === 'dendrite')) {
            const p2 = projected[p1.parentIndex];
            if (p2 && p1.px > 0 && p1.px < width && p2.px > 0 && p2.px < width) {
              const dx = p1.px - p2.px;
              const dy = p1.py - p2.py;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist < 100) {
                // High contrast warm amber connection matching the reference image!
                ctx.strokeStyle = `rgba(255, 140, 20, ${0.45 * p1.scale * p2.scale})`;
                ctx.lineWidth = p1.role === 'root' ? 1.4 * p1.scale : 0.8 * p1.scale;
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.stroke();
              }
            }
          }
        });

        // 2. Draw structured Cerebellum Grid Mesh
        // Connect neighboring grid items to form beautiful cross lines
        for (let i = 0; i < projected.length; i++) {
          const p1 = projected[i];
          if (p1.role === 'cerebellum') {
            // Find nearby cerebellum items and connect them to form structured longitude/latitude grids
            for (let j = i + 1; j < projected.length; j++) {
              const p2 = projected[j];
              if (p2.role === 'cerebellum') {
                const dx = p1.px - p2.px;
                const dy = p1.py - p2.py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Tight grid connector threshold
                if (dist < 26) {
                  ctx.strokeStyle = `rgba(0, 212, 255, ${0.28 * p1.scale * p2.scale})`;
                  ctx.lineWidth = 0.55;
                  ctx.beginPath();
                  ctx.moveTo(p1.px, p1.py);
                  ctx.lineTo(p2.px, p2.py);
                  ctx.stroke();
                }
              }
            }
          }
        }

        // 3. Draw standard Cortex shell connections (Cyan/Blue filaments)
        for (let i = 0; i < projected.length; i++) {
          const p1 = projected[i];
          if (p1.role === 'structure' || p1.role === 'synapse') {
            let connections = 0;
            const threshold = p1.role === 'synapse' ? 50 : 42;
            
            for (let j = i + 1; j < projected.length; j++) {
              if (connections > 3) break;
              const p2 = projected[j];
              if (p2.role === 'structure' || p2.role === 'synapse') {
                const dx = p1.px - p2.px;
                const dy = p1.py - p2.py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < threshold) {
                  connections++;
                  const alpha = (1 - dist / threshold) * 0.18 * p1.scale * p2.scale;
                  // Dual color lines: cyan for structure, amber for synapses
                  ctx.strokeStyle = p1.role === 'synapse' && p2.role === 'synapse'
                    ? `rgba(255, 140, 20, ${alpha * 0.9})`
                    : `rgba(0, 212, 255, ${alpha * 0.65})`;
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.moveTo(p1.px, p1.py);
                  ctx.lineTo(p2.px, p2.py);
                  ctx.stroke();
                }
              }
            }
          }
        }

      } else {
        // Default COSMIC or BULB connection lines
        ctx.lineWidth = 0.55;
        for (let i = 0; i < projected.length; i++) {
          const p1 = projected[i];
          if (p1.px < 0 || p1.px > width || p1.py < 0 || p1.py > height) continue;

          let connections = 0;
          const limit = activeMode === 'COSMIC' ? 2 : 4;
          const maxDist = activeMode === 'COSMIC' ? 90 : 55;

          for (let j = i + 1; j < projected.length; j++) {
            if (connections > limit) break;
            const p2 = projected[j];

            const dx = p1.px - p2.px;
            const dy = p1.py - p2.py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
              connections++;
              const alpha = (1 - dist / maxDist) * 0.15 * p1.scale * p2.scale;
              ctx.strokeStyle = activeMode === 'BULB'
                ? `rgba(0, 212, 255, ${alpha * 1.1})`
                : `rgba(128, 82, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.stroke();
            }
          }
        }
      }

      // --- RENDER GEOMETRIC SHAPES & EMBERS ---
      projected.forEach((p) => {
        if (p.px < -20 || p.px > width + 20 || p.py < -20 || p.py > height + 20) return;

        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.px, p.py);
        ctx.scale(p.size, p.size);

        // Render synapses and amber root terminals with high contrast glow glow effect!
        if (activeMode === 'BRAIN' && (p.role === 'synapse' || p.role === 'ember')) {
          // Custom beautiful fire sparks/glowing nodes
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 140, 20, 0.8)';
          ctx.beginPath();
          ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -1);
          ctx.lineTo(1, 1);
          ctx.lineTo(-1, 1);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -1.2);
          ctx.lineTo(1, 0);
          ctx.lineTo(0, 1.2);
          ctx.lineTo(-1, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 0.75, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoginPage]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
        style={{ mixBlendMode: 'screen' }}
      />
      {/* Immersive Mono State Label at the bottom edge */}
      <div className="fixed bottom-4 left-6 z-20 pointer-events-none font-mono text-[9px] uppercase tracking-widest text-slate-500 font-bold select-none flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-pulse" />
        <span>
          Visual Matrix: {
            currentMode === 'COSMIC' ? 'AUTONOMOUS NEURAL CLUSTER' :
            currentMode === 'BRAIN' ? 'EMULATED NEURAL HEMISPHERES (HI-FI)' :
            'INSPIRATIONAL CONCEPT PATTERN'
          }
        </span>
      </div>
    </>
  );
}
