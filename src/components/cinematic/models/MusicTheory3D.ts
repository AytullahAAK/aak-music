import * as THREE from 'three';
import { motion } from '../../../hooks/motion';

export interface MusicTheoryInstance {
  group: THREE.Group;
  update: (time: number, isDark: boolean) => void;
  destroy: () => void;
}

interface HarmonicRing {
  mesh: THREE.Mesh;
  baseRadius: number;
  harmonic: number;
  freqLabel: string;
  ratio: string;
  color: number;
}

interface NoteNode {
  mesh: THREE.Mesh;
  labelMesh: THREE.Sprite;
  basePos: THREE.Vector3;
  freq: number;
  note: string;
}

export function createMusicTheory3D(): MusicTheoryInstance {
  const group = new THREE.Group();
  group.name = 'MusicTheorySpace';

  // --- 1. Harmonic Overtone Rings (Concentric Fourier series) ---
  const harmonicRings: HarmonicRing[] = [];
  const ringDefs = [
    { n: 1, name: 'C3 Fundamental', ratio: '1:1', f: '130.8 Hz', col: 0x5fd4ff, r: 1.6 },
    { n: 2, name: 'C4 Octave', ratio: '2:1', f: '261.6 Hz', col: 0x8658ff, r: 2.3 },
    { n: 3, name: 'G4 Perfect 5th', ratio: '3:2', f: '392.0 Hz', col: 0x00e5ff, r: 3.0 },
    { n: 4, name: 'C5 2nd Octave', ratio: '4:1', f: '523.2 Hz', col: 0xb388ff, r: 3.7 },
    { n: 5, name: 'E5 Major 3rd', ratio: '5:4', f: '659.3 Hz', col: 0xffab40, r: 4.4 },
  ];

  ringDefs.forEach((def) => {
    const ringGeom = new THREE.TorusGeometry(def.r, 0.025, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: def.col,
      emissive: def.col,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    harmonicRings.push({
      mesh: ringMesh,
      baseRadius: def.r,
      harmonic: def.n,
      freqLabel: def.f,
      ratio: def.ratio,
      color: def.col,
    });
  });

  // --- 2. 3D Chord Constellation: C Minor 9 (C - Eb - G - Bb - D) ---
  const chordNotes = [
    { note: 'C3 (Root)', freq: 130.8, color: 0x5fd4ff, pos: new THREE.Vector3(0, 0, 0) },
    { note: 'Eb3 (m3)', freq: 155.6, color: 0x8658ff, pos: new THREE.Vector3(-1.8, 0.6, -0.9) },
    { note: 'G3 (P5)', freq: 196.0, color: 0x00e5ff, pos: new THREE.Vector3(1.7, 0.9, -0.6) },
    { note: 'Bb3 (m7)', freq: 233.1, color: 0xb388ff, pos: new THREE.Vector3(-1.2, 1.6, 1.2) },
    { note: 'D4 (M9)', freq: 293.7, color: 0xffab40, pos: new THREE.Vector3(1.4, 2.1, 1.0) },
  ];

  const noteNodes: NoteNode[] = [];
  const nodeGeom = new THREE.SphereGeometry(0.2, 24, 24);

  chordNotes.forEach((cn) => {
    const nodeMat = new THREE.MeshStandardMaterial({
      color: cn.color,
      emissive: cn.color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.5,
    });
    const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
    nodeMesh.position.copy(cn.pos);
    group.add(nodeMesh);

    // Canvas label sprite for the note name
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cn.note, 128, 64);
    ctx.font = '22px monospace';
    ctx.fillStyle = '#5fd4ff';
    ctx.fillText(`${cn.freq} Hz`, 128, 100);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.7, 1);
    sprite.position.set(cn.pos.x, cn.pos.y + 0.45, cn.pos.z);
    group.add(sprite);

    noteNodes.push({
      mesh: nodeMesh,
      labelMesh: sprite,
      basePos: cn.pos.clone(),
      freq: cn.freq,
      note: cn.note,
    });
  });

  // Connecting harmonic resonance lattice lines between notes
  const latticeLines: THREE.Line[] = [];
  for (let i = 0; i < chordNotes.length; i++) {
    for (let j = i + 1; j < chordNotes.length; j++) {
      const points = [chordNotes[i].pos, chordNotes[j].pos];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x5fd4ff,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Line(geom, lineMat);
      group.add(line);
      latticeLines.push(line);
    }
  }

  // --- 3. 3D Wave Interference Ribbon ---
  const wavePointsCount = 80;
  const ribbonGeom = new THREE.PlaneGeometry(7.0, 1.2, wavePointsCount - 1, 1);
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0x5fd4ff,
    emissive: 0x8658ff,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    wireframe: true,
  });
  const waveRibbon = new THREE.Mesh(ribbonGeom, ribbonMat);
  waveRibbon.position.set(0, -1.8, 0);
  group.add(waveRibbon);

  const update = (time: number, _isDark: boolean) => {
    // Rotate harmonic rings at speeds proportional to their harmonic overtone frequency
    harmonicRings.forEach((ring) => {
      ring.mesh.rotation.z = time * 0.15 * ring.harmonic;

      // Standing wave oscillation
      const audioPulse = motion.playing ? (motion.bands[ring.harmonic * 4] || 0) * 0.4 : 0;
      const wave = Math.sin(time * (1.5 + ring.harmonic * 0.5)) * 0.05 + audioPulse;
      const s = 1.0 + wave;
      ring.mesh.scale.set(s, s, s);
    });

    // Orbit chord notes gently with vibrational shimmer
    noteNodes.forEach((node, idx) => {
      const floatY = Math.sin(time * 1.8 + idx * 1.2) * 0.12;
      const floatX = Math.cos(time * 1.2 + idx * 0.9) * 0.08;
      node.mesh.position.set(
        node.basePos.x + floatX,
        node.basePos.y + floatY,
        node.basePos.z
      );
      node.labelMesh.position.set(
        node.basePos.x + floatX,
        node.basePos.y + floatY + 0.45,
        node.basePos.z
      );

      // Pulse note sphere scale on audio bass/energy
      const energy = motion.playing ? (motion.bands[idx * 5] || 0) : 0.2;
      const scale = 1.0 + energy * 0.6;
      node.mesh.scale.set(scale, scale, scale);
    });

    // Update lattice lines to follow moving nodes
    let lineIdx = 0;
    for (let i = 0; i < noteNodes.length; i++) {
      for (let j = i + 1; j < noteNodes.length; j++) {
        if (latticeLines[lineIdx]) {
          const positions = latticeLines[lineIdx].geometry.attributes.position as THREE.BufferAttribute;
          positions.setXYZ(0, noteNodes[i].mesh.position.x, noteNodes[i].mesh.position.y, noteNodes[i].mesh.position.z);
          positions.setXYZ(1, noteNodes[j].mesh.position.x, noteNodes[j].mesh.position.y, noteNodes[j].mesh.position.z);
          positions.needsUpdate = true;
          lineIdx++;
        }
      }
    }

    // Deform 3D Wave Ribbon into harmonic interference pattern
    const pos = ribbonGeom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wavePointsCount; i++) {
      const u = i / (wavePointsCount - 1);
      // Sum of fundamental (1f) + octave (2f) + fifth (3f) = composite electronic timbre wave
      const f1 = Math.sin(u * Math.PI * 6 + time * 3.0) * 0.4;
      const f2 = Math.sin(u * Math.PI * 12 + time * 6.0) * 0.2;
      const f3 = Math.sin(u * Math.PI * 18 + time * 9.0) * 0.1;
      const composite = f1 + f2 + f3;

      // Top row vertex
      pos.setZ(i, composite);
      // Bottom row vertex
      pos.setZ(i + wavePointsCount, composite * 0.8);
    }
    pos.needsUpdate = true;
  };

  const destroy = () => {
    nodeGeom.dispose();
    ribbonGeom.dispose();
    harmonicRings.forEach((r) => r.mesh.geometry.dispose());
  };

  return { group, update, destroy };
}

