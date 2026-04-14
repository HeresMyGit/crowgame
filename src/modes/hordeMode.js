import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const TUNING = {
  arenaHalfX: 20,
  arenaHalfZ: 15,
  floorThickness: 0.35,
  groundY: 0,
  playerPos: new THREE.Vector3(-17, 0.25, 12.2),
  playerFacing: new THREE.Vector3(2, 0, -2),
  playerHurtY: 1.05,
  playerHurtRadius: 0.95,
  playerTouchDistance: 1.1,
  platformHalfExtents: new THREE.Vector3(1.15, 0.2, 1.15),
  muzzleOffset: new THREE.Vector3(0.05, 1.2, 0),
  bulletSpeed: 36,
  bulletLifetime: 1.45,
  bulletRadius: 0.16,
  bulletMax: 64,
  enemyRadius: 0.8,
  enemyMax: 44,
  enemyBaseSpeed: 2.5,
  enemySpeedRamp: 0.05,
  enemySpawnStart: 1.8,
  enemySpawnMin: 0.55,
  enemySpawnAccel: 0.03,
  maxRagdolls: 28,
  ragdollLifetime: 7.5,
};
const CAMERA_PRESETS = {
  current: { pos: [18, 17, 20], lookAt: [1.8, 0.9, -1.6] },
  diablo: { pos: [14.5, 20.5, 14], lookAt: [0, 0.8, 0] },
  topdown: { pos: [0, 33, 0.001], lookAt: [0, 0, 0] },
  shoulder: { pos: [-20.71, 4.53, 15.58], lookAt: [-8.41, -2.06, 4.2] },
  sideline: { pos: [24, 9.2, 0], lookAt: [-2, 1.2, 0] },
};
const PLAYER_IDLE_CLIP_PREFERENCES = [
  'Idle_With_Aimed_Pistol',
  'Standing_Idle',
  'General_Conversation',
];
const ENEMY_MOVESETS = [
  {
    id: 'walk',
    weight: 0.36,
    moveClip: 'Walking_Forward_InPlace',
    moveClipTimeScale: 1,
    speedMultiplier: 0.88,
    pauseChance: 0.2,
    pauseCheckMin: 1.8,
    pauseCheckMax: 3.6,
    pauseDurationMin: 0.9,
    pauseDurationMax: 2.2,
    pauseClips: [
      'Standing_Idle_Looking_Around',
      'Being_Terrified_While_Standing',
      'Boxing_Taunt',
    ],
  },
  {
    id: 'happy_walk',
    weight: 0.2,
    moveClip: 'Happy_Walking_Forward_InPlace',
    moveClipTimeScale: 1.2,
    speedMultiplier: 0.98,
    pauseChance: 0.18,
    pauseCheckMin: 2,
    pauseCheckMax: 3.8,
    pauseDurationMin: 0.8,
    pauseDurationMax: 1.8,
    pauseClips: [
      'Male_Cheering_With_Two_Fists_Pump',
      'Boxing_Taunt',
      'Standing_Idle_Looking_Around',
    ],
  },
  {
    id: 'run',
    weight: 0.24,
    moveClip: 'Slow_Run_Forward_InPlace',
    moveClipTimeScale: 1.08,
    speedMultiplier: 1.38,
    pauseChance: 0.12,
    pauseCheckMin: 1.4,
    pauseCheckMax: 2.7,
    pauseDurationMin: 0.6,
    pauseDurationMax: 1.25,
    pauseClips: [
      'Boxing_Taunt',
      'Standing_Idle_Looking_Around',
    ],
  },
  {
    id: 'zombie_walk',
    weight: 0.15,
    moveClip: 'Zombie_Walking_InPlace',
    moveClipTimeScale: 0.92,
    speedMultiplier: 0.74,
    pauseChance: 0.32,
    pauseCheckMin: 1.7,
    pauseCheckMax: 3.3,
    pauseDurationMin: 1.1,
    pauseDurationMax: 2.5,
    pauseClips: [
      'Zombie_Standing_Idle',
      'Zombie_Looking_Around',
      'Zombie_Scratching_Idle',
      'Zombie_Twitching_Idle',
    ],
  },
  {
    id: 'zombie_run',
    weight: 0.05,
    moveClip: 'Zombie_Run',
    moveClipTimeScale: 1,
    speedMultiplier: 1.06,
    pauseChance: 0.16,
    pauseCheckMin: 1.5,
    pauseCheckMax: 2.8,
    pauseDurationMin: 0.8,
    pauseDurationMax: 1.6,
    pauseClips: [
      'Zombie_Screaming',
      'Zombie_Looking_Around',
      'Zombie_Standing_Idle',
    ],
  },
];
const ENEMY_PAUSE_MIN_DISTANCE = 3.4;
const ENEMY_MIXER_TIME_SCALE = 0.65;
const MIXAMO_FILES = Array.from(
  new Set([
    ...PLAYER_IDLE_CLIP_PREFERENCES,
    ...ENEMY_MOVESETS.map((set) => set.moveClip),
    ...ENEMY_MOVESETS.flatMap((set) => set.pauseClips),
  ])
);
const MIXAMO_CLIP_PATHS = [
  '/animations',
  '/mixamo-sample',
];
const CAMERA_CONTROLS = {
  moveSpeed: 13,
  verticalSpeed: 9,
  yawSpeed: 1.7,
  pitchSpeed: 1.25,
  lookDistance: 18,
};

function makeBulletMesh() {
  const geo = new THREE.SphereGeometry(TUNING.bulletRadius, 10, 10);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff1c1,
    emissive: 0xff8f4c,
    emissiveIntensity: 1.35,
    roughness: 0.3,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makeFloorMesh() {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(TUNING.arenaHalfX * 2, TUNING.arenaHalfZ * 2),
    new THREE.MeshStandardMaterial({ color: 0x203141, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = TUNING.groundY;
  floor.receiveShadow = true;
  group.add(floor);

  const grid = new THREE.GridHelper(
    TUNING.arenaHalfX * 2,
    Math.round(TUNING.arenaHalfX * 2),
    0x36536a,
    0x2b4358
  );
  grid.position.y = TUNING.groundY + 0.01;
  group.add(grid);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TUNING.arenaHalfX * 2, 0.02, TUNING.arenaHalfZ * 2)),
    new THREE.LineBasicMaterial({ color: 0x4ecdc4 })
  );
  border.position.y = TUNING.groundY + 0.02;
  group.add(border);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.7, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x4e6d83, roughness: 0.78, metalness: 0.15 })
  );
  platform.position.set(TUNING.playerPos.x, TUNING.groundY + 0.2, TUNING.playerPos.z);
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  return group;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomSpawnPoint() {
  // Spawn only from the two sides opposite the player's corner:
  // opposite X wall and opposite Z wall.
  const oppositeX = TUNING.playerPos.x <= 0 ? TUNING.arenaHalfX + 1.5 : -TUNING.arenaHalfX - 1.5;
  const oppositeZ = TUNING.playerPos.z >= 0 ? -TUNING.arenaHalfZ - 1.5 : TUNING.arenaHalfZ + 1.5;

  if (Math.random() < 0.5) {
    return new THREE.Vector3(oppositeX, TUNING.playerPos.y, THREE.MathUtils.randFloatSpread(TUNING.arenaHalfZ * 2));
  }
  return new THREE.Vector3(THREE.MathUtils.randFloatSpread(TUNING.arenaHalfX * 2), TUNING.playerPos.y, oppositeZ);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeighted(items, weightKey = 'weight') {
  const total = items.reduce((sum, item) => sum + Math.max(0, item[weightKey] ?? 0), 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item[weightKey] ?? 0);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function applyHordeEyeOverride(targetScene) {
  if (!targetScene) return;

  const normalEyeMeshes = [];
  const redEyeMeshes = [];
  targetScene.traverse((child) => {
    if (!child.isMesh) return;
    if (child.name === 'eyes_normal') normalEyeMeshes.push(child);
    if (child.name === 'eyes_red') redEyeMeshes.push(child);
  });

  if (!normalEyeMeshes.some((mesh) => mesh.visible)) return;
  for (const mesh of normalEyeMeshes) mesh.visible = false;
  for (const mesh of redEyeMeshes) mesh.visible = true;
}

export default function createHordeMode(ctx) {
  const {
    RAPIER,
    scene,
    camera,
    renderer,
    world,
    eventQueue,
    spawnIdleMfer,
    createRagdoll,
    detachAccessories,
    destroyRagdoll,
    syncRagdollBones,
    playImpact,
    playPop,
    playGunshot,
  } = ctx;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TUNING.groundY);

  const enemies = [];
  const projectiles = [];
  const ragdolls = [];
  const enemyColliderHandles = new Set();

  let player = null;
  let floorVisual = null;
  let floorBody = null;
  let platformBody = null;
  let playerHurtBody = null;
  let playerHurtHandle = null;

  let active = false;
  let isGameOver = false;
  let isSettingsOpen = false;
  let hordeCameraDebugMode = true;
  let kills = 0;
  let elapsed = 0;
  let spawnTimer = 0;
  let physicsAccum = 0;
  let selectedCameraPreset = 'shoulder';

  const hordeHudEl = document.getElementById('horde-hud');
  const cameraDebugEl = document.getElementById('horde-camera-debug');
  const cameraReadoutEl = document.getElementById('horde-camera-readout');
  const settingsBtnEl = document.getElementById('horde-settings-btn');
  const settingsPanelEl = document.getElementById('horde-settings-panel');
  const debugToggleEl = document.getElementById('horde-debug-toggle');
  const cameraPresetButtons = Array.from(document.querySelectorAll('[data-horde-cam]'));
  const scoreEl = document.getElementById('horde-score');
  const timeEl = document.getElementById('horde-time');
  const gameOverEl = document.getElementById('horde-gameover');
  const finalEl = document.getElementById('horde-final');
  const retryBtn = document.getElementById('horde-retry-btn');
  const cameraKeysDown = new Set();
  const mixamoClips = new Map();
  let mixamoLoadPromise = null;
  let mixamoLoaded = false;

  function makeInPlaceClip(srcClip) {
    const clip = srcClip.clone();
    for (const track of clip.tracks) {
      if (!/mixamorigHips\.position/i.test(track.name)) continue;
      if (!track.values || track.values.length < 3) continue;
      const baseX = track.values[0];
      const baseZ = track.values[2];
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = baseX;
        track.values[i + 2] = baseZ;
      }
    }
    ensureClipStartsAtZero(clip);
    return clip;
  }

  function ensureClipStartsAtZero(clip) {
    const EPS = 0.0001;
    for (const track of clip.tracks) {
      if (!track?.times?.length || !track?.values?.length) continue;
      if (track.times[0] <= EPS) continue;

      const valueSize = track.values.length / track.times.length;
      if (!Number.isFinite(valueSize) || valueSize <= 0) continue;

      const TimesCtor = track.times.constructor;
      const ValuesCtor = track.values.constructor;

      const newTimes = new TimesCtor(track.times.length + 1);
      newTimes[0] = 0;
      newTimes.set(track.times, 1);

      const newValues = new ValuesCtor(track.values.length + valueSize);
      for (let i = 0; i < valueSize; i++) {
        newValues[i] = track.values[i];
      }
      newValues.set(track.values, valueSize);

      track.times = newTimes;
      track.values = newValues;
    }

    clip.resetDuration();
  }

  async function loadMixamoClipWithFallback(loader, clipName) {
    let lastErr = null;
    for (const basePath of MIXAMO_CLIP_PATHS) {
      try {
        const fbx = await loader.loadAsync(`${basePath}/${clipName}.fbx`);
        const srcClip = fbx.animations?.[0];
        if (!srcClip) return null;
        const clip = makeInPlaceClip(srcClip);
        clip.name = clipName;
        return clip;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) {
      console.warn(`[horde] failed to load animation ${clipName}`, lastErr);
    }
    return null;
  }

  async function loadMixamoClips() {
    if (mixamoLoadPromise) return mixamoLoadPromise;

    const loader = new FBXLoader();
    mixamoLoadPromise = Promise.all(MIXAMO_FILES.map(async (name) => {
      const clip = await loadMixamoClipWithFallback(loader, name);
      if (clip) mixamoClips.set(name, clip);
    })).then(() => {
      mixamoLoaded = mixamoClips.size > 0;
    });

    return mixamoLoadPromise;
  }

  function playMixamoClip(actor, clipName, {
    loop = THREE.LoopRepeat,
    repetitions = Infinity,
    clampWhenFinished = false,
    timeScale = 1,
    fadeDuration = 0.2,
    forceRestart = false,
  } = {}) {
    if (!actor?.mixer) return;
    const clip = mixamoClips.get(clipName);
    if (!clip) return;
    const isFirstMixamoBind = !actor.currentAction;

    if (!forceRestart && actor.currentClipName === clipName && actor.currentAction) {
      actor.currentAction.setLoop(loop, repetitions);
      actor.currentAction.clampWhenFinished = clampWhenFinished;
      actor.currentAction.timeScale = timeScale;
      return;
    }

    // The base GLB idle action is already playing on new spawns.
    // Clear it once before we start tracked mixamo transitions.
    if (isFirstMixamoBind) {
      actor.mixer.stopAllAction();
    }

    const nextAction = actor.mixer.clipAction(clip);
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setLoop(loop, repetitions);
    nextAction.clampWhenFinished = clampWhenFinished;
    nextAction.reset();
    const startOffset = Math.min(0.02, Math.max(0, clip.duration - 0.001));
    if (startOffset > 0) nextAction.time = startOffset;
    nextAction.play();

    const prevAction = actor.currentAction;
    if (prevAction && prevAction !== nextAction) {
      if (fadeDuration > 0) {
        nextAction.crossFadeFrom(prevAction, fadeDuration, false);
      } else {
        prevAction.stop();
      }
    }

    actor.currentAction = nextAction;
    actor.currentClipName = clipName;
    actor.mixer.update(0);
  }

  function playEnemyMoveClip(enemy) {
    if (!enemy?.moveSet) return;
    playMixamoClip(enemy, enemy.moveSet.moveClip, {
      loop: THREE.LoopRepeat,
      repetitions: Infinity,
      clampWhenFinished: false,
      timeScale: enemy.moveSet.moveClipTimeScale,
      fadeDuration: 0.2,
    });
  }

  function resolvePlayableMoveSet(preferred = null) {
    if (!mixamoLoaded) return preferred || pickWeighted(ENEMY_MOVESETS);
    if (preferred && mixamoClips.has(preferred.moveClip)) return preferred;

    const available = ENEMY_MOVESETS.filter((set) => mixamoClips.has(set.moveClip));
    if (!available.length) return preferred || pickWeighted(ENEMY_MOVESETS);
    return pickWeighted(available);
  }

  function pickPauseClipForMoveSet(moveSet) {
    if (!moveSet?.pauseClips?.length) return null;
    if (!mixamoLoaded) return pick(moveSet.pauseClips);

    const available = moveSet.pauseClips.filter((clipName) => mixamoClips.has(clipName));
    if (!available.length) return null;
    return pick(available);
  }

  function playEnemyPauseClip(enemy) {
    if (!enemy?.pauseClipName) return;
    const clip = mixamoClips.get(enemy.pauseClipName);
    if (!clip) return;
    playMixamoClip(enemy, enemy.pauseClipName, {
      loop: THREE.LoopOnce,
      repetitions: 1,
      clampWhenFinished: true,
      timeScale: enemy.pauseClipTimeScale || 1,
      fadeDuration: 0.14,
    });
    if (clip.duration > 0.0001) {
      const duration = clip.duration / (enemy.pauseClipTimeScale || 1);
      enemy.pauseTimer = Math.max(enemy.pauseTimer, duration + 0.05);
    }
  }

  function resolvePlayerIdleClip() {
    if (!mixamoLoaded) return player?.desiredClipName || PLAYER_IDLE_CLIP_PREFERENCES[0];
    for (const clipName of PLAYER_IDLE_CLIP_PREFERENCES) {
      if (mixamoClips.has(clipName)) return clipName;
    }
    return player?.desiredClipName || PLAYER_IDLE_CLIP_PREFERENCES[PLAYER_IDLE_CLIP_PREFERENCES.length - 1];
  }

  function playPlayerIdleClip(fadeDuration = 0.18) {
    if (!player) return;
    const idleClip = resolvePlayerIdleClip();
    player.desiredClipName = idleClip;
    if (!mixamoLoaded) return;
    playMixamoClip(player, idleClip, {
      loop: THREE.LoopRepeat,
      repetitions: Infinity,
      clampWhenFinished: false,
      timeScale: 1,
      fadeDuration,
    });
  }

  function applyLoadedAnimationsToActiveActors() {
    if (!active || !mixamoLoaded) return;

    if (player) {
      playPlayerIdleClip(0.08);
    }
    for (const enemy of enemies) {
      const nextMoveSet = resolvePlayableMoveSet(enemy.moveSet);
      if (nextMoveSet !== enemy.moveSet) {
        enemy.moveSet = nextMoveSet;
        enemy.speed = enemy.baseSpeed * nextMoveSet.speedMultiplier;
        enemy.pauseCooldown = randomRange(nextMoveSet.pauseCheckMin, nextMoveSet.pauseCheckMax);
      }
      if (enemy.state === 'pausing' && enemy.pauseClipName) {
        playEnemyPauseClip(enemy);
      } else {
        playEnemyMoveClip(enemy);
      }
    }
  }

  function removeProjectile(index) {
    const projectile = projectiles[index];
    if (!projectile) return;
    scene.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
    projectiles.splice(index, 1);
  }

  function cleanupProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) removeProjectile(i);
  }

  function removeEnemy(enemy, index, { stopMixer = true } = {}) {
    enemyColliderHandles.delete(enemy.colliderHandle);
    if (enemy.body) world.removeRigidBody(enemy.body);
    if (stopMixer && enemy.mixer) enemy.mixer.stopAllAction();
    enemies.splice(index, 1);
  }

  function cleanupEnemies(removeScene = true) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemyColliderHandles.delete(enemy.colliderHandle);
      if (enemy.body) world.removeRigidBody(enemy.body);
      if (enemy.mixer) enemy.mixer.stopAllAction();
      if (removeScene) scene.remove(enemy.scene);
      enemies.splice(i, 1);
    }
  }

  function cleanupRagdolls() {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      destroyRagdoll(ragdolls[i].mfer);
      ragdolls.pop();
    }
  }

  function syncRagdollVisuals(mfer) {
    syncRagdollBones(mfer);

    for (const d of mfer.debugMeshes) {
      const body = mfer.ragdollBodies[d.segName];
      if (!body) continue;
      const p = body.translation();
      const r = body.rotation();
      d.mesh.position.set(p.x, p.y, p.z);
      d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    if (!mfer.detachedPieces) return;
    for (const piece of mfer.detachedPieces) {
      const p = piece.body.translation();
      const r = piece.body.rotation();
      piece.mesh.position.set(p.x, p.y, p.z);
      piece.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  function updateRagdolls(delta) {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const entry = ragdolls[i];
      entry.ttl -= delta;
      syncRagdollVisuals(entry.mfer);
      if (entry.ttl <= 0) {
        destroyRagdoll(entry.mfer);
        ragdolls.splice(i, 1);
      }
    }

    while (ragdolls.length > TUNING.maxRagdolls) {
      const oldest = ragdolls.shift();
      destroyRagdoll(oldest.mfer);
    }
  }

  function setHud() {
    if (!scoreEl || !timeEl) return;
    scoreEl.textContent = `kills: ${kills}`;
    timeEl.textContent = `time: ${elapsed.toFixed(1)}s`;
  }

  function setGameOverUi(visible) {
    if (gameOverEl) gameOverEl.classList.toggle('is-visible', visible);
    if (visible && finalEl) {
      finalEl.textContent = `${kills} kills in ${elapsed.toFixed(1)}s`;
    }
  }

  function syncCameraPresetUi() {
    for (const btn of cameraPresetButtons) {
      btn.classList.toggle('is-active', btn.dataset.hordeCam === selectedCameraPreset);
    }
  }

  function applyCameraPreset(presetName) {
    const preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.current;
    selectedCameraPreset = CAMERA_PRESETS[presetName] ? presetName : 'current';
    camera.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    camera.lookAt(preset.lookAt[0], preset.lookAt[1], preset.lookAt[2]);
    syncCameraPresetUi();
    updateCameraReadout();
  }

  function setSettingsOpen(open) {
    isSettingsOpen = open;
    if (!settingsPanelEl) return;
    settingsPanelEl.classList.toggle('is-open', open);
  }

  function setDebugMode(enabled) {
    hordeCameraDebugMode = !!enabled;
    if (debugToggleEl && debugToggleEl.checked !== hordeCameraDebugMode) {
      debugToggleEl.checked = hordeCameraDebugMode;
    }
    if (cameraDebugEl) cameraDebugEl.style.display = active && hordeCameraDebugMode ? 'block' : 'none';
    if (!hordeCameraDebugMode) {
      cameraKeysDown.clear();
    } else {
      updateCameraReadout();
    }
  }

  function resetCamera() {
    applyCameraPreset(selectedCameraPreset);
  }

  function fmt(v) {
    return Number(v).toFixed(2);
  }

  function updateCameraReadout() {
    if (!cameraReadoutEl || !hordeCameraDebugMode) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const lookAt = camera.position.clone().addScaledVector(dir, CAMERA_CONTROLS.lookDistance);
    cameraReadoutEl.textContent = `pos: [${fmt(camera.position.x)}, ${fmt(camera.position.y)}, ${fmt(camera.position.z)}]\nlookAt: [${fmt(lookAt.x)}, ${fmt(lookAt.y)}, ${fmt(lookAt.z)}]`;
  }

  function onCameraKeyDown(e) {
    if (!active || !hordeCameraDebugMode) return;
    const key = e.key.toLowerCase();
    if (!['w', 'a', 's', 'd', 'q', 'e', 'z', 'x', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) return;
    cameraKeysDown.add(key);
    e.preventDefault();
  }

  function onCameraKeyUp(e) {
    if (!hordeCameraDebugMode) return;
    const key = e.key.toLowerCase();
    cameraKeysDown.delete(key);
  }

  function applyCameraKeyboard(dt) {
    if (!hordeCameraDebugMode) return;
    if (!cameraKeysDown.size) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.000001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const moveStep = CAMERA_CONTROLS.moveSpeed * dt;
    const upStep = CAMERA_CONTROLS.verticalSpeed * dt;
    const yawStep = CAMERA_CONTROLS.yawSpeed * dt;
    const pitchStep = CAMERA_CONTROLS.pitchSpeed * dt;

    if (cameraKeysDown.has('w')) camera.position.addScaledVector(forward, moveStep);
    if (cameraKeysDown.has('s')) camera.position.addScaledVector(forward, -moveStep);
    if (cameraKeysDown.has('a')) camera.position.addScaledVector(right, -moveStep);
    if (cameraKeysDown.has('d')) camera.position.addScaledVector(right, moveStep);
    if (cameraKeysDown.has('z')) camera.position.y -= upStep;
    if (cameraKeysDown.has('x')) camera.position.y += upStep;
    if (cameraKeysDown.has('q')) camera.rotateY(yawStep);
    if (cameraKeysDown.has('e')) camera.rotateY(-yawStep);
    if (cameraKeysDown.has('arrowleft')) camera.rotateY(yawStep);
    if (cameraKeysDown.has('arrowright')) camera.rotateY(-yawStep);
    if (cameraKeysDown.has('arrowup')) camera.rotateX(-pitchStep);
    if (cameraKeysDown.has('arrowdown')) camera.rotateX(pitchStep);

    updateCameraReadout();
  }

  function setupArena() {
    floorVisual = makeFloorMesh();
    scene.add(floorVisual);

    floorBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, TUNING.groundY - TUNING.floorThickness, 0)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(TUNING.arenaHalfX, TUNING.floorThickness, TUNING.arenaHalfZ).setFriction(1),
      floorBody
    );

    platformBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(TUNING.playerPos.x, TUNING.groundY + TUNING.platformHalfExtents.y, TUNING.playerPos.z)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        TUNING.platformHalfExtents.x,
        TUNING.platformHalfExtents.y,
        TUNING.platformHalfExtents.z
      ).setFriction(1.1),
      platformBody
    );

    playerHurtBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(TUNING.playerPos.x, TUNING.playerHurtY, TUNING.playerPos.z)
    );
    const playerHurtCollider = world.createCollider(
      RAPIER.ColliderDesc.ball(TUNING.playerHurtRadius)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      playerHurtBody
    );
    playerHurtHandle = playerHurtCollider.handle;
  }

  function cleanupArena() {
    if (floorVisual) {
      floorVisual.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            for (const mat of child.material) mat.dispose();
          } else {
            child.material.dispose();
          }
        }
      });
      scene.remove(floorVisual);
      floorVisual = null;
    }

    if (playerHurtBody) {
      world.removeRigidBody(playerHurtBody);
      playerHurtBody = null;
      playerHurtHandle = null;
    }
    if (platformBody) {
      world.removeRigidBody(platformBody);
      platformBody = null;
    }
    if (floorBody) {
      world.removeRigidBody(floorBody);
      floorBody = null;
    }
  }

  function spawnPlayer() {
    player = spawnIdleMfer({
      x: TUNING.playerPos.x,
      y: TUNING.playerPos.y,
      z: TUNING.playerPos.z,
    }, {
      y: Math.atan2(TUNING.playerFacing.x, TUNING.playerFacing.z),
    });
    if (!player) return;
    applyHordeEyeOverride(player.scene);
    player.desiredClipName = resolvePlayerIdleClip();
    if (mixamoLoaded) playPlayerIdleClip(0);
  }

  function cleanupPlayer() {
    if (!player) return;
    if (player.mixer) player.mixer.stopAllAction();
    scene.remove(player.scene);
    player = null;
  }

  function spawnEnemy() {
    if (enemies.length >= TUNING.enemyMax) return;

    const spawnPos = randomSpawnPoint();
    const enemyPm = spawnIdleMfer(spawnPos);
    if (!enemyPm) return;
    applyHordeEyeOverride(enemyPm.scene);

    const moveSet = resolvePlayableMoveSet();
    const baseSpeed = TUNING.enemyBaseSpeed + elapsed * TUNING.enemySpeedRamp + Math.random() * 0.7;
    const speed = baseSpeed * moveSet.speedMultiplier;
    enemyPm.scene.rotation.y = Math.atan2(TUNING.playerPos.x - spawnPos.x, TUNING.playerPos.z - spawnPos.z);
    enemyPm.desiredClipName = moveSet.moveClip;
    if (mixamoLoaded) {
      playMixamoClip(enemyPm, moveSet.moveClip, {
        loop: THREE.LoopRepeat,
        repetitions: Infinity,
        clampWhenFinished: false,
        timeScale: moveSet.moveClipTimeScale,
      });
    }

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawnPos.x, TUNING.playerHurtY, spawnPos.z)
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.ball(TUNING.enemyRadius)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );

    enemies.push({
      scene: enemyPm.scene,
      mixer: enemyPm.mixer,
      desiredClipName: moveSet.moveClip,
      moveSet,
      state: 'moving',
      pauseTimer: 0,
      pauseCooldown: randomRange(moveSet.pauseCheckMin, moveSet.pauseCheckMax),
      pauseClipName: null,
      pauseClipTimeScale: 1,
      body,
      colliderHandle: collider.handle,
      pos: spawnPos,
      baseSpeed,
      speed,
    });
    enemyColliderHandles.add(collider.handle);
  }

  function killEnemy(enemy, index, shotDir) {
    // Keep the current animated bone pose intact when converting to ragdoll.
    // Stopping the mixer before createRagdoll can snap briefly toward bind pose.
    removeEnemy(enemy, index, { stopMixer: false });
    enemy.scene.updateMatrixWorld(true);

    const mfer = createRagdoll(enemy.scene);
    if (mfer) {
      mfer.ragdollActive = true;
      mfer.canDetach = false;

      const push = new THREE.Vector3(shotDir.x, 0.15, shotDir.z).normalize();
      for (const body of Object.values(mfer.ragdollBodies)) {
        body.setLinvel({
          x: push.x * 11 + (Math.random() - 0.5) * 1.4,
          y: 3 + Math.random() * 2,
          z: push.z * 11 + (Math.random() - 0.5) * 1.4,
        }, true);
        body.setAngvel({
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 6,
          z: (Math.random() - 0.5) * 8,
        }, true);
      }

      detachAccessories(mfer);
      ragdolls.push({ mfer, ttl: TUNING.ragdollLifetime });
    } else {
      scene.remove(enemy.scene);
    }

    kills += 1;
    playImpact(10);
    playPop();
  }

  function shootAt(clientX, clientY) {
    if (!active || isGameOver) return;
    if (!player) return;

    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hitPoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;

    const muzzle = TUNING.playerPos.clone().add(TUNING.muzzleOffset);
    const direction = hitPoint.sub(muzzle);
    direction.y = 0;
    if (direction.lengthSq() < 0.0001) return;
    direction.normalize();

    if (projectiles.length >= TUNING.bulletMax) removeProjectile(0);

    const bulletMesh = makeBulletMesh();
    bulletMesh.position.copy(muzzle);
    scene.add(bulletMesh);

    projectiles.push({
      mesh: bulletMesh,
      pos: muzzle,
      dir: direction,
      ttl: TUNING.bulletLifetime,
    });

    if (player.scene) {
      player.scene.rotation.y = Math.atan2(direction.x, direction.z);
    }

    playGunshot();
  }

  function updateProjectiles(delta) {
    const hitRadiusSq = (TUNING.enemyRadius + TUNING.bulletRadius) * (TUNING.enemyRadius + TUNING.bulletRadius);

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const bullet = projectiles[i];
      bullet.ttl -= delta;
      bullet.pos.addScaledVector(bullet.dir, TUNING.bulletSpeed * delta);
      bullet.mesh.position.copy(bullet.pos);

      const oob =
        bullet.pos.x < -TUNING.arenaHalfX - 3 || bullet.pos.x > TUNING.arenaHalfX + 3 ||
        bullet.pos.z < -TUNING.arenaHalfZ - 3 || bullet.pos.z > TUNING.arenaHalfZ + 3;

      if (bullet.ttl <= 0 || oob) {
        removeProjectile(i);
        continue;
      }

      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const dx = enemy.pos.x - bullet.pos.x;
        const dz = enemy.pos.z - bullet.pos.z;
        if ((dx * dx + dz * dz) > hitRadiusSq) continue;

        killEnemy(enemy, j, bullet.dir);
        hit = true;
        break;
      }

      if (hit) removeProjectile(i);
    }
  }

  function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.mixer) enemy.mixer.update(delta * ENEMY_MIXER_TIME_SCALE);

      const dx = TUNING.playerPos.x - enemy.pos.x;
      const dz = TUNING.playerPos.z - enemy.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.0001) continue;

      enemy.scene.rotation.y = Math.atan2(dx, dz);

      if (enemy.state === 'pausing') {
        enemy.pauseTimer -= delta;
        enemy.body.setNextKinematicTranslation({ x: enemy.pos.x, y: TUNING.playerHurtY, z: enemy.pos.z });

        if (enemy.pauseTimer <= 0) {
          enemy.state = 'moving';
          enemy.pauseClipName = null;
          enemy.pauseCooldown = randomRange(enemy.moveSet.pauseCheckMin, enemy.moveSet.pauseCheckMax);
          if (mixamoLoaded) playEnemyMoveClip(enemy);
        }
      } else {
        enemy.pauseCooldown -= delta;
        if (
          enemy.pauseCooldown <= 0 &&
          dist > ENEMY_PAUSE_MIN_DISTANCE &&
          Math.random() < enemy.moveSet.pauseChance
        ) {
          const pauseClipName = pickPauseClipForMoveSet(enemy.moveSet);
          if (!pauseClipName) {
            enemy.pauseCooldown = randomRange(enemy.moveSet.pauseCheckMin, enemy.moveSet.pauseCheckMax);
          } else {
            enemy.state = 'pausing';
            enemy.pauseTimer = randomRange(enemy.moveSet.pauseDurationMin, enemy.moveSet.pauseDurationMax);
            enemy.pauseClipName = pauseClipName;
            enemy.pauseClipTimeScale = randomRange(0.92, 1.08);
            enemy.pauseCooldown = randomRange(enemy.moveSet.pauseCheckMin, enemy.moveSet.pauseCheckMax);
            if (mixamoLoaded) playEnemyPauseClip(enemy);
            enemy.body.setNextKinematicTranslation({ x: enemy.pos.x, y: TUNING.playerHurtY, z: enemy.pos.z });
            continue;
          }
        }

        const step = Math.min(dist, enemy.speed * delta);
        const nx = enemy.pos.x + (dx / dist) * step;
        const nz = enemy.pos.z + (dz / dist) * step;
        const moveX = nx - enemy.pos.x;
        const moveZ = nz - enemy.pos.z;

        enemy.pos.x = nx;
        enemy.pos.z = nz;
        enemy.scene.position.x += moveX;
        enemy.scene.position.z += moveZ;
        enemy.body.setNextKinematicTranslation({ x: nx, y: TUNING.playerHurtY, z: nz });
      }

      const playerDx = TUNING.playerPos.x - enemy.pos.x;
      const playerDz = TUNING.playerPos.z - enemy.pos.z;
      if (Math.hypot(playerDx, playerDz) <= TUNING.playerTouchDistance) {
        isGameOver = true;
      }
    }
  }

  function updateSpawning(delta) {
    if (isGameOver) return;

    const interval = clamp(
      TUNING.enemySpawnStart - elapsed * TUNING.enemySpawnAccel,
      TUNING.enemySpawnMin,
      TUNING.enemySpawnStart
    );

    spawnTimer -= delta;
    while (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer += interval;

      // Small pressure bump as time survives increases.
      if (elapsed > 28 && Math.random() < 0.24 && enemies.length < TUNING.enemyMax) {
        spawnEnemy();
      }
    }
  }

  function drainCollisions() {
    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started || isGameOver || !playerHurtHandle) return;
      if (h1 === playerHurtHandle && enemyColliderHandles.has(h2)) isGameOver = true;
      if (h2 === playerHurtHandle && enemyColliderHandles.has(h1)) isGameOver = true;
    });

    // Keep queue clear from ragdoll force events in this mode.
    eventQueue.drainContactForceEvents(() => {});
  }

  function handleGameOver() {
    cleanupEnemies(true);
    cleanupProjectiles();
    setGameOverUi(true);
  }

  function resetRun() {
    cleanupEnemies(true);
    cleanupProjectiles();
    cleanupRagdolls();

    isGameOver = false;
    kills = 0;
    elapsed = 0;
    spawnTimer = 0.85;
    physicsAccum = 0;

    setGameOverUi(false);
    setHud();
  }

  function onPointerDown(e) {
    if (!active) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    shootAt(e.clientX, e.clientY);
  }

  function onRetry(e) {
    e.stopPropagation();
    resetRun();
  }

  function onContextMenu(e) {
    if (!active) return;
    e.preventDefault();
  }

  function onCameraPresetClick(e) {
    if (!active || !hordeCameraDebugMode) return;
    e.preventDefault();
    e.stopPropagation();
    applyCameraPreset(e.currentTarget.dataset.hordeCam);
  }

  function onSettingsButtonClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    setSettingsOpen(!isSettingsOpen);
  }

  function onDebugToggleChange(e) {
    if (!active) return;
    setDebugMode(e.currentTarget.checked);
  }

  function onWindowPointerDown(e) {
    if (!active || !isSettingsOpen) return;
    if (settingsPanelEl?.contains(e.target) || settingsBtnEl?.contains(e.target)) return;
    setSettingsOpen(false);
  }

  function enter() {
    if (active) return;
    active = true;

    if (hordeHudEl) hordeHudEl.style.display = '';
    if (settingsBtnEl) settingsBtnEl.style.display = '';
    if (settingsPanelEl) settingsPanelEl.style.display = '';
    setSettingsOpen(false);
    setDebugMode(hordeCameraDebugMode);
    resetCamera();
    setupArena();
    spawnPlayer();
    resetRun();
    loadMixamoClips()
      .then(() => applyLoadedAnimationsToActiveActors())
      .catch((err) => console.warn('[horde] animation preload failed', err));

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onCameraKeyDown);
    window.addEventListener('keyup', onCameraKeyUp);
    window.addEventListener('pointerdown', onWindowPointerDown);
    if (settingsBtnEl) settingsBtnEl.addEventListener('click', onSettingsButtonClick);
    if (debugToggleEl) {
      debugToggleEl.checked = hordeCameraDebugMode;
      debugToggleEl.addEventListener('change', onDebugToggleChange);
    }
    for (const btn of cameraPresetButtons) btn.addEventListener('click', onCameraPresetClick);
    if (retryBtn) retryBtn.addEventListener('click', onRetry);
    if (hordeCameraDebugMode) updateCameraReadout();
  }

  function exit() {
    if (!active) return;
    active = false;

    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onCameraKeyDown);
    window.removeEventListener('keyup', onCameraKeyUp);
    window.removeEventListener('pointerdown', onWindowPointerDown);
    if (settingsBtnEl) settingsBtnEl.removeEventListener('click', onSettingsButtonClick);
    if (debugToggleEl) debugToggleEl.removeEventListener('change', onDebugToggleChange);
    for (const btn of cameraPresetButtons) btn.removeEventListener('click', onCameraPresetClick);
    if (retryBtn) retryBtn.removeEventListener('click', onRetry);
    cameraKeysDown.clear();

    cleanupProjectiles();
    cleanupEnemies(true);
    cleanupRagdolls();
    cleanupPlayer();
    cleanupArena();

    if (hordeHudEl) hordeHudEl.style.display = 'none';
    if (settingsBtnEl) settingsBtnEl.style.display = 'none';
    if (settingsPanelEl) settingsPanelEl.style.display = 'none';
    setSettingsOpen(false);
    if (cameraDebugEl) cameraDebugEl.style.display = 'none';
    setGameOverUi(false);
  }

  function update(rawDelta) {
    if (!active) return;

    const dt = Math.min(rawDelta, 0.05);
    elapsed += isGameOver ? 0 : dt;
    applyCameraKeyboard(dt);

    updateSpawning(dt);
    updateEnemies(dt);
    updateProjectiles(dt);

    const physicsDt = 1 / 60;
    physicsAccum += dt;
    let steps = 0;
    world.timestep = physicsDt;
    while (physicsAccum >= physicsDt && steps < 4) {
      world.step(eventQueue);
      physicsAccum -= physicsDt;
      steps += 1;
    }
    if (physicsAccum > physicsDt * 2) physicsAccum = 0;

    updateRagdolls(dt);
    drainCollisions();

    if (player?.mixer) player.mixer.update(dt * 0.8);

    if (isGameOver) {
      handleGameOver();
    }

    setHud();
  }

  return {
    enter,
    exit,
    update,
    isActive: () => active,
  };
}
