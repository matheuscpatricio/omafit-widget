import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Fator base ajustável para escala biométrica (pulso). */
export const SCALE_FACTOR = 1.0;
/** Multiplicadores por tamanho manual escolhido. */
export const SIZE_MULTIPLIER = {
  P: 0.92,
  M: 1.0,
  G: 1.1,
};
/** Restrições anti-glitch para tracking. */
export const TRACKING_ROTATION_Z_MIN = -1.9;
export const TRACKING_ROTATION_Z_MAX = 1.9;
export const TRACKING_SCALE_MIN = 0.03;
export const TRACKING_SCALE_MAX = 0.9;
export const TRACKING_MAX_POSITION_JUMP = 0.35;
export const TRACKING_MAX_ROTATION_JUMP = 1.0;
export const TRACKING_MAX_SCALE_JUMP = 0.35;

/**
 * Calcula escala inteligente com distância do pulso + perfil + override P/M/G.
 *
 * @param {{
 *   baseScale: number,
 *   wristDistance: number,
 *   scaleFactor?: number,
 *   userProfileScale?: number,
 *   sizeOverride?: "P" | "M" | "G" | null
 * }} p
 * @returns {number}
 */
export function computeAccessoryScaleFromWrist(p) {
  const baseScale = Number.isFinite(Number(p?.baseScale)) ? Number(p.baseScale) : 1;
  const wristDistance = Number.isFinite(Number(p?.wristDistance))
    ? Math.max(0.001, Number(p.wristDistance))
    : 1;
  const factor = Number.isFinite(Number(p?.scaleFactor)) ? Number(p.scaleFactor) : SCALE_FACTOR;
  const profileMul = Number.isFinite(Number(p?.userProfileScale)) ? Number(p.userProfileScale) : 1;
  const sizeKey = typeof p?.sizeOverride === "string" ? p.sizeOverride.toUpperCase() : "";
  const sizeMul = SIZE_MULTIPLIER[sizeKey] || 1;
  return baseScale * (wristDistance * factor) * profileMul * sizeMul;
}

/**
 * Gera landmarks simples para teste local sem tracker real.
 * Convenção: `landmark[0] = pulso`, `landmark[9] = direção antebraço`.
 *
 * @param {{
 *   wrist?: { x: number, y: number, z?: number },
 *   forearm?: { x: number, y: number, z?: number },
 * }} [seed]
 * @returns {Array<{x:number,y:number,z:number}>}
 */
export function createMockHandLandmarks(seed = {}) {
  const wrist = seed.wrist || { x: 0, y: 0, z: -0.45 };
  const forearm = seed.forearm || { x: 0.08, y: 0.02, z: -0.45 };
  const arr = Array.from({ length: 21 }, () => ({ x: wrist.x, y: wrist.y, z: wrist.z || 0 }));
  arr[0] = { x: wrist.x, y: wrist.y, z: wrist.z || 0 };
  arr[9] = { x: forearm.x, y: forearm.y, z: forearm.z || wrist.z || 0 };
  return arr;
}

/**
 * Extrai transform do pulso a partir de landmarks.
 *
 * Regras:
 * - posição = `landmark[0]`
 * - rotação.z = `atan2(antebraço.y - pulso.y, antebraço.x - pulso.x)`
 * - escala = distância entre `landmark[0]` e `landmark[9]`
 *
 * @param {Array<{x:number,y:number,z?:number}>} landmarks
 * @returns {{
 *   position: { x: number, y: number, z: number },
 *   rotation: { z: number },
 *   scale: number
 * } | null}
 */
export function getWristTransform(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length <= 9) return null;

  const wrist = landmarks[0];
  const forearm = landmarks[9];
  if (!wrist || !forearm) return null;

  const wx = Number(wrist.x);
  const wy = Number(wrist.y);
  const wz = Number.isFinite(Number(wrist.z)) ? Number(wrist.z) : 0;
  const fx = Number(forearm.x);
  const fy = Number(forearm.y);
  const fz = Number.isFinite(Number(forearm.z)) ? Number(forearm.z) : wz;

  if (![wx, wy, wz, fx, fy, fz].every(Number.isFinite)) return null;

  const dx = fx - wx;
  const dy = fy - wy;
  const dz = fz - wz;
  const rotationZ = Math.atan2(dy, dx);
  const scale = Math.hypot(dx, dy, dz);

  return {
    position: { x: wx, y: wy, z: wz },
    rotation: { z: rotationZ },
    scale,
  };
}

/**
 * Variante de wrist transform com escala inteligente.
 *
 * @param {Array<{x:number,y:number,z?:number}>} landmarks
 * @param {{
 *   baseScale?: number,
 *   scaleFactor?: number,
 *   userProfileScale?: number,
 *   sizeOverride?: "P" | "M" | "G" | null
 * }} [options]
 * @returns {{
 *   position: { x: number, y: number, z: number },
 *   rotation: { z: number },
 *   scale: number
 * } | null}
 */
export function getWristTransformWithScaleProfile(landmarks, options = {}) {
  const t = getWristTransform(landmarks);
  if (!t) return null;
  t.scale = computeAccessoryScaleFromWrist({
    baseScale: Number.isFinite(Number(options.baseScale)) ? Number(options.baseScale) : 1,
    wristDistance: t.scale,
    scaleFactor: options.scaleFactor,
    userProfileScale: options.userProfileScale,
    sizeOverride: options.sizeOverride || null,
  });
  return t;
}

/**
 * Aplica transform de tracking ao mesh GLB.
 *
 * Suporta 2 formatos de posição:
 * - Mundo (default): x/y/z já em coordenadas Three.js.
 * - Tela normalizada [0..1]: definir `transform.positionSpace = "screen"`.
 *
 * Para conversão screen->3D:
 * - Usa `mesh.userData.arCamera` (PerspectiveCamera) para unproject.
 * - Usa `transform.depth` (distância positiva) ou fallback `mesh.userData.arDepth` (default 0.45 m).
 *
 * Ajuste de eixo do acessório:
 * - `mesh.userData.armAxisOffsetZ` (rad) aplica offset para alinhar relógio/pulseira ao braço.
 *
 * @param {THREE.Object3D} mesh
 * @param {{
 *   position?: { x: number, y: number, z?: number },
 *   rotation?: { z?: number },
 *   scale?: number,
 *   positionSpace?: "world" | "screen",
 *   depth?: number
 * }} transform
 */
export function applyTransform(mesh, transform) {
  if (!mesh || !transform) return;

  const pos = transform.position;
  if (pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y))) {
    const px = Number(pos.x);
    const py = Number(pos.y);
    const pz = Number.isFinite(Number(pos.z)) ? Number(pos.z) : 0;
    const positionSpace = transform.positionSpace || "world";

    if (positionSpace === "screen") {
      const cam = mesh.userData?.arCamera || null;
      if (cam?.isPerspectiveCamera) {
        const ndcX = px * 2 - 1;
        const ndcY = -(py * 2 - 1);
        const depth = Number.isFinite(Number(transform.depth))
          ? Math.max(0.05, Number(transform.depth))
          : Number.isFinite(Number(mesh.userData?.arDepth))
            ? Math.max(0.05, Number(mesh.userData.arDepth))
            : 0.45;
        const world = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam);
        const dir = world.sub(cam.position).normalize();
        mesh.position.copy(cam.position).addScaledVector(dir, depth);
      } else {
        // Fallback seguro: sem câmera, trata como mundo.
        mesh.position.set(px, py, pz);
      }
    } else {
      mesh.position.set(px, py, pz);
    }
  }

  if (transform.rotation && Number.isFinite(Number(transform.rotation.z))) {
    const armAxisOffsetZ = Number.isFinite(Number(mesh.userData?.armAxisOffsetZ))
      ? Number(mesh.userData.armAxisOffsetZ)
      : 0;
    mesh.rotation.z = Number(transform.rotation.z) + armAxisOffsetZ;
  }

  if (Number.isFinite(Number(transform.scale)) && Number(transform.scale) > 0) {
    mesh.scale.setScalar(Number(transform.scale));
  }
}

/**
 * Corrige pivot deslocado aplicando offset local no mesh.
 *
 * @param {THREE.Object3D} mesh
 * @param {{ offsetX?: number, offsetY?: number, offsetZ?: number }} offset
 */
export function applyPivotCorrection(mesh, offset = {}) {
  if (!mesh) return;
  const ox = Number.isFinite(Number(offset.offsetX)) ? Number(offset.offsetX) : 0;
  const oy = Number.isFinite(Number(offset.offsetY)) ? Number(offset.offsetY) : 0;
  const oz = Number.isFinite(Number(offset.offsetZ)) ? Number(offset.offsetZ) : 0;
  mesh.position.add(new THREE.Vector3(ox, oy, oz));
}

/**
 * Suaviza transform com interpolação linear (lerp).
 *
 * @param {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }} current
 * @param {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }} target
 * @param {number} factor valor típico: 0.1 ~ 0.3
 * @returns {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }}
 */
export function smoothTransform(current, target, factor = 0.2) {
  const t = THREE.MathUtils.clamp(Number(factor) || 0.2, 0.001, 1);

  const outPos = current.position.clone().lerp(target.position, t);
  const outRot = THREE.MathUtils.lerp(current.rotationZ, target.rotationZ, t);
  const outScale = THREE.MathUtils.lerp(current.scale, target.scale, t);

  return {
    position: outPos,
    rotationZ: outRot,
    scale: outScale,
  };
}

/**
 * Normaliza/clampa transform para intervalo seguro visual.
 *
 * @param {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }} t
 * @returns {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }}
 */
export function clampTrackingTransform(t) {
  return {
    position: t.position.clone(),
    rotationZ: THREE.MathUtils.clamp(t.rotationZ, TRACKING_ROTATION_Z_MIN, TRACKING_ROTATION_Z_MAX),
    scale: THREE.MathUtils.clamp(t.scale, TRACKING_SCALE_MIN, TRACKING_SCALE_MAX),
  };
}

/**
 * Detecta frame inconsistente comparando salto contra último frame aceite.
 *
 * @param {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * } | null} prev
 * @param {{
 *   position: THREE.Vector3,
 *   rotationZ: number,
 *   scale: number
 * }} next
 * @returns {boolean}
 */
export function isTrackingFrameConsistent(prev, next) {
  if (!prev) return true;
  const posJump = prev.position.distanceTo(next.position);
  const rotJump = Math.abs(next.rotationZ - prev.rotationZ);
  const scaleJump = Math.abs(next.scale - prev.scale);
  return (
    posJump <= TRACKING_MAX_POSITION_JUMP &&
    rotJump <= TRACKING_MAX_ROTATION_JUMP &&
    scaleJump <= TRACKING_MAX_SCALE_JUMP
  );
}

/**
 * Igual ao `applyTransform`, mas com suavização em posição/rotação/escala.
 *
 * @param {THREE.Object3D} mesh
 * @param {{
 *   position?: { x: number, y: number, z?: number },
 *   rotation?: { z?: number },
 *   scale?: number,
 *   positionSpace?: "world" | "screen",
 *   depth?: number,
 *   smoothFactor?: number
 * }} transform
 */
export function applyTransformSmoothed(mesh, transform) {
  if (!mesh || !transform) return;

  const pos = transform.position;
  let targetPosition = mesh.position.clone();
  if (pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y))) {
    const px = Number(pos.x);
    const py = Number(pos.y);
    const pz = Number.isFinite(Number(pos.z)) ? Number(pos.z) : 0;
    const positionSpace = transform.positionSpace || "world";

    if (positionSpace === "screen") {
      const cam = mesh.userData?.arCamera || null;
      if (cam?.isPerspectiveCamera) {
        const ndcX = px * 2 - 1;
        const ndcY = -(py * 2 - 1);
        const depth = Number.isFinite(Number(transform.depth))
          ? Math.max(0.05, Number(transform.depth))
          : Number.isFinite(Number(mesh.userData?.arDepth))
            ? Math.max(0.05, Number(mesh.userData.arDepth))
            : 0.45;
        const world = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam);
        const dir = world.sub(cam.position).normalize();
        targetPosition = cam.position.clone().addScaledVector(dir, depth);
      } else {
        targetPosition.set(px, py, pz);
      }
    } else {
      targetPosition.set(px, py, pz);
    }
  }

  const armAxisOffsetZ = Number.isFinite(Number(mesh.userData?.armAxisOffsetZ))
    ? Number(mesh.userData.armAxisOffsetZ)
    : 0;
  const targetRotationZ =
    transform.rotation && Number.isFinite(Number(transform.rotation.z))
      ? Number(transform.rotation.z) + armAxisOffsetZ
      : mesh.rotation.z;

  const targetScale =
    Number.isFinite(Number(transform.scale)) && Number(transform.scale) > 0
      ? Number(transform.scale)
      : mesh.scale.x;

  const currentT = {
    position: mesh.position.clone(),
    rotationZ: mesh.rotation.z,
    scale: mesh.scale.x,
  };
  const targetT = clampTrackingTransform({
    position: targetPosition,
    rotationZ: targetRotationZ,
    scale: targetScale,
  });

  const prevAccepted = mesh.userData?.lastAcceptedTrackingTransform || null;
  if (!isTrackingFrameConsistent(prevAccepted, targetT)) {
    // Frame incoerente: ignora para evitar glitch visual.
    return;
  }

  const sm = smoothTransform(
    currentT,
    targetT,
    transform.smoothFactor ?? mesh.userData?.smoothFactor ?? 0.2,
  );

  mesh.position.copy(sm.position);
  mesh.rotation.z = sm.rotationZ;
  mesh.scale.setScalar(sm.scale);
  mesh.userData.lastAcceptedTrackingTransform = {
    position: sm.position.clone(),
    rotationZ: sm.rotationZ,
    scale: sm.scale,
  };

  if (transform.pivotOffset) {
    applyPivotCorrection(mesh, transform.pivotOffset);
  }
}

/**
 * Base de cena AR para acessórios (sem tracking nativo).
 * Pronta para receber coordenadas externas depois via `setTrackingPose`.
 */
export class OmafitArSceneBase {
  /**
   * @param {{
   *   container: HTMLElement;
   *   modelUrl?: string;
   *   modelScale?: number;
   *   cameraFov?: number;
   *   cameraNear?: number;
   *   cameraFar?: number;
   *   clearColor?: number;
   * }} options
   */
  constructor(options) {
    if (!options?.container) {
      throw new Error("`container` é obrigatório para inicializar a cena AR.");
    }

    this.container = options.container;
    this.modelUrl = options.modelUrl || "";
    this.modelScale = Number.isFinite(Number(options.modelScale))
      ? Number(options.modelScale)
      : 0.18;
    this.cameraFov = Number.isFinite(Number(options.cameraFov))
      ? Number(options.cameraFov)
      : 45;
    this.cameraNear = Number.isFinite(Number(options.cameraNear))
      ? Number(options.cameraNear)
      : 0.01;
    this.cameraFar = Number.isFinite(Number(options.cameraFar))
      ? Number(options.cameraFar)
      : 100;
    this.clearColor = Number.isFinite(Number(options.clearColor))
      ? Number(options.clearColor)
      : 0x000000;
    this.scaleFactor = Number.isFinite(Number(options.scaleFactor))
      ? Number(options.scaleFactor)
      : SCALE_FACTOR;
    this.userProfileScale = Number.isFinite(Number(options.userProfileScale))
      ? Number(options.userProfileScale)
      : 1;
    this.sizeOverride = typeof options.sizeOverride === "string" ? options.sizeOverride.toUpperCase() : null;
    this.pivotOffset = {
      offsetX: Number.isFinite(Number(options.pivotOffset?.offsetX))
        ? Number(options.pivotOffset.offsetX)
        : 0,
      offsetY: Number.isFinite(Number(options.pivotOffset?.offsetY))
        ? Number(options.pivotOffset.offsetY)
        : 0,
      offsetZ: Number.isFinite(Number(options.pivotOffset?.offsetZ))
        ? Number(options.pivotOffset.offsetZ)
        : 0,
    };
    /**
     * Provedor externo de landmarks (opcional).
     * Assinatura esperada: `() => Array<Landmark> | null`
     */
    this.landmarkProvider =
      typeof options.landmarkProvider === "function" ? options.landmarkProvider : null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.bgScene = null;
    this.bgCamera = null;
    this.bgMesh = null;
    this.video = null;
    this.videoTexture = null;
    this.mediaStream = null;

    this.modelRoot = null;
    this.gltfLoader = new GLTFLoader();

    this.lastTrackingPose = null;
    this.lastAcceptedTrackingTransform = null;
    this.lastLandmarks = null;
    this.lastComputedTransform = null;
    this.isRunning = false;
    this.rafId = 0;
    this.isAnimateTickRunning = false;

    this.handleResize = this.handleResize.bind(this);
    this.update = this.update.bind(this);
    this.animate = this.animate.bind(this);
  }

  async init() {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    await this.initWebcamBackground();

    if (this.modelUrl) {
      await this.loadModel(this.modelUrl);
    }

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(this.clearColor, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  initCamera() {
    const aspect = Math.max(1e-4, this.container.clientWidth / Math.max(1, this.container.clientHeight));
    this.camera = new THREE.PerspectiveCamera(
      this.cameraFov,
      aspect,
      this.cameraNear,
      this.cameraFar,
    );
    this.camera.position.set(0, 0, 1.4);
  }

  initLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1f1f1f, 0.9);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(1.2, 2.0, 2.8);
    this.scene.add(hemi, dir);
  }

  async initWebcamBackground() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    const bgGeom = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.MeshBasicMaterial({ map: videoTexture, depthTest: false, depthWrite: false });
    this.bgMesh = new THREE.Mesh(bgGeom, bgMat);
    this.bgScene.add(this.bgMesh);

    this.video = video;
    this.videoTexture = videoTexture;
    this.mediaStream = stream;
  }

  /**
   * Carrega um GLB leve e aplica escala inicial ajustável.
   * @param {string} modelUrl
   */
  async loadModel(modelUrl) {
    const gltf = await this.gltfLoader.loadAsync(modelUrl);
    const root = gltf.scene;
    root.position.set(0, 0, 0);
    root.scale.setScalar(this.modelScale);

    // Mantém materiais simples para reduzir custo de render.
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      obj.frustumCulled = true;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });

    if (this.modelRoot) this.scene.remove(this.modelRoot);
    this.modelRoot = root;
    this.scene.add(root);

    return root;
  }

  /**
   * Atualiza escala global do acessório em runtime.
   * @param {number} scale
   */
  setModelScale(scale) {
    const value = Number(scale);
    if (!this.modelRoot || !Number.isFinite(value) || value <= 0) return;
    this.modelScale = value;
    this.modelRoot.scale.setScalar(value);
  }

  /**
   * Atualiza parâmetros de escala inteligente em runtime.
   * @param {{ scaleFactor?: number, userProfileScale?: number, sizeOverride?: "P" | "M" | "G" | null }} config
   */
  setScaleProfile(config = {}) {
    if (Number.isFinite(Number(config.scaleFactor))) {
      this.scaleFactor = Number(config.scaleFactor);
    }
    if (Number.isFinite(Number(config.userProfileScale))) {
      this.userProfileScale = Number(config.userProfileScale);
    }
    if (config.sizeOverride === null) {
      this.sizeOverride = null;
    } else if (typeof config.sizeOverride === "string") {
      const key = config.sizeOverride.toUpperCase();
      this.sizeOverride = SIZE_MULTIPLIER[key] ? key : this.sizeOverride;
    }
  }

  /**
   * Atualiza correção manual de pivot.
   * @param {{ offsetX?: number, offsetY?: number, offsetZ?: number }} offset
   */
  setPivotCorrection(offset = {}) {
    if (Number.isFinite(Number(offset.offsetX))) this.pivotOffset.offsetX = Number(offset.offsetX);
    if (Number.isFinite(Number(offset.offsetY))) this.pivotOffset.offsetY = Number(offset.offsetY);
    if (Number.isFinite(Number(offset.offsetZ))) this.pivotOffset.offsetZ = Number(offset.offsetZ);
  }

  /**
   * Define/atualiza provedor externo de landmarks.
   * @param {(() => Array<{x:number,y:number,z?:number}> | null) | null} provider
   */
  setLandmarkProvider(provider) {
    this.landmarkProvider = typeof provider === "function" ? provider : null;
  }

  /**
   * API pronta para tracking externo.
   * Aceita posição/quaternion/escala e aplica no modelo.
   *
   * @param {{
   *   position?: [number, number, number];
   *   quaternion?: [number, number, number, number];
   *   scale?: number;
   *   visible?: boolean;
   * }} pose
   */
  setTrackingPose(pose) {
    this.lastTrackingPose = pose || null;
    if (!this.modelRoot || !pose) return;

    this.modelRoot.userData.arCamera = this.camera;
    this.modelRoot.userData.arDepth = 0.45;
    if (this.lastAcceptedTrackingTransform) {
      this.modelRoot.userData.lastAcceptedTrackingTransform = {
        position: this.lastAcceptedTrackingTransform.position.clone(),
        rotationZ: this.lastAcceptedTrackingTransform.rotationZ,
        scale: this.lastAcceptedTrackingTransform.scale,
      };
    }

    if (Array.isArray(pose.position) && pose.position.length >= 2) {
      applyTransformSmoothed(this.modelRoot, {
        position: {
          x: pose.position[0],
          y: pose.position[1],
          z: pose.position.length >= 3 ? pose.position[2] : undefined,
        },
        scale: pose.scale,
        positionSpace: pose.positionSpace || "world",
        depth: pose.depth,
        smoothFactor: pose.smoothFactor,
        pivotOffset: pose.pivotOffset || this.pivotOffset,
      });
    } else {
      // Sem tracking: mantém no centro da tela em frente à câmera.
      this.modelRoot.position.set(0, 0, -0.45);
      if (Number.isFinite(Number(pose.scale)) && Number(pose.scale) > 0) {
        this.modelRoot.scale.setScalar(Number(pose.scale));
      }
    }

    if (Array.isArray(pose.quaternion) && pose.quaternion.length === 4) {
      this.modelRoot.quaternion.set(
        pose.quaternion[0],
        pose.quaternion[1],
        pose.quaternion[2],
        pose.quaternion[3],
      );
    } else if (pose.rotation && Number.isFinite(Number(pose.rotation.z))) {
      applyTransform(this.modelRoot, {
        rotation: { z: pose.rotation.z },
      });
    }

    if (typeof pose.visible === "boolean") {
      this.modelRoot.visible = pose.visible;
    }

    const accepted = this.modelRoot.userData.lastAcceptedTrackingTransform;
    if (accepted) {
      this.lastAcceptedTrackingTransform = {
        position: accepted.position.clone(),
        rotationZ: accepted.rotationZ,
        scale: accepted.scale,
      };
    }
  }

  /**
   * Conveniência: aplica direto landmarks do tracker no modelo 3D.
   * @param {Array<{x:number,y:number,z?:number}>} landmarks
   * @returns {ReturnType<typeof getWristTransform>}
   */
  applyLandmarks(landmarks) {
    const wrist = getWristTransformWithScaleProfile(landmarks, {
      baseScale: this.modelScale,
      scaleFactor: this.scaleFactor,
      userProfileScale: this.userProfileScale,
      sizeOverride: this.sizeOverride,
    });
    if (!wrist) return null;

    this.setTrackingPose({
      position: [wrist.position.x, wrist.position.y, wrist.position.z],
      rotation: { z: wrist.rotation.z },
      scale: wrist.scale,
      visible: true,
      positionSpace: "world",
    });

    return wrist;
  }

  /**
   * 1) Captura landmarks do provider externo.
   * @returns {Array<{x:number,y:number,z?:number}> | null}
   */
  captureLandmarks() {
    if (typeof this.landmarkProvider !== "function") return null;
    try {
      const lms = this.landmarkProvider();
      if (Array.isArray(lms) && lms.length > 9) return lms;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 2) Calcula transform do pulso a partir de landmarks.
   * @param {Array<{x:number,y:number,z?:number}> | null} landmarks
   * @returns {ReturnType<typeof getWristTransformWithScaleProfile>}
   */
  calculateTrackingTransform(landmarks) {
    if (!Array.isArray(landmarks)) return null;
    return getWristTransformWithScaleProfile(landmarks, {
      baseScale: this.modelScale,
      scaleFactor: this.scaleFactor,
      userProfileScale: this.userProfileScale,
      sizeOverride: this.sizeOverride,
    });
  }

  /**
   * 3/4) Suaviza (no pipeline interno) e aplica no mesh.
   * @param {ReturnType<typeof getWristTransformWithScaleProfile> | null} transform
   */
  applyTrackingTransform(transform) {
    if (!transform) return;
    this.setTrackingPose({
      position: [transform.position.x, transform.position.y, transform.position.z],
      rotation: { z: transform.rotation.z },
      scale: transform.scale,
      visible: true,
      positionSpace: "world",
    });
  }

  /**
   * 5) Renderiza frame completo (background webcam + cena 3D).
   */
  renderFrame() {
    if (!this.renderer || !this.bgScene || !this.bgCamera || !this.scene || !this.camera) return;
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCamera);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /**
   * Loop principal AR em tempo real:
   * 1) capturar landmarks
   * 2) calcular transform
   * 3) suavizar valores
   * 4) aplicar no mesh
   * 5) renderizar cena
   */
  animate() {
    if (!this.isRunning || this.isAnimateTickRunning) return;
    this.isAnimateTickRunning = true;

    const landmarks = this.captureLandmarks();
    this.lastLandmarks = landmarks;

    const transform = this.calculateTrackingTransform(landmarks);
    this.lastComputedTransform = transform;

    if (this.modelRoot && transform) {
      // Suavização ocorre internamente em `setTrackingPose` -> `applyTransformSmoothed`.
      this.applyTrackingTransform(transform);
    } else if (this.modelRoot && !this.lastTrackingPose) {
      const dt = this.clock.getDelta();
      this.modelRoot.rotation.y += dt * 0.35;
      this.modelRoot.position.set(0, 0, -0.45);
    }

    this.renderFrame();
    this.isAnimateTickRunning = false;
    this.rafId = requestAnimationFrame(this.animate);
  }

  /**
   * Alias de compatibilidade com versões anteriores.
   */
  update() {
    this.animate();
  }

  handleResize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this.handleResize);

    if (this.modelRoot) {
      this.modelRoot.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    }

    if (this.videoTexture) this.videoTexture.dispose();
    if (this.bgMesh?.geometry) this.bgMesh.geometry.dispose();
    if (this.bgMesh?.material) this.bgMesh.material.dispose?.();

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}

