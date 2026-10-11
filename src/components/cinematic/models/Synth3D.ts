import * as THREE from 'three';
import { motion } from '../../../hooks/motion';

export interface SynthInstance {
  group: THREE.Group;
  update: (time: number, isDark: boolean) => void;
  destroy: () => void;
}

export function createSynth3D(): SynthInstance {
  const group = new THREE.Group();
  group.name = 'Synthesizer';

  // Base materials (theme responsive)
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x14161f,
    roughness: 0.35,
    metalness: 0.85,
  });

  const woodSideMat = new THREE.MeshStandardMaterial({
    color: 0x2a1d17,
    roughness: 0.7,
    metalness: 0.1,
  });

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1e212d,
    roughness: 0.45,
    metalness: 0.7,
  });

  const whiteKeyMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    roughness: 0.25,
    metalness: 0.05,
  });

  const blackKeyMat = new THREE.MeshStandardMaterial({
    color: 0x111217,
    roughness: 0.3,
    metalness: 0.1,
  });

  const activeKeyMat = new THREE.MeshStandardMaterial({
    color: 0x5fd4ff,
    emissive: 0x2499d6,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.2,
  });

  const knobMat = new THREE.MeshStandardMaterial({
    color: 0x2b2e3b,
    roughness: 0.25,
    metalness: 0.9,
  });

  const knobCapMat = new THREE.MeshStandardMaterial({
    color: 0x8658ff,
    emissive: 0x8658ff,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });

  // --- 1. Main Synth Chassis ---
  const chassisGeom = new THREE.BoxGeometry(6.6, 0.4, 3.2);
  const chassis = new THREE.Mesh(chassisGeom, chassisMat);
  chassis.position.y = -0.2;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Wooden side cheeks
  const cheekGeom = new THREE.BoxGeometry(0.2, 0.52, 3.28);
  const leftCheek = new THREE.Mesh(cheekGeom, woodSideMat);
  leftCheek.position.set(-3.35, -0.15, 0);
  const rightCheek = new THREE.Mesh(cheekGeom, woodSideMat);
  rightCheek.position.set(3.35, -0.15, 0);
  group.add(leftCheek, rightCheek);

  // Angled Control Surface Panel
  const panelGeom = new THREE.BoxGeometry(6.2, 0.22, 1.6);
  const panel = new THREE.Mesh(panelGeom, panelMat);
  panel.position.set(0, 0.1, -0.65);
  panel.rotation.x = 0.08;
  group.add(panel);

  // --- 2. Dynamic OLED Oscilloscope Screen ---
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 256;
  const screenCtx = screenCanvas.getContext('2d')!;

  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;

  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTexture,
  });

  const screenGeom = new THREE.PlaneGeometry(1.6, 0.8);
  const screenMesh = new THREE.Mesh(screenGeom, screenMat);
  screenMesh.position.set(0, 0.23, -0.65);
  screenMesh.rotation.x = -Math.PI / 2 + 0.08;
  group.add(screenMesh);

  // Screen bezel
  const bezelGeom = new THREE.BoxGeometry(1.72, 0.05, 0.92);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x090a0f,
    roughness: 0.5,
  });
  const bezel = new THREE.Mesh(bezelGeom, bezelMat);
  bezel.position.set(0, 0.2, -0.65);
  bezel.rotation.x = 0.08;
  group.add(bezel);

  // --- 3. Knobs & Encoders ---
  const knobs: THREE.Mesh[] = [];
  const knobGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 24);
  const knobPositions = [
    [-2.4, -0.9], [-1.9, -0.9], [-1.4, -0.9],
    [-2.4, -0.4], [-1.9, -0.4], [-1.4, -0.4],
    [1.4, -0.9], [1.9, -0.9], [2.4, -0.9],
    [1.4, -0.4], [1.9, -0.4], [2.4, -0.4],
  ];

  knobPositions.forEach(([x, z], idx) => {
    const kMesh = new THREE.Mesh(knobGeom, idx % 3 === 0 ? knobCapMat : knobMat);
    kMesh.position.set(x, 0.24, z);
    kMesh.rotation.x = 0.08;
    group.add(kMesh);
    knobs.push(kMesh);

    // Indicator notch
    const notchGeom = new THREE.BoxGeometry(0.02, 0.18, 0.05);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x95d4ff });
    const notch = new THREE.Mesh(notchGeom, notchMat);
    notch.position.set(0, 0.01, 0.08);
    kMesh.add(notch);
  });

  // --- 4. Pitch & Modulation Wheels ---
  const wheelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 24);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x181a24,
    roughness: 0.5,
    metalness: 0.5,
  });
  const pitchWheel = new THREE.Mesh(wheelGeom, wheelMat);
  pitchWheel.rotation.z = Math.PI / 2;
  pitchWheel.position.set(-2.6, 0.08, 0.8);
  const modWheel = new THREE.Mesh(wheelGeom, wheelMat);
  modWheel.rotation.z = Math.PI / 2;
  modWheel.position.set(-2.3, 0.08, 0.8);
  group.add(pitchWheel, modWheel);

  // --- 5. 25-Key Synthesizer Keyboard ---
  // 15 white keys, 10 black keys across 2 octaves + top C
  const whiteKeyMeshes: THREE.Mesh[] = [];
  const blackKeyMeshes: THREE.Mesh[] = [];

  const whiteKeyWidth = 0.26;
  const whiteKeyLength = 1.25;
  const whiteKeyHeight = 0.14;
  const whiteKeyGeom = new THREE.BoxGeometry(whiteKeyWidth - 0.02, whiteKeyHeight, whiteKeyLength);

  const blackKeyWidth = 0.16;
  const blackKeyLength = 0.78;
  const blackKeyHeight = 0.2;
  const blackKeyGeom = new THREE.BoxGeometry(blackKeyWidth - 0.02, blackKeyHeight, blackKeyLength);

  const totalWhiteKeys = 15;
  const keyStartX = -1.8;

  // Pattern of black keys in an octave: [0 (C#), 1 (D#), - (E), 2 (F#), 3 (G#), 4 (A#), - (B)]
  const blackKeyOffsets = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];

  for (let i = 0; i < totalWhiteKeys; i++) {
    const key = new THREE.Mesh(whiteKeyGeom, whiteKeyMat);
    const x = keyStartX + i * whiteKeyWidth;
    key.position.set(x, 0.05, 0.85);
    key.castShadow = true;
    key.receiveShadow = true;
    group.add(key);
    whiteKeyMeshes.push(key);
  }

  blackKeyOffsets.forEach((whiteIdx) => {
    if (whiteIdx < totalWhiteKeys - 1) {
      const key = new THREE.Mesh(blackKeyGeom, blackKeyMat);
      const x = keyStartX + whiteIdx * whiteKeyWidth + whiteKeyWidth / 2;
      key.position.set(x, 0.12, 0.65);
      key.castShadow = true;
      group.add(key);
      blackKeyMeshes.push(key);
    }
  });

  // LED Glow bar along back of keys
  const ledBarGeom = new THREE.BoxGeometry(totalWhiteKeys * whiteKeyWidth + 0.1, 0.03, 0.04);
  const ledBarMat = new THREE.MeshBasicMaterial({ color: 0x95d4ff });
  const ledBar = new THREE.Mesh(ledBarGeom, ledBarMat);
  ledBar.position.set(keyStartX + (totalWhiteKeys * whiteKeyWidth) / 2 - 0.13, 0.16, 0.18);
  group.add(ledBar);

  // Musical animation sequence (played notes)
  // C minor 9 chord notes: C, Eb, G, Bb, D
  const melodyNotes = [0, 3, 7, 10, 14, 12, 10, 7, 5, 3];

  let lastScreenUpdate = 0;

  const update = (time: number, isDark: boolean) => {
    // Theme adjustments
    if (isDark) {
      chassisMat.color.setHex(0x0e1017);
      panelMat.color.setHex(0x151822);
    } else {
      chassisMat.color.setHex(0x282c38);
      panelMat.color.setHex(0x353a48);
    }

    // Rotate knobs subtly
    knobs.forEach((k, idx) => {
      const freq = 0.5 + idx * 0.2;
      const angle = Math.sin(time * freq) * 0.8;
      k.rotation.y = angle;
    });

    // Pitch & Mod wheels movement
    pitchWheel.rotation.x = Math.sin(time * 1.5) * 0.25;
    modWheel.rotation.x = (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.4;

    // Animate keys depressing musically
    const currentMelodyStep = Math.floor(time * 3.5) % melodyNotes.length;
    const activeWhiteIndex = melodyNotes[currentMelodyStep] % totalWhiteKeys;

    whiteKeyMeshes.forEach((key, idx) => {
      const isTarget = idx === activeWhiteIndex;
      const targetY = isTarget ? 0.01 : 0.05;
      const targetRot = isTarget ? 0.04 : 0;
      key.position.y += (targetY - key.position.y) * 0.3;
      key.rotation.x += (targetRot - key.rotation.x) * 0.3;
      key.material = isTarget ? activeKeyMat : whiteKeyMat;
    });

    // Animate black keys on bass
    const isBassHit = motion.playing ? motion.bass > 0.4 : (Math.floor(time * 2) % 4 === 0);
    blackKeyMeshes.forEach((key, idx) => {
      const depress = isBassHit && idx % 3 === 0;
      const targetY = depress ? 0.07 : 0.12;
      key.position.y += (targetY - key.position.y) * 0.25;
    });

    // Update OLED Screen Texture at ~30-60fps
    if (time - lastScreenUpdate > 0.033) {
      lastScreenUpdate = time;
      drawOledScreen(screenCtx, time);
      screenTexture.needsUpdate = true;
    }
  };

  const drawOledScreen = (ctx: CanvasRenderingContext2D, time: number) => {
    const w = 512;
    const h = 256;

    // Screen background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = '#0e1a2b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top status line
    ctx.fillStyle = '#5fd4ff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('AAK // PRO-8 ANALOG ENGINE', 20, 28);

    ctx.fillStyle = '#8658ff';
    const bpm = motion.playing ? 'BPM 124.0 [SYNC]' : 'BPM 124.0 [IDLE]';
    ctx.fillText(bpm, 340, 28);

    // Waveform rendering
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5fd4ff';
    ctx.shadowColor = '#5fd4ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();

    const midY = 135;
    const isLive = motion.playing;
    const amp = isLive ? 35 + motion.bass * 45 : 30;

    for (let x = 0; x < w; x += 4) {
      const norm = x / w;
      let y = midY;

      if (isLive) {
        const bandIdx = Math.floor(norm * 31);
        const bandVal = motion.bands[bandIdx] || 0;
        // Morphing wavetable
        y += Math.sin(norm * Math.PI * 8 + time * 6) * amp * (0.6 + bandVal * 1.4);
        y += Math.sin(norm * Math.PI * 22 - time * 4) * bandVal * 20;
      } else {
        // Smooth analog saw/sine morph
        const saw = (norm * 6 + time * 1.5) % 1 - 0.5;
        const sine = Math.sin(norm * Math.PI * 6 + time * 2);
        const morph = (Math.sin(time * 0.8) * 0.5 + 0.5);
        y += (sine * (1 - morph) + saw * morph * 1.5) * amp;
      }

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bottom telemetry
    ctx.fillStyle = '#8f9db5';
    ctx.font = '12px monospace';
    const cutoff = isLive ? Math.round(1800 + motion.level * 4000) : 2400;
    const res = isLive ? Math.round(45 + motion.bass * 40) : 62;
    ctx.fillText(`CUTOFF: ${cutoff} Hz  |  RES: ${res}%  |  VCO: DUAL SAW+SUB`, 20, 235);
  };

  const destroy = () => {
    screenTexture.dispose();
    chassisGeom.dispose();
    panelGeom.dispose();
    whiteKeyGeom.dispose();
    blackKeyGeom.dispose();
    screenGeom.dispose();
  };

  return { group, update, destroy };
}

