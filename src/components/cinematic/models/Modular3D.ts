import * as THREE from 'three';
import { motion } from '../../../hooks/motion';

export interface ModularInstance {
  group: THREE.Group;
  update: (time: number, isDark: boolean) => void;
  destroy: () => void;
}

interface PatchCable {
  tube: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  pulseLight: THREE.Mesh;
  color: number;
  speed: number;
}

export function createModular3D(): ModularInstance {
  const group = new THREE.Group();
  group.name = 'ModularRack';

  // Base materials
  const rackCaseMat = new THREE.MeshStandardMaterial({
    color: 0x181a24,
    roughness: 0.5,
    metalness: 0.8,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x454b5e,
    roughness: 0.2,
    metalness: 0.95,
  });

  const moduleFaceMat = new THREE.MeshStandardMaterial({
    color: 0x222634,
    roughness: 0.4,
    metalness: 0.7,
  });

  const jackMat = new THREE.MeshStandardMaterial({
    color: 0x8a92a6,
    roughness: 0.2,
    metalness: 0.95,
  });

  const knobMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c26,
    roughness: 0.3,
    metalness: 0.8,
  });

  // --- 1. Rack Frame (2 Rows) ---
  const rackWidth = 6.8;
  const rackHeight = 4.2;
  const rackDepth = 1.0;

  const frameGeom = new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth);
  const frame = new THREE.Mesh(frameGeom, rackCaseMat);
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // Aluminum Mounting Rails (Top, Middle, Bottom)
  const railGeom = new THREE.BoxGeometry(rackWidth - 0.2, 0.08, 0.06);
  [-1.9, -0.05, 0.05, 1.9].forEach((y) => {
    const rail = new THREE.Mesh(railGeom, railMat);
    rail.position.set(0, y, rackDepth / 2 + 0.02);
    group.add(rail);
  });

  // --- 2. Modular Panels ---
  // Row 1 (y = 0.98): VCO 1, VCO 2, VCF Filter, Waveshaper
  // Row 2 (y = -0.98): Dual LFO, ADSR Envelope, VCA, Master Output
  const moduleDefs = [
    // Row 1
    { name: 'VCO-1', x: -2.3, w: 1.4, row: 1 },
    { name: 'VCO-2', x: -0.8, w: 1.4, row: 1 },
    { name: 'VCF-LADDER', x: 0.8, w: 1.6, row: 1 },
    { name: 'WAVESHAPER', x: 2.3, w: 1.2, row: 1 },
    // Row 2
    { name: 'DUAL-LFO', x: -2.3, w: 1.4, row: 2 },
    { name: 'ADSR-ENV', x: -0.8, w: 1.4, row: 2 },
    { name: 'VCA-AMP', x: 0.7, w: 1.4, row: 2 },
    { name: 'MASTER-OUT', x: 2.2, w: 1.4, row: 2 },
  ];

  const jackPoints: { [key: string]: THREE.Vector3 } = {};
  const statusLeds: { mesh: THREE.Mesh; type: string }[] = [];
  const knobs: THREE.Mesh[] = [];

  const panelGeom = new THREE.BoxGeometry(1, 1.82, 0.04);
  const jackGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
  const jackHoleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12);
  const jackHoleMat = new THREE.MeshBasicMaterial({ color: 0x07080d });

  moduleDefs.forEach((mod) => {
    const yPos = mod.row === 1 ? 0.98 : -0.98;
    const pMesh = new THREE.Mesh(panelGeom, moduleFaceMat);
    pMesh.scale.x = mod.w - 0.04;
    pMesh.position.set(mod.x, yPos, rackDepth / 2 + 0.02);
    group.add(pMesh);

    // Add Jacks and Knobs to each module
    const jackZ = rackDepth / 2 + 0.06;

    // Standard jack pairs per module
    const j1Pos = new THREE.Vector3(mod.x - 0.28, yPos - 0.5, jackZ);
    const j2Pos = new THREE.Vector3(mod.x + 0.28, yPos - 0.5, jackZ);
    const j3Pos = new THREE.Vector3(mod.x - 0.28, yPos - 0.2, jackZ);
    const j4Pos = new THREE.Vector3(mod.x + 0.28, yPos - 0.2, jackZ);

    [j1Pos, j2Pos, j3Pos, j4Pos].forEach((pos, idx) => {
      const jack = new THREE.Mesh(jackGeom, jackMat);
      jack.rotation.x = Math.PI / 2;
      jack.position.copy(pos);
      const hole = new THREE.Mesh(jackHoleGeom, jackHoleMat);
      jack.add(hole);
      group.add(jack);

      jackPoints[`${mod.name}_J${idx + 1}`] = pos;
    });

    // Knobs
    const k1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20), knobMat);
    k1.rotation.x = Math.PI / 2;
    k1.position.set(mod.x - 0.2, yPos + 0.35, jackZ);
    const k2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20), knobMat);
    k2.rotation.x = Math.PI / 2;
    k2.position.set(mod.x + 0.2, yPos + 0.35, jackZ);
    group.add(k1, k2);
    knobs.push(k1, k2);

    // Status LED
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x5fd4ff });
    const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), ledMat);
    ledMesh.position.set(mod.x, yPos + 0.7, jackZ);
    group.add(ledMesh);
    statusLeds.push({ mesh: ledMesh, type: mod.name });
  });

  // VU Meter LEDs on MASTER-OUT
  const vuLeds: THREE.Mesh[] = [];
  const vuGeom = new THREE.BoxGeometry(0.08, 0.03, 0.04);
  for (let i = 0; i < 8; i++) {
    const col = i < 5 ? 0x00ff88 : i < 7 ? 0xffcc00 : 0xff3366;
    const vLed = new THREE.Mesh(vuGeom, new THREE.MeshBasicMaterial({ color: col }));
    vLed.position.set(2.4, -0.6 + i * 0.08, rackDepth / 2 + 0.06);
    group.add(vLed);
    vuLeds.push(vLed);
  }

  // --- 3. 3D Patch Cables with Catenary Sag ---
  const patchCables: PatchCable[] = [];

  const cableConnections = [
    { from: 'VCO-1_J2', to: 'VCF-LADDER_J1', color: 0x5fd4ff, sag: 0.9, speed: 1.2 },
    { from: 'DUAL-LFO_J1', to: 'VCF-LADDER_J3', color: 0xb072ff, sag: 1.1, speed: 0.7 },
    { from: 'ADSR-ENV_J2', to: 'VCA-AMP_J3', color: 0xffa726, sag: 0.8, speed: 1.0 },
    { from: 'VCF-LADDER_J2', to: 'VCA-AMP_J1', color: 0x26de81, sag: 0.95, speed: 1.3 },
    { from: 'VCA-AMP_J2', to: 'MASTER-OUT_J1', color: 0xff3838, sag: 1.2, speed: 1.4 },
    { from: 'VCO-2_J1', to: 'WAVESHAPER_J1', color: 0x00d2d3, sag: 1.3, speed: 0.9 },
  ];

  cableConnections.forEach((conn) => {
    const p1 = jackPoints[conn.from] || new THREE.Vector3(-1.5, 0.5, rackDepth / 2 + 0.1);
    const p2 = jackPoints[conn.to] || new THREE.Vector3(1.0, -0.5, rackDepth / 2 + 0.1);

    // Create sagging catenary curve
    const midX = (p1.x + p2.x) / 2;
    const midY = Math.min(p1.y, p2.y) - conn.sag;
    const midZ = rackDepth / 2 + 0.65 + conn.sag * 0.4;
    const midPoint = new THREE.Vector3(midX, midY, midZ);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p1.x, p1.y, p1.z + 0.05),
      new THREE.Vector3(p1.x, p1.y - 0.2, p1.z + 0.35),
      midPoint,
      new THREE.Vector3(p2.x, p2.y - 0.2, p2.z + 0.35),
      new THREE.Vector3(p2.x, p2.y, p2.z + 0.05),
    ]);

    const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.035, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: conn.color,
      roughness: 0.35,
      metalness: 0.2,
      emissive: conn.color,
      emissiveIntensity: 0.25,
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    group.add(tubeMesh);

    // Glowing electricity packet moving along the cable
    const pulseGeom = new THREE.SphereGeometry(0.07, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const pulseLight = new THREE.Mesh(pulseGeom, pulseMat);
    group.add(pulseLight);

    patchCables.push({
      tube: tubeMesh,
      curve,
      pulseLight,
      color: conn.color,
      speed: conn.speed,
    });
  });

  const update = (time: number, isDark: boolean) => {
    if (isDark) {
      rackCaseMat.color.setHex(0x10121a);
      moduleFaceMat.color.setHex(0x1a1e2a);
    } else {
      rackCaseMat.color.setHex(0x282c3c);
      moduleFaceMat.color.setHex(0x353b4c);
    }

    // Animate knobs rotating subtly
    knobs.forEach((k, idx) => {
      k.rotation.z = Math.sin(time * 0.5 + idx * 0.7) * 1.2;
    });

    // Animate electricity packets traveling along patch cables
    const speedMult = motion.playing ? 1.0 + motion.level * 2.0 : 1.0;
    patchCables.forEach((c) => {
      const t = (time * c.speed * speedMult * 0.4) % 1.0;
      const pt = c.curve.getPoint(t);
      c.pulseLight.position.copy(pt);
      const scale = 0.8 + Math.sin(time * 8) * 0.25;
      c.pulseLight.scale.set(scale, scale, scale);
    });

    // Animate status LEDs (LFO flashing, etc.)
    statusLeds.forEach((item, idx) => {
      const flashSpeed = item.type.includes('LFO') ? 4 : 2;
      const alpha = (Math.sin(time * flashSpeed + idx) * 0.5 + 0.5);
      const mat = item.mesh.material as THREE.MeshBasicMaterial;
      mat.color.setRGB(0.3 * alpha, 0.8 * alpha, 1.0 * alpha);
    });

    // Animate VU meter
    const vuLevel = motion.playing ? Math.min(8, Math.floor(motion.level * 12)) : Math.floor(Math.sin(time * 2) * 2 + 3);
    vuLeds.forEach((led, idx) => {
      led.visible = idx <= vuLevel;
    });
  };

  const destroy = () => {
    frameGeom.dispose();
    panelGeom.dispose();
    jackGeom.dispose();
    patchCables.forEach((c) => {
      c.tube.geometry.dispose();
      c.pulseLight.geometry.dispose();
    });
  };

  return { group, update, destroy };
}

