import * as THREE from 'three';
import { createSynth3D, SynthInstance } from './models/Synth3D';
import { createDrumMachine3D, DrumMachineInstance } from './models/DrumMachine3D';
import { createModular3D, ModularInstance } from './models/Modular3D';
import { createMusicTheory3D, MusicTheoryInstance } from './models/MusicTheory3D';
import { motion } from '../../hooks/motion';

export interface CameraWaypoint {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export class CinematicDirector {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private synth: SynthInstance;
  private drumMachine: DrumMachineInstance;
  private modular: ModularInstance;
  private theory: MusicTheoryInstance;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private synthPointLight: THREE.PointLight;
  private drumPointLight: THREE.PointLight;
  private modularPointLight: THREE.PointLight;

  // Camera animation
  private currentPos: THREE.Vector3;
  private currentTarget: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private targetLookAt: THREE.Vector3;

  private isDarkTheme = false;
  private isMobile = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0e1019, 0.035);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Initialize Camera State
    this.currentPos = new THREE.Vector3(0, 3.5, 9.5);
    this.currentTarget = new THREE.Vector3(0, 0, 0);
    this.targetPos = new THREE.Vector3(0, 3.5, 9.5);
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);

    // Setup Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff5ea, 1.4);
    this.keyLight.position.set(5, 10, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.001;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x5fd4ff, 1.0);
    this.rimLight.position.set(-8, 6, -5);
    this.scene.add(this.rimLight);

    this.synthPointLight = new THREE.PointLight(0x8658ff, 1.5, 12);
    this.synthPointLight.position.set(0, 2.5, 1.5);
    this.scene.add(this.synthPointLight);

    this.drumPointLight = new THREE.PointLight(0x00d4ff, 1.5, 12);
    this.drumPointLight.position.set(12, 2.5, 1.5);
    this.scene.add(this.drumPointLight);

    this.modularPointLight = new THREE.PointLight(0xb072ff, 1.8, 14);
    this.modularPointLight.position.set(0, 12, 3);
    this.scene.add(this.modularPointLight);

    // --- Instantiate 3D Instrument Models in distinct coordinates ---
    // Scene 1 & 2: Synthesizer at origin
    this.synth = createSynth3D();
    this.synth.group.position.set(0, 0, 0);
    this.scene.add(this.synth.group);

    // Scene 3: Drum Machine at offset x = 12
    this.drumMachine = createDrumMachine3D();
    this.drumMachine.group.position.set(12, 0, 0);
    this.scene.add(this.drumMachine.group);

    // Scene 4: Modular Eurorack Rack at y = 12
    this.modular = createModular3D();
    this.modular.group.position.set(0, 12, 0);
    this.scene.add(this.modular.group);

    // Scene 5: Music Theory Space at y = 24
    this.theory = createMusicTheory3D();
    this.theory.group.position.set(0, 24, 0);
    this.scene.add(this.theory.group);

    this.checkMobile();
  }

  public checkMobile() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.renderer.setPixelRatio(1.0);
      this.camera.fov = 54;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.camera.fov = 45;
    }
    this.camera.updateProjectionMatrix();
  }

  public updateScrollProgress(progress: number) {
    // Progress is 0.0 (top) to 1.0 (bottom of page)
    const p = Math.max(0, Math.min(1, progress));
    const distFactor = this.isMobile ? 1.35 : 1.0;

    // Define Waypoints for the 7 Scenes
    if (p <= 0.14) {
      // Scene 1 — Opening / AAK Music Identity (Establishing Cinematic Shot)
      const t = p / 0.14;
      this.targetPos.set(0, 3.8 * distFactor, 9.5 * distFactor);
      this.targetLookAt.set(0, 0.2, 0);
    } else if (p <= 0.32) {
      // Scene 2 — Synthesizer Close-up Inspection
      const t = (p - 0.14) / 0.18;
      // Dolly down and close to synth keyboard and display
      this.targetPos.set(
        -0.3 + Math.sin(t * Math.PI) * 0.4,
        (1.9 + (1 - t) * 0.8) * distFactor,
        (3.8 + (1 - t) * 1.5) * distFactor
      );
      this.targetLookAt.set(0, 0.2, 0.5);
    } else if (p <= 0.50) {
      // Scene 3 — Drum Machine & Rhythm Sequencer
      const t = (p - 0.32) / 0.18;
      // Camera transitions horizontally over to x = 12
      const startX = -0.3;
      const endX = 12.0;
      const currentX = THREE.MathUtils.lerp(startX, endX, t);

      this.targetPos.set(
        currentX,
        (2.4 + Math.sin(t * Math.PI) * 0.6) * distFactor,
        (4.4 + Math.sin(t * Math.PI) * 0.4) * distFactor
      );
      this.targetLookAt.set(currentX, 0.2, 0.2);
    } else if (p <= 0.68) {
      // Scene 4 — Modular Synthesizer Eurorack Wall
      const t = (p - 0.50) / 0.18;
      // Camera cranes up from drum machine to modular rack at (0, 12, 0)
      const startX = 12.0;
      const endX = 0.0;
      const currentX = THREE.MathUtils.lerp(startX, endX, t);
      const currentY = THREE.MathUtils.lerp(2.4, 12.2, t);

      this.targetPos.set(
        currentX,
        currentY * (this.isMobile ? 1.05 : 1.0),
        (5.8 + (1 - t) * 1.2) * distFactor
      );
      this.targetLookAt.set(currentX, 12.0, 0);
    } else if (p <= 0.84) {
      // Scene 5 — Music Theory & Harmonic Geometry
      const t = (p - 0.68) / 0.16;
      // Camera elevates into harmonic orbital space at (0, 24, 0)
      const currentY = THREE.MathUtils.lerp(12.2, 24.5, t);
      const angle = t * Math.PI * 0.4;
      const camZ = 7.5 * distFactor;

      this.targetPos.set(
        Math.sin(angle) * 2.5,
        currentY,
        Math.cos(angle) * camZ
      );
      this.targetLookAt.set(0, 24.0, 0);
    } else if (p <= 0.94) {
      // Scene 6 — AAK Music Releases
      const t = (p - 0.84) / 0.10;
      // Camera glides down to wide studio perspective
      this.targetPos.set(
        0,
        THREE.MathUtils.lerp(24.5, 3.2, t) * distFactor,
        (10.5 + t * 2.0) * distFactor
      );
      this.targetLookAt.set(0, 0.4, 0);
    } else {
      // Scene 7 — Brand Closing Finale
      const t = (p - 0.94) / 0.06;
      this.targetPos.set(0, 4.2 * distFactor, 14.0 * distFactor);
      this.targetLookAt.set(0, 0.2, 0);
    }
  }

  public setTheme(isDark: boolean) {
    this.isDarkTheme = isDark;
    if (isDark) {
      this.scene.fog!.color.setHex(0x0a0c14);
      this.ambientLight.color.setHex(0xaab5d0);
      this.ambientLight.intensity = 0.65;
      this.keyLight.color.setHex(0xffffff);
      this.keyLight.intensity = 1.3;
      this.rimLight.color.setHex(0x5fd4ff);
      this.rimLight.intensity = 1.2;
    } else {
      // Elegant Light Mode: architectural daylight with subtle cool tones
      this.scene.fog!.color.setHex(0xf0eef5);
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.1;
      this.keyLight.color.setHex(0xfff6ec);
      this.keyLight.intensity = 1.5;
      this.rimLight.color.setHex(0x7642ff);
      this.rimLight.intensity = 0.8;
    }
  }

  public resize(width: number, height: number) {
    this.checkMobile();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public render(time: number) {
    // Smooth camera interpolation (exponential dampening lerp)
    const lerpFactor = 0.08;
    this.currentPos.lerp(this.targetPos, lerpFactor);
    this.currentTarget.lerp(this.targetLookAt, lerpFactor);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);

    // Audio reactive point lights
    if (motion.playing) {
      this.synthPointLight.intensity = 1.2 + motion.level * 2.0;
      this.drumPointLight.intensity = 1.2 + motion.bass * 2.5;
      this.modularPointLight.intensity = 1.4 + motion.level * 2.2;
    } else {
      this.synthPointLight.intensity = 1.2 + Math.sin(time * 2) * 0.3;
      this.drumPointLight.intensity = 1.2 + Math.sin(time * 3) * 0.3;
      this.modularPointLight.intensity = 1.4 + Math.sin(time * 1.5) * 0.3;
    }

    // Update models
    this.synth.update(time, this.isDarkTheme);
    this.drumMachine.update(time, this.isDarkTheme);
    this.modular.update(time, this.isDarkTheme);
    this.theory.update(time, this.isDarkTheme);

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.synth.destroy();
    this.drumMachine.destroy();
    this.modular.destroy();
    this.theory.destroy();
    this.renderer.dispose();
  }
}

