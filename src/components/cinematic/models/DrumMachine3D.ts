import * as THREE from 'three';
import { motion } from '../../../hooks/motion';

export interface DrumMachineInstance {
  group: THREE.Group;
  update: (time: number, isDark: boolean) => void;
  destroy: () => void;
}

export function createDrumMachine3D(): DrumMachineInstance {
  const group = new THREE.Group();
  group.name = 'DrumMachine';

  // Base materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x161821,
    roughness: 0.4,
    metalness: 0.8,
  });

  const faceplateMat = new THREE.MeshStandardMaterial({
    color: 0x202430,
    roughness: 0.45,
    metalness: 0.65,
  });

  const padInactiveMat = new THREE.MeshStandardMaterial({
    color: 0x282c3c,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Dynamic Pad Mats (RGB glow for drum types)
  const padKickMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00a8d6,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });

  const padSnareMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xe68a00,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  });

  const padHatMat = new THREE.MeshStandardMaterial({
    color: 0xb072ff,
    emissive: 0x8a45e6,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });

  const padPercMat = new THREE.MeshStandardMaterial({
    color: 0x38ef7d,
    emissive: 0x11998e,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });

  // Step sequencer LED materials
  const stepLedOffMat = new THREE.MeshBasicMaterial({ color: 0x222633 });
  const stepLedOnMat = new THREE.MeshBasicMaterial({ color: 0xff416c });
  const stepLedPlayheadMat = new THREE.MeshBasicMaterial({ color: 0x5fd4ff });

  // --- 1. Chassis ---
  const bodyGeom = new THREE.BoxGeometry(4.8, 0.45, 4.2);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = -0.22;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Slanted top panel (12 degrees tilt)
  const faceGeom = new THREE.BoxGeometry(4.6, 0.15, 4.0);
  const face = new THREE.Mesh(faceGeom, faceplateMat);
  face.position.set(0, 0.05, 0);
  face.rotation.x = 0.18;
  group.add(face);

  // --- 2. 4x4 Velocity Pad Matrix ---
  const pads: THREE.Mesh[] = [];
  const padGeom = new THREE.BoxGeometry(0.55, 0.12, 0.55);

  const padSpacing = 0.68;
  const padStartX = -1.02;
  const padStartZ = -0.2;

  // 16 pads in 4 rows of 4
  // Row 0 (top): Percussion (Pads 12-15)
  // Row 1: Hi-Hats (Pads 8-11)
  // Row 2: Snares / Claps (Pads 4-7)
  // Row 3 (bottom): Kicks / Sub (Pads 0-3)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const pad = new THREE.Mesh(padGeom, padInactiveMat);
      const x = padStartX + col * padSpacing;
      const z = padStartZ + row * padSpacing;
      pad.position.set(x, 0.22, z);
      pad.rotation.x = 0.18;
      pad.castShadow = true;
      group.add(pad);
      pads.push(pad);
    }
  }

  // --- 3. 16-Step Sequencer LED Bar ---
  const stepLeds: THREE.Mesh[] = [];
  const stepGeom = new THREE.BoxGeometry(0.18, 0.06, 0.12);
  const stepStartX = -1.9;
  const stepSpacing = 0.25;

  for (let i = 0; i < 16; i++) {
    const step = new THREE.Mesh(stepGeom, stepLedOffMat);
    step.position.set(stepStartX + i * stepSpacing, 0.38, 1.45);
    step.rotation.x = 0.18;
    group.add(step);
    stepLeds.push(step);
  }

  // --- 4. Encoders & Control Knobs ---
  const knobGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.16, 20);
  const knobMat = new THREE.MeshStandardMaterial({
    color: 0x303545,
    roughness: 0.3,
    metalness: 0.9,
  });
  const drumKnobs: THREE.Mesh[] = [];
  [-1.4, -0.6, 0.6, 1.4].forEach((x) => {
    const k = new THREE.Mesh(knobGeom, knobMat);
    k.position.set(x, 0.16, -1.35);
    k.rotation.x = 0.18;
    group.add(k);
    drumKnobs.push(k);
  });

  // --- 5. Digital Display ---
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 192;
  const screenCtx = screenCanvas.getContext('2d')!;

  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.minFilter = THREE.LinearFilter;

  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenGeom = new THREE.PlaneGeometry(1.9, 0.7);
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 0.24, -1.05);
  screen.rotation.x = -Math.PI / 2 + 0.18;
  group.add(screen);

  // Musical rhythm pattern matrix (16 steps)
  // Step:   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  // Kick:   X        X        X        X        X
  // Snare:              X              X              X
  // Hi-Hat: X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X
  const kickPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
  const snarePattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
  const hatPattern = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  let lastScreenUpdate = 0;

  const update = (time: number, isDark: boolean) => {
    if (isDark) {
      bodyMat.color.setHex(0x10121a);
      faceplateMat.color.setHex(0x181c26);
    } else {
      bodyMat.color.setHex(0x282c3c);
      faceplateMat.color.setHex(0x383e50);
    }

    // Step calculation (124 BPM = ~2.06 beats/sec = ~8.24 16th-notes/sec)
    const stepSpeed = motion.playing ? 8.26 : 6.0;
    const currentStep = Math.floor(time * stepSpeed) % 16;

    // Update 16-step sequencer LEDs
    stepLeds.forEach((led, idx) => {
      if (idx === currentStep) {
        led.material = stepLedPlayheadMat;
      } else if (kickPattern[idx] || snarePattern[idx]) {
        led.material = stepLedOnMat;
      } else {
        led.material = stepLedOffMat;
      }
    });

    // Check which drums hit on this step
    const kickHit = kickPattern[currentStep] === 1 || (motion.playing && motion.bass > 0.45);
    const snareHit = snarePattern[currentStep] === 1;
    const hatHit = hatPattern[currentStep] === 1;

    // Animate 4x4 pads
    pads.forEach((pad, idx) => {
      let isHit = false;
      let activeMat = padKickMat;

      // Row 3 (Pads 12-15): Kicks
      if (idx >= 12 && kickHit && idx % 2 === 0) {
        isHit = true;
        activeMat = padKickMat;
      }
      // Row 2 (Pads 8-11): Snares
      else if (idx >= 8 && idx < 12 && snareHit && idx % 2 === 1) {
        isHit = true;
        activeMat = padSnareMat;
      }
      // Row 1 (Pads 4-7): Hats
      else if (idx >= 4 && idx < 8 && hatHit && (idx + currentStep) % 3 === 0) {
        isHit = true;
        activeMat = padHatMat;
      }
      // Row 0 (Pads 0-3): Perc
      else if (idx < 4 && currentStep % 4 === 1 && idx === 2) {
        isHit = true;
        activeMat = padPercMat;
      }

      const targetY = isHit ? 0.17 : 0.22;
      pad.position.y += (targetY - pad.position.y) * 0.35;
      pad.material = isHit ? activeMat : padInactiveMat;
    });

    // Subtly rotate encoders
    drumKnobs.forEach((k, i) => {
      k.rotation.y = Math.sin(time * (0.6 + i * 0.3)) * 0.7;
    });

    // Update screen display
    if (time - lastScreenUpdate > 0.04) {
      lastScreenUpdate = time;
      drawDrumScreen(screenCtx, currentStep, time);
      screenTex.needsUpdate = true;
    }
  };

  const drawDrumScreen = (ctx: CanvasRenderingContext2D, step: number, time: number) => {
    const w = 512;
    const h = 192;

    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, w, h);

    // Frame
    ctx.strokeStyle = '#1a2234';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Header
    ctx.fillStyle = '#5fd4ff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('AAK-RHYTHM // CORE STEP 16', 16, 28);

    ctx.fillStyle = '#ffb347';
    ctx.fillText(`STEP: ${String(step + 1).padStart(2, '0')}/16`, 380, 28);

    // Live Step Matrix Vis
    const barWidth = 24;
    const barGap = 6;
    const startX = 18;

    for (let i = 0; i < 16; i++) {
      const x = startX + i * (barWidth + barGap);
      const isCurrent = i === step;

      // Active indicator
      ctx.fillStyle = isCurrent ? '#5fd4ff' : kickPattern[i] ? '#ff416c' : '#1a2436';
      ctx.fillRect(x, 48, barWidth, 12);

      // Velocity bar
      const height = kickPattern[i] ? 55 : snarePattern[i] ? 45 : hatPattern[i] ? 30 : 15;
      const pulseVal = isCurrent ? (motion.playing ? motion.bass * 20 : 10) : 0;
      ctx.fillStyle = isCurrent ? '#00d4ff' : '#2a354a';
      ctx.fillRect(x, 140 - (height + pulseVal), barWidth, height + pulseVal);
    }

    // Status footer
    ctx.fillStyle = '#8f9db5';
    ctx.font = '12px monospace';
    const bpmStr = motion.playing ? 'TEMPO: 124.0 BPM [LOCKED]' : 'TEMPO: 124.0 BPM [INTERNAL]';
    ctx.fillText(`${bpmStr}  |  SWING: 54%  |  KIT: CYBERNETIC 909`, 16, 172);
  };

  const destroy = () => {
    screenTex.dispose();
    bodyGeom.dispose();
    faceGeom.dispose();
    padGeom.dispose();
    stepGeom.dispose();
    screenGeom.dispose();
  };

  return { group, update, destroy };
}
