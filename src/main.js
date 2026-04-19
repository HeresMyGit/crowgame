import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

const MODEL_URL = 'https://sfo3.digitaloceanspaces.com/cybermfers/cybermfers/builders/mfermashup.glb';

const QUEST_GIVER_VISIBLE_MESHES = new Set([
  'type_plain',
  'body',
  'heres_my_signature',
  'eyes_normal',
  'mouth_flat',
  'headphones_black',
]);

const PLAY_BOUNDARY = 78;
const MIN_ALTITUDE = 1.6;
const MAX_ALTITUDE = 56;
const BASE_FLY_SPEED = 12;
const BOOST_MULTIPLIER = 2;
const WORM_TARGET = 14;
const WORM_CAP = 18;
const WORM_COLLECTION_RADIUS = 2.6;
const TRASH_TARGET = 18;
const TRASH_CAP = 26;
const TRASH_COLLECTION_RADIUS = 2.45;
const QUEST_INTERACT_RADIUS = 7;
const SLINGSHOT_FIRE_COOLDOWN = 0.24;
const PEBBLE_SPEED = 42;
const PEBBLE_LIFETIME = 2.2;
const PEBBLE_GRAVITY = 28;
const PEBBLE_HIT_RADIUS = 1.05;
const PIGEON_HIT_RADIUS = 1.2;
const RIVAL_PIGEON_COUNT = 9;
const RIVAL_PIGEON_RESPAWN = 8;
const MAFIA_WORM_CHANCE = 0.28;
const MAFIA_STUN_BASE = 7.2;
const AIM_DEFAULT_FOV = 62;
const AIM_ZOOM_FOV = 44;
const MENU_CAMERA_RADIUS = 34;
const MENU_CAMERA_HEIGHT = 16.5;
const MENU_CAMERA_ORBIT_SPEED = 0.13;
const SKY_RADIUS = 560;
const ATMOSPHERE_PARTICLE_COUNT = 280;
const MOBILE_STICK_MAX_PIXELS = 46;
const MOBILE_LOOK_SENSITIVITY = 0.005;

const NEST_TOP = new THREE.Vector3(24, 40.6, -22);
const questGiverPosition = new THREE.Vector3(-3.5, 0, 6.5);

const QUEST_BLUEPRINTS = [
  {
    id: 'worms',
    title: 'Worm Hunt',
    goal: 3,
  },
  {
    id: 'cleanup',
    title: 'Cleanup Crew',
    goal: 6,
  },
  {
    id: 'parts',
    title: 'Scavenge Parts',
    goal: 2,
  },
  {
    id: 'slingshot',
    title: 'Craft Apprentice',
    goal: 1,
  },
];

const SIDE_PATROLS = {
  north: {
    speaker: 'British Crow Patrol',
    lines: [
      'Oi mate, this borough is closed to visitors. Back you go.',
      'Sorry, governor. Not this way today.',
      'Steady on, crow. You cannot pass this border.',
    ],
  },
  south: {
    speaker: 'French Crow Patrol',
    lines: [
      'Bonjour little crow, this quarter is off limits. Turn around please.',
      'Non, non. You cannot fly into this town today.',
      'Easy now. This side is closed, oui?',
    ],
  },
  east: {
    speaker: 'Aussie Crow Patrol',
    lines: [
      'Oi little mate, this patch is off limits. Swing back inside.',
      'Nah, not this side today. Back to your zone, legend.',
      'Hold up there, cobber. You cannot enter this town yet.',
    ],
  },
  west: {
    speaker: 'New York Crow Patrol',
    lines: [
      'Hey kid, this neighborhood is closed. Back in bounds.',
      'Nope, not happening. Turn that beak around.',
      'You are not flying through this side today, capisce?',
    ],
  },
};

const INVENTORY_ITEM_DEFS = {
  stick: { label: 'Stick', short: 'ST' },
  rubber_band: { label: 'Rubber Band', short: 'RB' },
  bottle_cap: { label: 'Bottle Cap', short: 'BC' },
  wire: { label: 'Wire', short: 'WR' },
  cloth_scrap: { label: 'Cloth Scrap', short: 'CS' },
  feather: { label: 'Feather', short: 'FE' },
  spring: { label: 'Spring', short: 'SP' },
  pebble: { label: 'Pebble', short: 'PB' },
};

const CRAFTED_ITEM_DEFS = {
  slingshot: { label: 'Slingshot', short: 'SS' },
  ammo_pouch: { label: 'Ammo Pouch', short: 'AP' },
  wing_charm: { label: 'Wing Charm', short: 'WC' },
  crow_goggles: { label: 'Crow Goggles', short: 'CG' },
  worm_bait: { label: 'Worm Bait', short: 'WB' },
  pigeon_totem: { label: 'Pigeon Totem', short: 'PT' },
};

const TRASH_TYPE_TABLE = [
  { id: 'stick', weight: 0.2 },
  { id: 'rubber_band', weight: 0.16 },
  { id: 'bottle_cap', weight: 0.18 },
  { id: 'wire', weight: 0.12 },
  { id: 'cloth_scrap', weight: 0.12 },
  { id: 'feather', weight: 0.1 },
  { id: 'spring', weight: 0.07 },
  { id: 'pebble', weight: 0.05 },
];

const CRAFTING_RECIPES = {
  slingshot: {
    id: 'slingshot',
    label: 'Slingshot',
    short: 'SS',
    max: 1,
    description: 'Lets you fire bottle caps with F.',
    inputs: { stick: 1, rubber_band: 1 },
  },
  ammo_pouch: {
    id: 'ammo_pouch',
    label: 'Ammo Pouch',
    short: 'AP',
    max: 1,
    description: 'Bottle cap pickups give +1 extra ammo.',
    inputs: { cloth_scrap: 2, wire: 1 },
  },
  wing_charm: {
    id: 'wing_charm',
    label: 'Wing Charm',
    short: 'WC',
    max: 1,
    description: 'Adds a passive flight-speed boost.',
    inputs: { feather: 2, rubber_band: 1, bottle_cap: 1 },
  },
  crow_goggles: {
    id: 'crow_goggles',
    label: 'Crow Goggles',
    short: 'CG',
    max: 1,
    description: 'Tighter shot spread while aiming.',
    inputs: { wire: 1, bottle_cap: 2, pebble: 1 },
  },
  worm_bait: {
    id: 'worm_bait',
    label: 'Worm Bait',
    short: 'WB',
    max: 1,
    description: 'Mafia worms stay stunned longer after a hit.',
    inputs: { cloth_scrap: 1, spring: 1, pebble: 2 },
  },
  pigeon_totem: {
    id: 'pigeon_totem',
    label: 'Pigeon Totem',
    short: 'PT',
    max: 1,
    description: 'Rival pigeons drop extra loot when shot.',
    inputs: { stick: 1, feather: 1, wire: 1, spring: 1 },
  },
};

const questStatusEl = document.getElementById('quest-status');
const wormStatusEl = document.getElementById('worm-status');
const speedStatusEl = document.getElementById('speed-status');
const questLogEl = document.getElementById('quest-log');
const inventoryStatusEl = document.getElementById('inventory-status');
const craftStatusEl = document.getElementById('craft-status');
const promptEl = document.getElementById('prompt');
const dialogueEl = document.getElementById('dialogue');
const dialogueSpeakerEl = document.getElementById('dialogue-speaker');
const dialogueTextEl = document.getElementById('dialogue-text');
const hudEl = document.getElementById('hud');
const controlsEl = document.getElementById('controls');
const shootBtnEl = document.getElementById('shoot-btn');
const reticleEl = document.getElementById('reticle');
const mainMenuEl = document.getElementById('main-menu');
const startGameBtnEl = document.getElementById('start-game-btn');
const menuAudioBtnEl = document.getElementById('menu-audio-btn');
const menuHintEl = document.getElementById('menu-hint');
const menuThemeEl = document.getElementById('menu-theme');
const gameplayThemeEl = document.getElementById('gameplay-theme');
const inventoryScreenEl = document.getElementById('inventory-screen');
const craftingScreenEl = document.getElementById('crafting-screen');
const inventoryGridEl = document.getElementById('inventory-grid');
const hotbarGridEl = document.getElementById('hotbar-grid');
const inventoryCloseEl = document.getElementById('inventory-close');
const craftingCloseEl = document.getElementById('crafting-close');
const craftingRecipesEl = document.getElementById('crafting-recipes');
const craftingNoteEl = document.getElementById('crafting-note');
const mobileControlsEl = document.getElementById('mobile-controls');
const mobileStickZoneEl = document.getElementById('mobile-stick-zone');
const mobileStickKnobEl = document.getElementById('mobile-stick-knob');
const mobileRiseBtnEl = document.getElementById('mobile-rise-btn');
const mobileFallBtnEl = document.getElementById('mobile-fall-btn');
const mobileInteractBtnEl = document.getElementById('mobile-interact-btn');
const mobileShootBtnEl = document.getElementById('mobile-shoot-btn');
const mobileAimBtnEl = document.getElementById('mobile-aim-btn');
const mobileInventoryBtnEl = document.getElementById('mobile-inventory-btn');
const mobileCraftingBtnEl = document.getElementById('mobile-crafting-btn');

const TOUCH_DEVICE = window.matchMedia('(pointer: coarse)').matches
  || navigator.maxTouchPoints > 0
  || 'ontouchstart' in window;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
if ('physicallyCorrectLights' in renderer) {
  renderer.physicallyCorrectLights = false;
}
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8d3ee);
scene.fog = new THREE.FogExp2(0xc8ddf0, 0.00165);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
const clock = new THREE.Clock();
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.62, 0.8);
const vignettePass = new ShaderPass(VignetteShader);
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(vignettePass);
vignettePass.uniforms.offset.value = 0.96;
vignettePass.uniforms.darkness.value = 0.74;

const visualAssets = createVisualAssets();
const atmosphereState = {
  skyDome: null,
  cloudSprites: [],
  hazeBands: [],
  dustPoints: null,
  dustBasePositions: null,
};

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  moveX: 0,
  moveZ: 0,
  up: false,
  down: false,
  aiming: false,
  interactQueued: false,
  shootQueued: false,
};

const state = {
  cameraYaw: Math.PI,
  cameraPitch: -0.08,
  speedMultiplier: 1,
  wormsEaten: 0,
  totalTrashCollected: 0,
  dialogueHideAt: 0,
  boundaryWarnCooldownUntil: 0,
  guardVisibleUntil: 0,
  wormSpawnTick: 0,
  trashSpawnTick: 0,
  lastShotAt: -100,
  lastNoAmmoNoticeAt: -100,
  lastNoSlingNoticeAt: -100,
  lastMafiaBlockNoticeAt: -100,
  lastPigeonHitNoticeAt: -100,
  introHintPlayed: false,
  audioEnabled: false,
  activeTheme: 'none',
  ui: {
    mainMenuOpen: true,
    inventoryOpen: false,
    craftingOpen: false,
    touchMode: TOUCH_DEVICE,
  },
  inventory: {
    ...Object.fromEntries(Object.keys(INVENTORY_ITEM_DEFS).map((itemId) => [itemId, 0])),
  },
  crafted: {
    ...Object.fromEntries(Object.keys(CRAFTED_ITEM_DEFS).map((itemId) => [itemId, 0])),
  },
  craftingUnlocked: false,
  quests: QUEST_BLUEPRINTS.map((quest) => ({
    ...quest,
    started: false,
    completed: false,
    progress: 0,
  })),
};

const playerVelocity = new THREE.Vector3();
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpDesired = new THREE.Vector3();
const tmpFocus = new THREE.Vector3();
const tmpCameraPos = new THREE.Vector3();
const tmpAimDir = new THREE.Vector3();
const tmpSpawnPos = new THREE.Vector3();
const projectileVelocityTemp = new THREE.Vector3();
const menuCameraCenter = new THREE.Vector3(0, 12.5, 0);

const mobileControlState = {
  enabled: TOUCH_DEVICE
    && Boolean(mobileControlsEl && mobileStickZoneEl && mobileStickKnobEl),
  stickPointerId: null,
  lookPointerId: null,
  lastLookX: 0,
  lastLookY: 0,
};

const playerCrow = createCrowModel({ scale: 1.08, bodyColor: 0x11151b, wingColor: 0x090d12, beakColor: 0xdeab53 });
scene.add(playerCrow);

const guardCrows = [];
for (let i = 0; i < 3; i += 1) {
  const guard = createCrowModel({ scale: 0.82, bodyColor: 0x191e25, wingColor: 0x10141b, beakColor: 0xd09a4a });
  guard.visible = false;
  scene.add(guard);
  guardCrows.push(guard);
}

const menuFx = createMenuFx();
scene.add(menuFx.group);

const worms = [];
const trashItems = [];
const rivalPigeons = [];
const projectiles = [];
const pebbleGeometry = new THREE.SphereGeometry(0.13, 12, 10);
const pebbleMaterial = new THREE.MeshStandardMaterial({ color: 0x47382e, roughness: 0.78, metalness: 0.12 });
let audioContext = null;
let questGiver = null;
let questGiverMixer = null;
let questBeacon = null;

initWorld();
setupInput();
setupUi();
loadQuestGiver();
spawnInitialWorms();
spawnInitialTrash();
spawnInitialRivalPigeons();
updateHud();
setMainMenuVisible(true);
updateMenuHint('Press Enable Audio for music, then Start Game.');

renderer.setAnimationLoop(tick);

function initWorld() {
  addSkyAtmosphere();
  addLights();
  addGround();
  addRoads();
  addBoundaryLines();
  addBuildingsAndNest();
  addTrees();
  addQuestPlaza();
  addAtmosphereDetails();
}

function addSkyAtmosphere() {
  const skyGeometry = new THREE.SphereGeometry(SKY_RADIUS, 64, 40);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x9cc9f4) },
      midColor: { value: new THREE.Color(0xc5def6) },
      bottomColor: { value: new THREE.Color(0xeaf4ff) },
      sunColor: { value: new THREE.Color(0xffefcf) },
      sunDirection: { value: new THREE.Vector3(0.22, 0.91, 0.35).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(bottomColor, midColor, smoothstep(0.0, 0.58, h));
        base = mix(base, topColor, smoothstep(0.44, 1.0, h));
        float sun = pow(max(dot(dir, sunDirection), 0.0), 156.0);
        float halo = pow(max(dot(dir, sunDirection), 0.0), 18.0) * 0.42;
        vec3 color = base + sunColor * (sun * 1.05 + halo);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  atmosphereState.skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(atmosphereState.skyDome);
}

function addAtmosphereDetails() {
  const cloudTexture = visualAssets.cloudSprite;
  for (let i = 0; i < 22; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTexture,
        color: i % 3 === 0 ? 0xf0f6ff : 0xe4eef8,
        transparent: true,
        opacity: randRange(0.16, 0.34),
        depthWrite: false,
      }),
    );

    const radius = randRange(42, 126);
    const angle = randRange(0, Math.PI * 2);
    sprite.position.set(Math.cos(angle) * radius, randRange(22, 54), Math.sin(angle) * radius);
    const size = randRange(16, 44);
    sprite.scale.set(size * 1.9, size, 1);
    sprite.userData.phase = randRange(0, Math.PI * 2);
    sprite.userData.drift = randRange(0.18, 0.52);
    sprite.userData.anchor = sprite.position.clone();
    atmosphereState.cloudSprites.push(sprite);
    scene.add(sprite);
  }

  for (let i = 0; i < 6; i += 1) {
    const haze = new THREE.Mesh(
      new THREE.TorusGeometry(92 + i * 16, 4.6 + i * 0.4, 12, 96),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xd9e9f6 : 0xe8f1f8,
        transparent: true,
        opacity: 0.024 - i * 0.002,
        depthWrite: false,
      }),
    );
    haze.rotation.x = Math.PI / 2;
    haze.position.y = 4 + i * 1.3;
    atmosphereState.hazeBands.push(haze);
    scene.add(haze);
  }

  const dustPositions = new Float32Array(ATMOSPHERE_PARTICLE_COUNT * 3);
  const dustBase = new Float32Array(ATMOSPHERE_PARTICLE_COUNT * 3);
  for (let i = 0; i < ATMOSPHERE_PARTICLE_COUNT; i += 1) {
    const idx = i * 3;
    const x = randRange(-128, 128);
    const y = randRange(5, 52);
    const z = randRange(-128, 128);
    dustPositions[idx] = x;
    dustPositions[idx + 1] = y;
    dustPositions[idx + 2] = z;
    dustBase[idx] = x;
    dustBase[idx + 1] = y;
    dustBase[idx + 2] = z;
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xeaf2fb,
    size: 0.35,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  atmosphereState.dustPoints = new THREE.Points(dustGeometry, dustMaterial);
  atmosphereState.dustBasePositions = dustBase;
  scene.add(atmosphereState.dustPoints);
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xe3f2ff, 0x5a6f5e, 1.28);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4d8, 2.42);
  sun.position.set(52, 92, 38);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -128;
  sun.shadow.camera.right = 128;
  sun.shadow.camera.top = 128;
  sun.shadow.camera.bottom = -128;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 280;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.006;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight(0xa6c7ec, 0.72);
  coolFill.position.set(-38, 46, -66);
  scene.add(coolFill);

  const warmRim = new THREE.DirectionalLight(0xffd2a2, 0.38);
  warmRim.position.set(-74, 30, 58);
  scene.add(warmRim);

  const ambient = new THREE.AmbientLight(0xf2f8ff, 0.36);
  scene.add(ambient);

  const nestGlow = new THREE.PointLight(0xffcf95, 0.42, 58, 2);
  nestGlow.position.copy(NEST_TOP).add(new THREE.Vector3(0, 7, 0));
  scene.add(nestGlow);

  const plazaGlow = new THREE.PointLight(0x8fc5ff, 0.3, 44, 2);
  plazaGlow.position.copy(questGiverPosition).add(new THREE.Vector3(0, 6.2, 0));
  scene.add(plazaGlow);
}

function addGround() {
  const grassMat = new THREE.MeshPhysicalMaterial({
    map: visualAssets.grassColor,
    roughnessMap: visualAssets.grassRoughness,
    roughness: 0.98,
    metalness: 0.02,
    clearcoat: 0.08,
    clearcoatRoughness: 0.9,
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    grassMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const cityMat = new THREE.MeshPhysicalMaterial({
    map: visualAssets.cityTint,
    roughnessMap: visualAssets.cityRoughness,
    roughness: 0.88,
    metalness: 0.04,
    clearcoat: 0.12,
    clearcoatRoughness: 0.8,
  });

  const cityTint = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 190),
    cityMat,
  );
  cityTint.rotation.x = -Math.PI / 2;
  cityTint.position.y = 0.02;
  cityTint.receiveShadow = true;
  scene.add(cityTint);

  for (let i = 0; i < 24; i += 1) {
    const tuft = new THREE.Mesh(
      new THREE.CircleGeometry(randRange(0.7, 1.8), 12),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x6f985f : 0x5d874f,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    tuft.rotation.x = -Math.PI / 2;
    tuft.position.set(randRange(-94, 94), 0.04, randRange(-94, 94));
    scene.add(tuft);
  }
}

function addRoads() {
  const roadMat = new THREE.MeshPhysicalMaterial({
    map: visualAssets.roadColor,
    roughnessMap: visualAssets.roadRoughness,
    roughness: 0.72,
    metalness: 0.14,
    clearcoat: 0.38,
    clearcoatRoughness: 0.56,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    map: visualAssets.roadStripe,
    color: 0xe6ddb9,
    roughness: 0.58,
    metalness: 0.1,
  });

  const northSouthRoad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 180), roadMat);
  northSouthRoad.position.set(0, 0.05, 0);
  northSouthRoad.receiveShadow = true;
  scene.add(northSouthRoad);

  const eastWestRoad = new THREE.Mesh(new THREE.BoxGeometry(180, 0.1, 16), roadMat);
  eastWestRoad.position.set(0, 0.05, 0);
  eastWestRoad.receiveShadow = true;
  scene.add(eastWestRoad);

  for (let i = -6; i <= 6; i += 1) {
    const stripeNS = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 6), stripeMat);
    stripeNS.position.set(-0.1, 0.11, i * 14);
    stripeNS.receiveShadow = true;
    scene.add(stripeNS);

    const stripeEW = new THREE.Mesh(new THREE.BoxGeometry(6, 0.03, 1.4), stripeMat);
    stripeEW.position.set(i * 14, 0.11, -0.1);
    stripeEW.receiveShadow = true;
    scene.add(stripeEW);
  }

  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x5c6671, roughness: 0.58, metalness: 0.62 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffd9a1,
    emissive: 0xffa54b,
    emissiveIntensity: 0.7,
    roughness: 0.34,
    metalness: 0.12,
  });

  for (let i = -3; i <= 3; i += 1) {
    const x = i * 24;
    for (const z of [-22, 22]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.2, 10), lampPostMat);
      pole.position.set(x, 2.6, z);
      pole.castShadow = true;
      scene.add(pole);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), lampBulbMat);
      bulb.position.set(x, 5.05, z);
      scene.add(bulb);

      const light = new THREE.PointLight(0xffca87, 0.34, 20, 2);
      light.position.set(x, 4.9, z);
      scene.add(light);
    }
  }
}

function addBoundaryLines() {
  const points = [
    new THREE.Vector3(-PLAY_BOUNDARY, 0.15, -PLAY_BOUNDARY),
    new THREE.Vector3(PLAY_BOUNDARY, 0.15, -PLAY_BOUNDARY),
    new THREE.Vector3(PLAY_BOUNDARY, 0.15, PLAY_BOUNDARY),
    new THREE.Vector3(-PLAY_BOUNDARY, 0.15, PLAY_BOUNDARY),
  ];

  const boundary = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xe1b86a, transparent: true, opacity: 0.42 }),
  );
  scene.add(boundary);

  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9f7c4b, roughness: 0.9, metalness: 0.05 });
  const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.8, 8);

  for (let i = -7; i <= 7; i += 1) {
    const t = (i / 7) * PLAY_BOUNDARY;

    const postA = new THREE.Mesh(postGeo, fenceMat);
    postA.position.set(t, 1.4, -PLAY_BOUNDARY);
    postA.castShadow = true;
    scene.add(postA);

    const postB = new THREE.Mesh(postGeo, fenceMat);
    postB.position.set(t, 1.4, PLAY_BOUNDARY);
    postB.castShadow = true;
    scene.add(postB);

    const postC = new THREE.Mesh(postGeo, fenceMat);
    postC.position.set(-PLAY_BOUNDARY, 1.4, t);
    postC.castShadow = true;
    scene.add(postC);

    const postD = new THREE.Mesh(postGeo, fenceMat);
    postD.position.set(PLAY_BOUNDARY, 1.4, t);
    postD.castShadow = true;
    scene.add(postD);
  }
}

function addBuildingsAndNest() {
  const roofMat = new THREE.MeshPhysicalMaterial({
    map: visualAssets.roofColor,
    roughnessMap: visualAssets.roofRoughness,
    roughness: 0.86,
    metalness: 0.2,
  });

  for (let x = -63; x <= 63; x += 18) {
    for (let z = -63; z <= 63; z += 18) {
      if (Math.abs(x) < 16 && Math.abs(z) < 16) {
        continue;
      }

      if (Math.abs(x - NEST_TOP.x) < 12 && Math.abs(z - NEST_TOP.z) < 12) {
        continue;
      }

      if (Math.random() < 0.34) {
        continue;
      }

      const width = randRange(7.5, 12.5);
      const depth = randRange(7.5, 12.5);
      const height = randRange(9, 29);
      const facadeSet = visualAssets.facades[Math.floor(Math.random() * visualAssets.facades.length)];
      const mat = new THREE.MeshPhysicalMaterial({
        map: facadeSet.albedo,
        roughnessMap: facadeSet.roughness,
        metalness: 0.12,
        roughness: 0.74,
        clearcoat: 0.08,
        clearcoatRoughness: 0.72,
        emissive: new THREE.Color(0xffd9a3),
        emissiveMap: facadeSet.emissive,
        emissiveIntensity: randRange(0.1, 0.24),
      });

      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
      building.position.set(x + randRange(-2, 2), height / 2, z + randRange(-2, 2));
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      const roofUnit = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.38, randRange(1, 2.4), depth * 0.32),
        roofMat,
      );
      roofUnit.position.set(building.position.x + randRange(-1.2, 1.2), height + roofUnit.geometry.parameters.height / 2, building.position.z);
      roofUnit.castShadow = true;
      roofUnit.receiveShadow = true;
      scene.add(roofUnit);

      if (Math.random() < 0.27) {
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.08, randRange(2.3, 4.8), 7),
          new THREE.MeshStandardMaterial({ color: 0x858d99, roughness: 0.62, metalness: 0.44 }),
        );
        antenna.position.set(
          building.position.x + randRange(-width * 0.28, width * 0.28),
          height + antenna.geometry.parameters.height / 2,
          building.position.z + randRange(-depth * 0.28, depth * 0.28),
        );
        antenna.castShadow = true;
        scene.add(antenna);
      }

      if (Math.random() < 0.18) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(randRange(1.8, 3.8), randRange(0.6, 1.3)),
          new THREE.MeshBasicMaterial({
            color: Math.random() < 0.5 ? 0x8ed0ff : 0xffb47a,
            transparent: true,
            opacity: 0.42,
            side: THREE.DoubleSide,
          }),
        );
        sign.position.set(
          building.position.x + (Math.random() < 0.5 ? width * 0.51 : -width * 0.51),
          randRange(height * 0.35, height * 0.8),
          building.position.z + randRange(-depth * 0.22, depth * 0.22),
        );
        sign.rotation.y = sign.position.x > building.position.x ? -Math.PI / 2 : Math.PI / 2;
        scene.add(sign);
      }
    }
  }

  const nestBuildingHeight = 38;
  const nestBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(16, nestBuildingHeight, 16),
    new THREE.MeshPhysicalMaterial({
      map: visualAssets.nestTower.albedo,
      roughnessMap: visualAssets.nestTower.roughness,
      emissive: new THREE.Color(0xffc07f),
      emissiveMap: visualAssets.nestTower.emissive,
      emissiveIntensity: 0.24,
      roughness: 0.72,
      metalness: 0.14,
      clearcoat: 0.12,
      clearcoatRoughness: 0.62,
    }),
  );
  nestBuilding.position.set(NEST_TOP.x, nestBuildingHeight / 2, NEST_TOP.z);
  nestBuilding.castShadow = true;
  nestBuilding.receiveShadow = true;
  scene.add(nestBuilding);

  const roofLip = new THREE.Mesh(
    new THREE.BoxGeometry(18.2, 1.2, 18.2),
    new THREE.MeshStandardMaterial({ color: 0x5a6270, roughness: 0.74, metalness: 0.22 }),
  );
  roofLip.position.set(NEST_TOP.x, nestBuildingHeight + 0.6, NEST_TOP.z);
  roofLip.castShadow = true;
  roofLip.receiveShadow = true;
  scene.add(roofLip);

  addNest(NEST_TOP.clone().add(new THREE.Vector3(0, -0.8, 0)));

  playerCrow.position.copy(NEST_TOP);
  playerCrow.rotation.y = Math.PI;
}

function addNest(position) {
  const nest = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.45, 9, 28),
    new THREE.MeshStandardMaterial({ color: 0x7a552f, roughness: 0.9, metalness: 0.05 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  nest.add(ring);

  const twigMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.96, metalness: 0.02 });
  for (let i = 0; i < 16; i += 1) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, randRange(1.6, 2.5), 6), twigMat);
    const angle = (i / 16) * Math.PI * 2;
    twig.position.set(Math.cos(angle) * randRange(1.4, 2), randRange(-0.2, 0.3), Math.sin(angle) * randRange(1.4, 2));
    twig.rotation.x = randRange(-0.6, 0.6);
    twig.rotation.z = randRange(-0.7, 0.7);
    twig.rotation.y = angle;
    twig.castShadow = true;
    twig.receiveShadow = true;
    nest.add(twig);
  }

  const eggMat = new THREE.MeshStandardMaterial({ color: 0xf1f3dd, roughness: 0.88, metalness: 0.04 });
  for (let i = 0; i < 2; i += 1) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), eggMat);
    egg.scale.y = 1.2;
    egg.position.set(-0.35 + i * 0.72, 0.1, -0.2 + i * 0.2);
    egg.castShadow = true;
    egg.receiveShadow = true;
    nest.add(egg);
  }

  nest.position.copy(position);
  scene.add(nest);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 1.35, 13, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
  );
  beacon.position.copy(position).add(new THREE.Vector3(0, 5.5, 0));
  scene.add(beacon);

}

function addTrees() {
  const trunkMat = new THREE.MeshStandardMaterial({
    map: visualAssets.barkColor,
    roughnessMap: visualAssets.barkRoughness,
    roughness: 0.92,
    metalness: 0.03,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: visualAssets.leafColor,
    roughnessMap: visualAssets.leafRoughness,
    roughness: 0.86,
    metalness: 0.02,
  });

  for (let i = 0; i < 56; i += 1) {
    const x = randRange(-70, 70);
    const z = randRange(-70, 70);

    if (Math.abs(x) < 18 || Math.abs(z) < 18) {
      continue;
    }

    const trunkHeight = randRange(2.1, 3.4);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, trunkHeight, 9), trunkMat);
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const leafCount = 2 + Math.floor(Math.random() * 2);
    for (let leafIdx = 0; leafIdx < leafCount; leafIdx += 1) {
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(randRange(0.9, 1.7), 12, 10),
        leafMat,
      );
      leaves.position.set(
        x + randRange(-0.55, 0.55),
        trunkHeight + 0.82 + leafIdx * 0.62,
        z + randRange(-0.55, 0.55),
      );
      leaves.scale.y = randRange(0.8, 1.2);
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      scene.add(leaves);
    }

    if (Math.random() < 0.28) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(randRange(0.7, 1.5), 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0x4e7f4f,
          roughness: 0.88,
          metalness: 0.01,
        }),
      );
      bush.position.set(x + randRange(-2.2, 2.2), 0.5, z + randRange(-2.2, 2.2));
      bush.scale.y = randRange(0.75, 1.12);
      bush.castShadow = true;
      bush.receiveShadow = true;
      scene.add(bush);
    }
  }
}

function addQuestPlaza() {
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 0.3, 36),
    new THREE.MeshPhysicalMaterial({
      map: visualAssets.stoneColor,
      roughnessMap: visualAssets.stoneRoughness,
      roughness: 0.82,
      metalness: 0.08,
      clearcoat: 0.14,
      clearcoatRoughness: 0.68,
    }),
  );
  plaza.position.set(questGiverPosition.x, 0.16, questGiverPosition.z);
  plaza.receiveShadow = true;
  scene.add(plaza);

  questBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.16, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xffd67d, emissive: 0x664500, emissiveIntensity: 0.22, roughness: 0.5 }),
  );
  questBeacon.rotation.x = Math.PI / 2;
  questBeacon.position.set(questGiverPosition.x, 0.34, questGiverPosition.z);
  questBeacon.castShadow = true;
  questBeacon.receiveShadow = true;
  scene.add(questBeacon);

  for (let i = 0; i < 6; i += 1) {
    const torch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x70604a, roughness: 0.92, metalness: 0.08 }),
    );
    const a = (i / 6) * Math.PI * 2;
    torch.position.set(
      questGiverPosition.x + Math.cos(a) * 5.3,
      0.95,
      questGiverPosition.z + Math.sin(a) * 5.3,
    );
    torch.castShadow = true;
    scene.add(torch);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffcb84,
        emissive: 0xff8d30,
        emissiveIntensity: 1.05,
        roughness: 0.25,
        metalness: 0.05,
      }),
    );
    flame.position.copy(torch.position).add(new THREE.Vector3(0, 0.74, 0));
    scene.add(flame);
  }
}

function setupInput() {
  renderer.domElement.addEventListener('click', () => {
    primeAudioContext();
    if (isAnyScreenOpen() || state.ui.touchMode) {
      return;
    }
    renderer.domElement.requestPointerLock();
  });

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!mobileControlState.enabled || event.pointerType !== 'touch' || isAnyScreenOpen()) {
      return;
    }

    if (event.clientX < window.innerWidth * 0.4) {
      return;
    }

    mobileControlState.lookPointerId = event.pointerId;
    mobileControlState.lastLookX = event.clientX;
    mobileControlState.lastLookY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!mobileControlState.enabled || event.pointerId !== mobileControlState.lookPointerId) {
      return;
    }

    const deltaX = event.clientX - mobileControlState.lastLookX;
    const deltaY = event.clientY - mobileControlState.lastLookY;
    mobileControlState.lastLookX = event.clientX;
    mobileControlState.lastLookY = event.clientY;

    state.cameraYaw -= deltaX * MOBILE_LOOK_SENSITIVITY;
    state.cameraPitch = THREE.MathUtils.clamp(
      state.cameraPitch - deltaY * (MOBILE_LOOK_SENSITIVITY * 0.82),
      -0.95,
      0.7,
    );
  });

  const releaseLookPointer = (event) => {
    if (!mobileControlState.enabled || event.pointerId !== mobileControlState.lookPointerId) {
      return;
    }
    mobileControlState.lookPointerId = null;
  };
  renderer.domElement.addEventListener('pointerup', releaseLookPointer);
  renderer.domElement.addEventListener('pointercancel', releaseLookPointer);
  renderer.domElement.addEventListener('lostpointercapture', releaseLookPointer);

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== renderer.domElement) {
      return;
    }

    state.cameraYaw -= event.movementX * 0.0024;
    state.cameraPitch = THREE.MathUtils.clamp(state.cameraPitch - event.movementY * 0.0019, -0.95, 0.7);
  });

  window.addEventListener('keydown', (event) => {
    primeAudioContext();
    if (event.repeat) {
      return;
    }

    switch (event.code) {
      case 'KeyW':
        input.forward = true;
        break;
      case 'KeyS':
        input.back = true;
        break;
      case 'KeyA':
        input.left = true;
        break;
      case 'KeyD':
        input.right = true;
        break;
      case 'Space':
        input.up = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.down = true;
        break;
      case 'KeyE':
        input.interactQueued = true;
        break;
      case 'KeyF':
        input.shootQueued = true;
        break;
      case 'KeyI':
        toggleInventoryScreen();
        break;
      case 'KeyO':
        toggleCraftingScreen();
        break;
      case 'Enter':
        if (state.ui.mainMenuOpen) {
          enableAudio();
          startGameFromMenu();
        }
        break;
      case 'Escape':
        closeAllScreens();
        break;
      default:
        break;
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (state.ui.touchMode) {
      return;
    }

    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    input.aiming = true;

    if (state.ui.mainMenuOpen || state.ui.inventoryOpen || state.ui.craftingOpen) {
      return;
    }

    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      input.aiming = false;
    }
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW':
        input.forward = false;
        break;
      case 'KeyS':
        input.back = false;
        break;
      case 'KeyA':
        input.left = false;
        break;
      case 'KeyD':
        input.right = false;
        break;
      case 'Space':
        input.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.down = false;
        break;
      default:
        break;
    }
  });

  window.addEventListener('blur', () => {
    clearMovementInput();
    mobileControlState.lookPointerId = null;
  });

  setupMobileControls();
  window.addEventListener('resize', onResize);
}

function setupMobileControls() {
  if (!mobileControlState.enabled) {
    return;
  }

  document.body.classList.add('touch-mode');
  updateMobileControlsVisibility();

  mobileStickZoneEl.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') {
      return;
    }

    primeAudioContext();
    event.preventDefault();
    mobileControlState.stickPointerId = event.pointerId;
    mobileStickZoneEl.setPointerCapture(event.pointerId);
    applyMobileStickPointer(event.clientX, event.clientY);
  });

  mobileStickZoneEl.addEventListener('pointermove', (event) => {
    if (event.pointerId !== mobileControlState.stickPointerId) {
      return;
    }

    event.preventDefault();
    applyMobileStickPointer(event.clientX, event.clientY);
  });

  const releaseStickPointer = (event) => {
    if (event.pointerId !== mobileControlState.stickPointerId) {
      return;
    }

    mobileControlState.stickPointerId = null;
    resetMobileStick();
  };
  mobileStickZoneEl.addEventListener('pointerup', releaseStickPointer);
  mobileStickZoneEl.addEventListener('pointercancel', releaseStickPointer);
  mobileStickZoneEl.addEventListener('lostpointercapture', releaseStickPointer);

  bindMobileHoldButton(mobileRiseBtnEl, () => {
    input.up = true;
  }, () => {
    input.up = false;
  });

  bindMobileHoldButton(mobileFallBtnEl, () => {
    input.down = true;
  }, () => {
    input.down = false;
  });

  bindMobileHoldButton(mobileAimBtnEl, () => {
    input.aiming = true;
  }, () => {
    input.aiming = false;
  });

  bindMobileTapButton(mobileInteractBtnEl, () => {
    input.interactQueued = true;
  });

  bindMobileTapButton(mobileShootBtnEl, () => {
    input.shootQueued = true;
  });

  bindMobileTapButton(mobileInventoryBtnEl, () => {
    toggleInventoryScreen();
  });

  bindMobileTapButton(mobileCraftingBtnEl, () => {
    toggleCraftingScreen();
  });
}

function bindMobileTapButton(button, onTap) {
  if (!button) {
    return;
  }

  button.addEventListener('pointerdown', (event) => {
    if (!mobileControlState.enabled || event.pointerType === 'mouse') {
      return;
    }

    primeAudioContext();
    event.preventDefault();
    button.classList.add('is-active');
    onTap();
  });

  const clearPressed = () => {
    button.classList.remove('is-active');
  };
  button.addEventListener('pointerup', clearPressed);
  button.addEventListener('pointercancel', clearPressed);
}

function bindMobileHoldButton(button, onStart, onEnd) {
  if (!button) {
    return;
  }

  let activePointerId = null;

  button.addEventListener('pointerdown', (event) => {
    if (!mobileControlState.enabled || event.pointerType === 'mouse') {
      return;
    }

    primeAudioContext();
    event.preventDefault();
    activePointerId = event.pointerId;
    button.classList.add('is-active');
    button.setPointerCapture(event.pointerId);
    onStart();
  });

  const release = (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    activePointerId = null;
    button.classList.remove('is-active');
    onEnd();
  };

  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

function applyMobileStickPointer(clientX, clientY) {
  const rect = mobileStickZoneEl.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;

  let offsetX = clientX - centerX;
  let offsetY = clientY - centerY;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance > MOBILE_STICK_MAX_PIXELS) {
    const scale = MOBILE_STICK_MAX_PIXELS / distance;
    offsetX *= scale;
    offsetY *= scale;
  }

  mobileStickKnobEl.style.setProperty('--dx', `${offsetX.toFixed(1)}px`);
  mobileStickKnobEl.style.setProperty('--dy', `${offsetY.toFixed(1)}px`);
  input.moveX = THREE.MathUtils.clamp(offsetX / MOBILE_STICK_MAX_PIXELS, -1, 1);
  input.moveZ = THREE.MathUtils.clamp(-offsetY / MOBILE_STICK_MAX_PIXELS, -1, 1);
}

function resetMobileStick() {
  input.moveX = 0;
  input.moveZ = 0;

  if (!mobileStickKnobEl) {
    return;
  }

  mobileStickKnobEl.style.setProperty('--dx', '0px');
  mobileStickKnobEl.style.setProperty('--dy', '0px');
}

function setupUi() {
  startGameBtnEl.addEventListener('click', () => {
    enableAudio();
    startGameFromMenu();
  });

  menuAudioBtnEl.addEventListener('click', () => {
    enableAudio();
    updateMenuHint('Audio enabled. Hit Start Game to begin your flight.');
  });

  shootBtnEl.addEventListener('click', () => {
    primeAudioContext();
    input.shootQueued = true;
  });

  inventoryCloseEl.addEventListener('click', closeInventoryScreen);
  craftingCloseEl.addEventListener('click', closeCraftingScreen);

  inventoryScreenEl.addEventListener('click', (event) => {
    if (event.target === inventoryScreenEl) {
      closeInventoryScreen();
    }
  });

  craftingScreenEl.addEventListener('click', (event) => {
    if (event.target === craftingScreenEl) {
      closeCraftingScreen();
    }
  });

  craftingRecipesEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-craft-id]');
    if (!button) {
      return;
    }

    tryCraftItem(button.dataset.craftId);
  });

  updateMobileControlsVisibility();
}

function updateMobileControlsVisibility() {
  if (!mobileControlsEl || !mobileControlState.enabled) {
    return;
  }

  const shouldShow = !state.ui.mainMenuOpen && !state.ui.inventoryOpen && !state.ui.craftingOpen;
  mobileControlsEl.classList.toggle('is-visible', shouldShow);
}

function setMainMenuVisible(visible) {
  state.ui.mainMenuOpen = visible;
  mainMenuEl.classList.toggle('is-visible', visible);
  hudEl.classList.toggle('is-hidden', visible);
  const hideDesktopControls = visible || state.ui.touchMode;
  controlsEl.classList.toggle('is-hidden', hideDesktopControls);
  shootBtnEl.classList.toggle('is-hidden', hideDesktopControls);
  reticleEl.classList.toggle('is-hidden', visible);
  menuFx.group.visible = visible;
  updateMobileControlsVisibility();

  if (visible) {
    closeAllScreens();
    hidePrompt();
    dialogueEl.classList.remove('visible');
    clearMovementInput();
    if (!state.ui.touchMode && document.pointerLockElement === renderer.domElement) {
      document.exitPointerLock();
    }
  }

  updateThemeTrack();
}

function startGameFromMenu() {
  if (!state.ui.mainMenuOpen) {
    return;
  }

  setMainMenuVisible(false);
  showDialogue('Town Crows', 'Fly out from your nest and find the quest giver.', 3.3);
  updateHud();

  if (!state.ui.touchMode && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
}

function updateMenuHint(text = null) {
  if (!menuHintEl) {
    return;
  }

  if (menuAudioBtnEl) {
    menuAudioBtnEl.textContent = state.audioEnabled ? 'Audio Enabled' : 'Enable Audio';
  }

  if (text) {
    menuHintEl.textContent = text;
    return;
  }

  menuHintEl.textContent = state.audioEnabled
    ? 'Audio enabled. Hit Start Game to begin your flight.'
    : 'Press Enable Audio for music, then Start Game.';
}

function isAnyScreenOpen() {
  return state.ui.mainMenuOpen || state.ui.inventoryOpen || state.ui.craftingOpen;
}

function clearMovementInput() {
  input.forward = false;
  input.back = false;
  input.left = false;
  input.right = false;
  input.moveX = 0;
  input.moveZ = 0;
  input.up = false;
  input.down = false;
  input.aiming = false;
  input.interactQueued = false;
  input.shootQueued = false;
  resetMobileStick();
}

function openInventoryScreen() {
  if (state.ui.mainMenuOpen) {
    return;
  }

  state.ui.inventoryOpen = true;
  state.ui.craftingOpen = false;
  inventoryScreenEl.classList.add('is-visible');
  craftingScreenEl.classList.remove('is-visible');
  clearMovementInput();
  hidePrompt();
  updateMobileControlsVisibility();

  if (!state.ui.touchMode && document.pointerLockElement === renderer.domElement) {
    document.exitPointerLock();
  }

  refreshInventoryScreen();
  refreshCraftingScreen();
}

function closeInventoryScreen() {
  state.ui.inventoryOpen = false;
  inventoryScreenEl.classList.remove('is-visible');
  updateMobileControlsVisibility();
}

function toggleInventoryScreen() {
  if (state.ui.mainMenuOpen) {
    return;
  }

  if (state.ui.inventoryOpen) {
    closeInventoryScreen();
    return;
  }
  openInventoryScreen();
}

function openCraftingScreen() {
  if (state.ui.mainMenuOpen) {
    return;
  }

  state.ui.craftingOpen = true;
  state.ui.inventoryOpen = false;
  craftingScreenEl.classList.add('is-visible');
  inventoryScreenEl.classList.remove('is-visible');
  clearMovementInput();
  hidePrompt();
  updateMobileControlsVisibility();

  if (!state.ui.touchMode && document.pointerLockElement === renderer.domElement) {
    document.exitPointerLock();
  }

  refreshInventoryScreen();
  refreshCraftingScreen();
}

function closeCraftingScreen() {
  state.ui.craftingOpen = false;
  craftingScreenEl.classList.remove('is-visible');
  updateMobileControlsVisibility();
}

function toggleCraftingScreen() {
  if (state.ui.mainMenuOpen) {
    return;
  }

  if (state.ui.craftingOpen) {
    closeCraftingScreen();
    return;
  }
  openCraftingScreen();
}

function closeAllScreens() {
  const wasOpen = isAnyScreenOpen();
  state.ui.inventoryOpen = false;
  state.ui.craftingOpen = false;
  inventoryScreenEl.classList.remove('is-visible');
  craftingScreenEl.classList.remove('is-visible');
  updateMobileControlsVisibility();

  if (wasOpen) {
    clearMovementInput();
  }
}

function loadQuestGiver() {
  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      questGiver = gltf.scene;
      questGiver.position.copy(questGiverPosition);
      questGiver.scale.setScalar(2.35);
      questGiver.rotation.y = Math.PI * 0.2;

      questGiver.traverse((node) => {
        if (!node.isMesh) {
          return;
        }

        const meshName = node.name || '';
        node.castShadow = true;
        node.receiveShadow = true;

        if (meshName && !QUEST_GIVER_VISIBLE_MESHES.has(meshName)) {
          node.visible = false;
        }

        if (/smoke/i.test(meshName)) {
          node.visible = false;
        }
      });

      scene.add(questGiver);

      if (gltf.animations.length > 0) {
        questGiverMixer = new THREE.AnimationMixer(questGiver);
        const clip = THREE.AnimationClip.findByName(gltf.animations, 'idle') || gltf.animations[0];
        if (clip) {
          questGiverMixer.clipAction(clip).play();
        }
      }
    },
    undefined,
    () => {
      questGiver = createFallbackQuestGiver();
      questGiver.position.copy(questGiverPosition);
      questGiver.rotation.y = Math.PI * 0.2;
      questGiver.scale.setScalar(2.5);
      scene.add(questGiver);
    },
  );
}

function createFallbackQuestGiver() {
  const fallback = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c59c, roughness: 0.74, metalness: 0.08 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2b5f96, roughness: 0.8, metalness: 0.04 });
  const pantMat = new THREE.MeshStandardMaterial({ color: 0x2c2f37, roughness: 0.9, metalness: 0.03 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x12161d, roughness: 0.86, metalness: 0.04 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.32, 6, 12), shirtMat);
  torso.position.y = 1.35;
  torso.castShadow = true;
  torso.receiveShadow = true;
  fallback.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 18), skinMat);
  head.position.y = 2.48;
  head.castShadow = true;
  head.receiveShadow = true;
  fallback.add(head);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.84, 6, 10), pantMat);
  leftLeg.position.set(-0.22, 0.48, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  fallback.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.84, 6, 10), pantMat);
  rightLeg.position.set(0.22, 0.48, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  fallback.add(rightLeg);

  const headset = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 24, Math.PI), blackMat);
  headset.rotation.z = Math.PI / 2;
  headset.position.y = 2.48;
  headset.castShadow = true;
  fallback.add(headset);

  return fallback;
}

function spawnInitialWorms() {
  for (let i = 0; i < WORM_TARGET - 1; i += 1) {
    spawnRandomWorm();
  }
}

function spawnInitialTrash() {
  for (let i = 0; i < TRASH_TARGET - 2; i += 1) {
    spawnRandomTrash();
  }
}

function spawnInitialRivalPigeons() {
  for (let i = 0; i < RIVAL_PIGEON_COUNT; i += 1) {
    spawnRivalPigeon(true);
  }
}

function spawnRandomWorm() {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const x = randRange(-PLAY_BOUNDARY + 6, PLAY_BOUNDARY - 6);
    const z = randRange(-PLAY_BOUNDARY + 6, PLAY_BOUNDARY - 6);

    if (Math.abs(x) < 10 && Math.abs(z) < 10) {
      continue;
    }

    if (distance2D(x, z, questGiverPosition.x, questGiverPosition.z) < 8) {
      continue;
    }

    if (distance2D(x, z, NEST_TOP.x, NEST_TOP.z) < 9) {
      continue;
    }

    if (distance2D(x, z, playerCrow.position.x, playerCrow.position.z) < 6.5) {
      continue;
    }

    let tooClose = false;
    for (const worm of worms) {
      if (distance2D(x, z, worm.group.position.x, worm.group.position.z) < 2.3) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) {
      continue;
    }

    const worm = createWormModel({ mafia: Math.random() < MAFIA_WORM_CHANCE });
    worm.group.position.set(x, 0.24, z);
    scene.add(worm.group);
    worms.push(worm);
    return true;
  }

  return false;
}

function spawnRandomTrash() {
  for (let attempt = 0; attempt < 36; attempt += 1) {
    const x = randRange(-PLAY_BOUNDARY + 6, PLAY_BOUNDARY - 6);
    const z = randRange(-PLAY_BOUNDARY + 6, PLAY_BOUNDARY - 6);

    if (distance2D(x, z, questGiverPosition.x, questGiverPosition.z) < 8.5) {
      continue;
    }

    if (distance2D(x, z, NEST_TOP.x, NEST_TOP.z) < 10) {
      continue;
    }

    if (distance2D(x, z, playerCrow.position.x, playerCrow.position.z) < 4.8) {
      continue;
    }

    let tooClose = false;
    for (const trash of trashItems) {
      if (distance2D(x, z, trash.group.position.x, trash.group.position.z) < 2.1) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) {
      continue;
    }

    const type = pickTrashType();
    return spawnTrashAt(type, new THREE.Vector3(x, 0.19, z));
  }

  return false;
}

function spawnTrashAt(type, position) {
  const trash = createTrashModel(type);
  if (!trash) {
    return false;
  }

  trash.group.position.copy(position);
  scene.add(trash.group);
  trashItems.push(trash);
  return true;
}

function pickTrashType() {
  const roll = Math.random();
  let cursor = 0;

  for (const type of TRASH_TYPE_TABLE) {
    cursor += type.weight;
    if (roll <= cursor) {
      return type.id;
    }
  }

  return TRASH_TYPE_TABLE[TRASH_TYPE_TABLE.length - 1].id;
}

function createWormModel({ mafia = false } = {}) {
  const group = new THREE.Group();
  const bodySegments = [];
  const baseColor = mafia ? 0x8a3043 : 0xc77a9c;
  const stunnedColor = 0x78bf73;
  const wormMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.75, metalness: 0.06 });
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.24 - i * 0.016, 14, 12), wormMat);
    seg.position.set(-0.45 + i * 0.23, 0, 0);
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
    bodySegments.push(seg);
  }

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf7fbff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111722 });
  const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), eyeWhiteMat);
  eyeWhiteL.position.set(0.49, 0.07, 0.095);
  group.add(eyeWhiteL);
  const eyeWhiteR = eyeWhiteL.clone();
  eyeWhiteR.position.z = -0.095;
  group.add(eyeWhiteR);

  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pupilMat);
  pupilL.position.set(0.535, 0.073, 0.096);
  group.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.z = -0.096;
  group.add(pupilR);

  let hat = null;
  let glasses = null;
  if (mafia) {
    hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.78, metalness: 0.12 }),
    );
    hat.position.set(-0.1, 0.25, 0);
    hat.rotation.z = 0.2;
    hat.castShadow = true;
    group.add(hat);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.035, 12),
      new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.82, metalness: 0.08 }),
    );
    brim.position.y = 0.16;
    brim.castShadow = true;
    group.add(brim);

    glasses = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.018, 8, 14),
      new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.5, metalness: 0.28 }),
    );
    glasses.rotation.y = Math.PI / 2;
    glasses.position.set(0.37, 0.05, 0);
    glasses.castShadow = true;
    group.add(glasses);
  }

  group.rotation.y = randRange(-Math.PI, Math.PI);

  return {
    group,
    bodySegments,
    phase: randRange(0, Math.PI * 2),
    mafia,
    stunnedUntil: -100,
    baseColor,
    stunnedColor,
    material: wormMat,
    hat,
    glasses,
  };
}

function createTrashModel(type) {
  const group = new THREE.Group();
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.28, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0x747d79, roughness: 0.95, metalness: 0.12 }),
  );
  basePlate.position.y = -0.02;
  basePlate.castShadow = true;
  basePlate.receiveShadow = true;

  let itemMesh = null;

  if (type === 'stick') {
    itemMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.95, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a5730, roughness: 0.94, metalness: 0.03 }),
    );
    itemMesh.rotation.z = randRange(0.3, 1.4);
    itemMesh.position.y = 0.18;
  } else if (type === 'rubber_band') {
    itemMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.045, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0xf2c15f, roughness: 0.7, metalness: 0.04 }),
    );
    itemMesh.rotation.x = Math.PI / 2;
    itemMesh.position.y = 0.13;
  } else if (type === 'bottle_cap') {
    itemMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14),
      new THREE.MeshStandardMaterial({ color: 0xc15f4c, roughness: 0.62, metalness: 0.32 }),
    );
    itemMesh.position.y = 0.1;
  } else if (type === 'wire') {
    itemMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.14, 0.035, 40, 6),
      new THREE.MeshStandardMaterial({ color: 0x7da2ad, roughness: 0.55, metalness: 0.5 }),
    );
    itemMesh.position.y = 0.15;
    itemMesh.scale.set(0.8, 0.8, 0.8);
  } else if (type === 'cloth_scrap') {
    itemMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.04, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x6b8fa8, roughness: 0.96, metalness: 0.02 }),
    );
    itemMesh.position.y = 0.11;
    itemMesh.rotation.y = randRange(-0.6, 0.6);
  } else if (type === 'feather') {
    itemMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xd6ddd9, roughness: 0.73, metalness: 0.05 }),
    );
    itemMesh.position.y = 0.2;
    itemMesh.rotation.z = Math.PI * 0.5;
  } else if (type === 'spring') {
    itemMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.1, 0.03, 56, 10, 3, 7),
      new THREE.MeshStandardMaterial({ color: 0x8b929d, roughness: 0.35, metalness: 0.72 }),
    );
    itemMesh.position.y = 0.16;
    itemMesh.scale.set(0.75, 0.75, 0.75);
  } else if (type === 'pebble') {
    itemMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12, 0),
      new THREE.MeshStandardMaterial({ color: 0x6a655c, roughness: 0.84, metalness: 0.07 }),
    );
    itemMesh.position.y = 0.1;
  } else {
    itemMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x948b82, roughness: 0.75, metalness: 0.15 }),
    );
    itemMesh.position.y = 0.1;
  }

  itemMesh.castShadow = true;
  itemMesh.receiveShadow = true;

  group.add(basePlate);
  group.add(itemMesh);
  group.rotation.y = randRange(-Math.PI, Math.PI);

  return {
    group,
    type,
    phase: randRange(0, Math.PI * 2),
    spin: randRange(-0.7, 0.7),
  };
}

function spawnRivalPigeon(initialSpawn = false) {
  const pigeonCrow = createCrowModel({
    scale: 0.76,
    bodyColor: 0x707680,
    wingColor: 0x595f69,
    beakColor: 0xd89f56,
  });

  const position = randomWorldPosition(9);
  const altitude = randRange(2.6, 10.5);
  pigeonCrow.position.set(position.x, altitude, position.z);
  pigeonCrow.rotation.y = randRange(-Math.PI, Math.PI);
  scene.add(pigeonCrow);

  const target = randomWorldPosition(12);
  const pigeon = {
    crow: pigeonCrow,
    alive: true,
    speed: randRange(4.2, 6.4),
    target: new THREE.Vector3(target.x, altitude, target.z),
    velocity: new THREE.Vector3(),
    bobPhase: randRange(0, Math.PI * 2),
    respawnAt: 0,
  };

  rivalPigeons.push(pigeon);
  if (!initialSpawn) {
    pigeonCrow.visible = true;
  }
}

function createCrowModel({ scale, bodyColor, wingColor, beakColor }) {
  const crow = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    roughness: 0.48,
    metalness: 0.22,
    clearcoat: 0.34,
    clearcoatRoughness: 0.52,
  });
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: wingColor,
    roughness: 0.38,
    metalness: 0.24,
    clearcoat: 0.4,
    clearcoatRoughness: 0.48,
  });
  const beakMat = new THREE.MeshPhysicalMaterial({
    color: beakColor,
    roughness: 0.24,
    metalness: 0.2,
    clearcoat: 0.58,
    clearcoatRoughness: 0.28,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf8fbff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0e14 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 22, 18), bodyMat);
  body.scale.set(1, 0.72, 1.45);
  body.castShadow = true;
  body.receiveShadow = true;
  crow.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), bodyMat);
  head.position.set(0, 0.36, 1.02);
  head.castShadow = true;
  head.receiveShadow = true;
  crow.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 12), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.29, 1.46);
  beak.castShadow = true;
  beak.receiveShadow = true;
  crow.add(beak);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.68, 12), wingMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.12, -1.24);
  tail.castShadow = true;
  tail.receiveShadow = true;
  crow.add(tail);

  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(-0.82, 0.12, 0);
  crow.add(leftWingPivot);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.82, 0.12, 0);
  crow.add(rightWingPivot);

  const wingGeometry = new THREE.BoxGeometry(1.16, 0.12, 0.54);

  const leftWing = new THREE.Mesh(wingGeometry, wingMat);
  leftWing.position.set(-0.58, 0, 0);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  leftWingPivot.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeometry, wingMat);
  rightWing.position.set(0.58, 0, 0);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  rightWingPivot.add(rightWing);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeMat);
  eyeL.position.set(-0.16, 0.4, 1.34);
  crow.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.16;
  crow.add(eyeR);

  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 10), pupilMat);
  pupilL.position.set(-0.16, 0.397, 1.405);
  crow.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.16;
  crow.add(pupilR);

  crow.scale.setScalar(scale);
  crow.userData.leftWingPivot = leftWingPivot;
  crow.userData.rightWingPivot = rightWingPivot;
  crow.userData.phase = randRange(0, Math.PI * 2);

  return crow;
}

function createMenuFx() {
  const group = new THREE.Group();
  group.visible = false;
  group.position.set(0, 0, 0);

  const rings = [];
  const ringColors = [0x6de6ff, 0xffd877, 0xff8f6f, 0x9ecbff, 0x7affcb];
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.2 + i * 1.2, 0.15 + i * 0.02, 16, 80),
      new THREE.MeshStandardMaterial({
        color: ringColors[i % ringColors.length],
        emissive: ringColors[i % ringColors.length],
        emissiveIntensity: 0.25 + i * 0.05,
        roughness: 0.42,
        metalness: 0.75,
        transparent: true,
        opacity: 0.72,
      }),
    );
    ring.position.y = 9.2 + i * 0.55;
    ring.rotation.x = Math.PI * (0.15 + i * 0.04);
    group.add(ring);
    rings.push(ring);
  }

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.65, 2),
    new THREE.MeshStandardMaterial({
      color: 0x9cefff,
      emissive: 0x2ea8d8,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.68,
      flatShading: true,
    }),
  );
  core.position.set(0, 9, 0);
  core.castShadow = true;
  group.add(core);

  const particleCount = 280;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particlePhase = new Float32Array(particleCount);
  const particleRadius = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const idx = i * 3;
    const radius = randRange(4.3, 13.2);
    const angle = randRange(0, Math.PI * 2);
    particlePositions[idx] = Math.cos(angle) * radius;
    particlePositions[idx + 1] = randRange(-2.2, 2.8);
    particlePositions[idx + 2] = Math.sin(angle) * radius;
    particlePhase[i] = randRange(0, Math.PI * 2);
    particleRadius[i] = radius;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0x9de8ff,
      size: 0.14,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  particles.position.y = 9.3;
  group.add(particles);

  const keyLightA = new THREE.PointLight(0x6de5ff, 1.6, 70, 2);
  keyLightA.position.set(8, 13, -5);
  group.add(keyLightA);

  const keyLightB = new THREE.PointLight(0xff9a72, 1.25, 70, 2);
  keyLightB.position.set(-9, 10, 7);
  group.add(keyLightB);

  return {
    group,
    rings,
    core,
    particleCount,
    particleGeometry,
    particlePhase,
    particleRadius,
  };
}

function tick() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updateReticleState();
  updateAtmosphere(delta, elapsed);

  if (state.ui.mainMenuOpen) {
    updateMenuPresentation(delta, elapsed);
    updateWorms(delta, elapsed);
    updateTrash(delta, elapsed);
    updateRivalPigeons(delta, elapsed);
    updateQuestGiver(delta, elapsed);
    updateDialogue(elapsed);
    renderFrame();
    return;
  }

  updatePlayerMovement(delta, elapsed);
  updateCamera(delta);
  updateWorms(delta, elapsed);
  updateTrash(delta, elapsed);
  updateRivalPigeons(delta, elapsed);
  updateInteractionAndQuests(elapsed);
  handleShootInput(elapsed);
  updateProjectiles(delta, elapsed);
  updateGuardCrows(elapsed);
  updateQuestGiver(delta, elapsed);
  updateDialogue(elapsed);

  renderFrame();
}

function renderFrame() {
  const aimingBloomBoost = isAimingActive() ? 0.03 : 0;
  const menuBloomBoost = state.ui.mainMenuOpen ? 0.08 : 0;
  bloomPass.strength = 0.11 + aimingBloomBoost + menuBloomBoost;
  bloomPass.radius = state.ui.mainMenuOpen ? 0.6 : 0.48;
  bloomPass.threshold = state.ui.mainMenuOpen ? 0.74 : 0.84;
  composer.render();
}

function updateAtmosphere(delta, elapsed) {
  if (atmosphereState.skyDome) {
    atmosphereState.skyDome.rotation.y = elapsed * 0.01;
  }

  for (const cloud of atmosphereState.cloudSprites) {
    const phase = cloud.userData.phase;
    const anchor = cloud.userData.anchor;
    const drift = cloud.userData.drift;
    cloud.position.x = anchor.x + Math.sin(elapsed * drift + phase) * 5.4;
    cloud.position.z = anchor.z + Math.cos(elapsed * (drift * 0.86) + phase * 0.9) * 4.6;
    cloud.position.y = anchor.y + Math.sin(elapsed * 0.22 + phase) * 0.9;
    cloud.material.opacity = 0.1 + (Math.sin(elapsed * 0.18 + phase) * 0.5 + 0.5) * 0.12;
  }

  for (let i = 0; i < atmosphereState.hazeBands.length; i += 1) {
    const band = atmosphereState.hazeBands[i];
    band.rotation.z += delta * (0.014 + i * 0.004);
    band.position.y = 3.8 + i * 1.24 + Math.sin(elapsed * 0.42 + i * 0.7) * 0.2;
  }

  if (atmosphereState.dustPoints && atmosphereState.dustBasePositions) {
    const positions = atmosphereState.dustPoints.geometry.attributes.position.array;
    const base = atmosphereState.dustBasePositions;

    for (let i = 0; i < ATMOSPHERE_PARTICLE_COUNT; i += 1) {
      const idx = i * 3;
      const bX = base[idx];
      const bY = base[idx + 1];
      const bZ = base[idx + 2];
      const drift = 0.07 + (i % 9) * 0.009;
      positions[idx] = bX + Math.sin(elapsed * drift + i) * 1.3;
      positions[idx + 1] = bY + Math.sin(elapsed * (drift * 1.8) + i * 0.17) * 0.42;
      positions[idx + 2] = bZ + Math.cos(elapsed * drift + i * 0.5) * 1.3;
    }

    atmosphereState.dustPoints.geometry.attributes.position.needsUpdate = true;
  }
}

function updateMenuPresentation(delta, elapsed) {
  menuFx.group.visible = true;
  camera.fov = THREE.MathUtils.lerp(camera.fov, AIM_DEFAULT_FOV, 1 - Math.exp(-delta * 6));
  camera.updateProjectionMatrix();

  for (let i = 0; i < menuFx.rings.length; i += 1) {
    const ring = menuFx.rings[i];
    const speed = 0.14 + i * 0.04;
    ring.rotation.x += delta * speed * (i % 2 === 0 ? 1 : -1);
    ring.rotation.z += delta * (0.2 + i * 0.03);
    ring.position.y = 9.2 + Math.sin(elapsed * 0.9 + i * 0.6) * (0.4 + i * 0.08);
  }

  menuFx.core.rotation.x += delta * 0.38;
  menuFx.core.rotation.y += delta * 0.54;
  menuFx.core.position.y = 9 + Math.sin(elapsed * 1.7) * 0.6;

  const positions = menuFx.particleGeometry.attributes.position.array;
  for (let i = 0; i < menuFx.particleCount; i += 1) {
    const idx = i * 3;
    const phase = menuFx.particlePhase[i];
    const radius = menuFx.particleRadius[i];
    const spin = elapsed * (0.2 + (i % 7) * 0.03) + phase;

    positions[idx] = Math.cos(spin) * radius;
    positions[idx + 1] = Math.sin(elapsed * 1.1 + phase) * 3.2;
    positions[idx + 2] = Math.sin(spin) * radius;
  }
  menuFx.particleGeometry.attributes.position.needsUpdate = true;

  menuFx.group.rotation.y = elapsed * 0.2;

  const orbitAngle = elapsed * MENU_CAMERA_ORBIT_SPEED;
  tmpCameraPos.set(
    menuCameraCenter.x + Math.sin(orbitAngle) * MENU_CAMERA_RADIUS,
    menuCameraCenter.y + MENU_CAMERA_HEIGHT + Math.sin(elapsed * 0.7) * 1.8,
    menuCameraCenter.z + Math.cos(orbitAngle) * MENU_CAMERA_RADIUS,
  );
  tmpFocus.set(
    menuCameraCenter.x + Math.sin(elapsed * 0.22) * 2.1,
    menuCameraCenter.y + 10.2 + Math.sin(elapsed * 0.55) * 1.3,
    menuCameraCenter.z + Math.cos(elapsed * 0.18) * 1.6,
  );

  camera.position.lerp(tmpCameraPos, 1 - Math.exp(-delta * 2.8));
  camera.lookAt(tmpFocus);
}

function updatePlayerMovement(delta, elapsed) {
  tmpForward.set(Math.sin(state.cameraYaw), 0, Math.cos(state.cameraYaw));
  tmpRight.set(-tmpForward.z, 0, tmpForward.x);

  const uiOpen = isAnyScreenOpen();
  const keyboardX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const keyboardZ = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const inputX = uiOpen ? 0 : THREE.MathUtils.clamp(keyboardX + input.moveX, -1, 1);
  const inputZ = uiOpen ? 0 : THREE.MathUtils.clamp(keyboardZ + input.moveZ, -1, 1);
  const inputY = uiOpen ? 0 : (input.up ? 1 : 0) - (input.down ? 1 : 0);

  tmpDesired.set(0, 0, 0);
  tmpDesired.addScaledVector(tmpForward, inputZ);
  tmpDesired.addScaledVector(tmpRight, inputX);
  tmpDesired.y = inputY;

  if (tmpDesired.lengthSq() > 1) {
    tmpDesired.normalize();
  }

  const targetVelocity = tmpDesired.multiplyScalar(
    BASE_FLY_SPEED * state.speedMultiplier * getWingSpeedMultiplier() * (isAimingActive() ? 0.78 : 1),
  );
  playerVelocity.lerp(targetVelocity, 1 - Math.exp(-delta * 7.5));

  if (targetVelocity.lengthSq() < 0.001 || uiOpen) {
    playerVelocity.multiplyScalar(Math.exp(-delta * 2.5));
  }

  let clampedX = playerCrow.position.x + playerVelocity.x * delta;
  let clampedY = playerCrow.position.y + playerVelocity.y * delta;
  let clampedZ = playerCrow.position.z + playerVelocity.z * delta;
  let boundaryHit = false;

  if (clampedX > PLAY_BOUNDARY - 0.8) {
    clampedX = PLAY_BOUNDARY - 0.8;
    boundaryHit = true;
  }
  if (clampedX < -PLAY_BOUNDARY + 0.8) {
    clampedX = -PLAY_BOUNDARY + 0.8;
    boundaryHit = true;
  }
  if (clampedZ > PLAY_BOUNDARY - 0.8) {
    clampedZ = PLAY_BOUNDARY - 0.8;
    boundaryHit = true;
  }
  if (clampedZ < -PLAY_BOUNDARY + 0.8) {
    clampedZ = -PLAY_BOUNDARY + 0.8;
    boundaryHit = true;
  }

  if (boundaryHit) {
    const side = getBoundarySide(clampedX, clampedZ);
    const inward = getInwardVectorForSide(side);

    clampedX += inward.x * 0.7;
    clampedZ += inward.z * 0.7;

    playerVelocity.x *= 0.72;
    playerVelocity.z *= 0.72;

    maybeWarnBoundary(elapsed, side);
  }

  clampedX = THREE.MathUtils.clamp(clampedX, -PLAY_BOUNDARY + 0.8, PLAY_BOUNDARY - 0.8);
  clampedZ = THREE.MathUtils.clamp(clampedZ, -PLAY_BOUNDARY + 0.8, PLAY_BOUNDARY - 0.8);

  const limitedY = THREE.MathUtils.clamp(clampedY, MIN_ALTITUDE, MAX_ALTITUDE);
  if (limitedY !== clampedY) {
    playerVelocity.y *= 0.35;
  }
  clampedY = limitedY;

  playerCrow.position.set(clampedX, clampedY, clampedZ);

  const horizontalSpeed = Math.hypot(playerVelocity.x, playerVelocity.z);
  if (horizontalSpeed > 0.14) {
    const targetYaw = Math.atan2(playerVelocity.x, playerVelocity.z);
    playerCrow.rotation.y = dampAngle(playerCrow.rotation.y, targetYaw, 11, delta);
  }

  const targetTilt = THREE.MathUtils.clamp(-playerVelocity.y * 0.045, -0.36, 0.36);
  playerCrow.rotation.x = THREE.MathUtils.lerp(playerCrow.rotation.x, targetTilt, 1 - Math.exp(-delta * 6));

  animateCrow(playerCrow, elapsed, horizontalSpeed + Math.abs(playerVelocity.y));
}

function updateCamera(delta) {
  tmpFocus.set(playerCrow.position.x, playerCrow.position.y + 1.8, playerCrow.position.z);

  const aiming = isAimingActive();
  const pitch = THREE.MathUtils.clamp(state.cameraPitch, -0.7, 0.62);
  const cameraPitch = 0.24 + pitch * 0.55;
  const cameraYaw = state.cameraYaw + Math.PI;
  const distance = aiming ? 5.3 : 9.6;
  const verticalOffset = aiming ? 1.4 : 2.2;
  const fovTarget = aiming ? (state.crafted.crow_goggles > 0 ? 38 : AIM_ZOOM_FOV) : AIM_DEFAULT_FOV;

  tmpCameraPos.set(
    tmpFocus.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * distance,
    tmpFocus.y + Math.sin(cameraPitch) * distance + verticalOffset,
    tmpFocus.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * distance,
  );

  camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 1 - Math.exp(-delta * 9));
  camera.updateProjectionMatrix();
  camera.position.lerp(tmpCameraPos, 1 - Math.exp(-delta * 5));
  camera.lookAt(tmpFocus);
}

function updateWorms(delta, elapsed) {
  state.wormSpawnTick += delta;

  if (state.wormSpawnTick >= 1.3) {
    state.wormSpawnTick = 0;
    if (worms.length < WORM_TARGET || (worms.length < WORM_CAP && Math.random() < 0.22)) {
      spawnRandomWorm();
    }
  }

  for (let i = worms.length - 1; i >= 0; i -= 1) {
    const worm = worms[i];
    const wiggleRate = worm.mafia ? 5.3 : 4.5;
    const wiggleTime = elapsed * wiggleRate + worm.phase;
    const mafiaStunned = worm.mafia && elapsed < worm.stunnedUntil;

    worm.group.position.y = 0.24 + Math.sin(wiggleTime) * 0.05;
    worm.group.rotation.y += delta * (worm.mafia ? 1.2 : 0.5);

    if (worm.mafia) {
      worm.material.color.setHex(mafiaStunned ? worm.stunnedColor : worm.baseColor);
      if (worm.hat) {
        worm.hat.visible = !mafiaStunned;
      }
      if (worm.glasses) {
        worm.glasses.visible = !mafiaStunned;
      }
    }

    worm.bodySegments.forEach((segment, index) => {
      segment.position.y = Math.sin(wiggleTime + index * 0.55) * 0.035;
    });

    const distSq = playerCrow.position.distanceToSquared(worm.group.position);
    if (distSq < WORM_COLLECTION_RADIUS * WORM_COLLECTION_RADIUS && playerCrow.position.y < 4.5) {
      if (worm.mafia && !mafiaStunned) {
        if (elapsed - state.lastMafiaBlockNoticeAt > 1.6) {
          state.lastMafiaBlockNoticeAt = elapsed;
          showDialogue('Mafia Worm', 'You cannot eat me yet. Hit me with the slingshot first!', 2.4);
        }
      } else {
        collectWorm(i, elapsed);
      }
    }
  }
}

function updateTrash(delta, elapsed) {
  state.trashSpawnTick += delta;

  if (state.trashSpawnTick >= 1.35) {
    state.trashSpawnTick = 0;
    if (trashItems.length < TRASH_TARGET || (trashItems.length < TRASH_CAP && Math.random() < 0.3)) {
      spawnRandomTrash();
    }
  }

  for (let i = trashItems.length - 1; i >= 0; i -= 1) {
    const trash = trashItems[i];
    const wiggle = Math.sin(elapsed * 2.8 + trash.phase);

    trash.group.position.y = 0.19 + wiggle * 0.035;
    trash.group.rotation.y += delta * (0.3 + trash.spin * 0.2);

    const distSq = playerCrow.position.distanceToSquared(trash.group.position);
    if (distSq < TRASH_COLLECTION_RADIUS * TRASH_COLLECTION_RADIUS && playerCrow.position.y < 4.9) {
      collectTrash(i);
    }
  }
}

function collectWorm(index, elapsed = clock.elapsedTime) {
  const worm = worms[index];
  if (!worm) {
    return false;
  }

  if (worm.mafia && elapsed >= worm.stunnedUntil) {
    if (elapsed - state.lastMafiaBlockNoticeAt > 1.4) {
      state.lastMafiaBlockNoticeAt = elapsed;
      showDialogue('Mafia Worm', 'Not so fast. Slingshot first, then snack time.', 2.3);
    }
    return false;
  }

  const [collectedWorm] = worms.splice(index, 1);
  scene.remove(collectedWorm.group);

  playEatSound();
  state.wormsEaten += 1;
  handleWormQuestProgress();
  updateHud();
  return true;
}

function collectTrash(index) {
  const [trash] = trashItems.splice(index, 1);
  scene.remove(trash.group);

  playPickupSound();
  const amount = getCollectAmountForTrash(trash.type);
  state.totalTrashCollected += 1;
  state.inventory[trash.type] += amount;

  handleTrashQuestProgress();
  updateHud();
}

function updateInteractionAndQuests(elapsed) {
  if (isAnyScreenOpen()) {
    hidePrompt();
    input.interactQueued = false;
    return;
  }

  const distanceToQuestGiver = playerCrow.position.distanceTo(questGiverPosition);
  const closeEnough = distanceToQuestGiver <= QUEST_INTERACT_RADIUS;

  const promptMessages = [];
  const activeQuest = getActiveQuest();
  const nextQuest = getNextQuest();

  if (closeEnough) {
    if (activeQuest) {
      promptMessages.push(`Press E for quest hint (${activeQuest.title}).`);
    } else if (nextQuest) {
      promptMessages.push(`Press E to accept quest: ${nextQuest.title}.`);
    } else {
      promptMessages.push('Press E to chat with the quest giver.');
    }
  }

  if (state.craftingUnlocked && state.crafted.slingshot < 1) {
    if (canCraft('slingshot')) {
      promptMessages.push('Open crafting (O) and craft your slingshot manually.');
    } else {
      promptMessages.push('Collect 1 stick + 1 rubber band to craft a slingshot.');
    }
  }

  if (state.crafted.slingshot >= 1) {
    if (state.inventory.bottle_cap > 0) {
      promptMessages.push(`Press F to shoot (${state.inventory.bottle_cap} cap ammo). Hold right mouse to aim.`);
    } else {
      promptMessages.push('Out of ammo: collect bottle caps for slingshot shots.');
    }
    promptMessages.push('Mafia worms must be shot before they can be eaten.');
  }

  if (promptMessages.length > 0) {
    showPrompt(promptMessages.join('   •   '));
  } else {
    hidePrompt();
  }

  if (input.interactQueued && closeEnough) {
    handleQuestGiverInteraction();
  }

  input.interactQueued = false;

  if (!state.introHintPlayed && elapsed > 10) {
    state.introHintPlayed = true;
    showDialogue('Quest Giver', 'Over here, little crow. Press E near me for quests.', 3.4);
  }
}

function handleShootInput(elapsed) {
  if (!input.shootQueued) {
    return;
  }

  input.shootQueued = false;
  tryShootSlingshot(elapsed);
}

function tryShootSlingshot(elapsed) {
  if (isAnyScreenOpen()) {
    return;
  }

  if (state.crafted.slingshot < 1) {
    if (elapsed - state.lastNoSlingNoticeAt > 1.2) {
      state.lastNoSlingNoticeAt = elapsed;
      showDialogue('Slingshot', 'Craft a slingshot first before shooting.', 2.4);
    }
    return;
  }

  if (state.inventory.bottle_cap <= 0) {
    if (elapsed - state.lastNoAmmoNoticeAt > 1.2) {
      state.lastNoAmmoNoticeAt = elapsed;
      showDialogue('Slingshot', 'Out of ammo. Collect bottle caps to shoot.', 2.4);
    }
    return;
  }

  if (elapsed - state.lastShotAt < SLINGSHOT_FIRE_COOLDOWN) {
    return;
  }

  state.lastShotAt = elapsed;
  state.inventory.bottle_cap -= 1;

  tmpAimDir.set(
    Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch),
    Math.sin(state.cameraPitch),
    Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch),
  ).normalize();

  const spread = getAimSpread();
  tmpAimDir.x += randRange(-spread, spread);
  tmpAimDir.y += randRange(-spread, spread);
  tmpAimDir.z += randRange(-spread, spread);
  tmpAimDir.normalize();

  tmpSpawnPos.copy(playerCrow.position).addScaledVector(tmpAimDir, 1.2);
  tmpSpawnPos.y += 0.7;

  const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
  pebble.position.copy(tmpSpawnPos);
  pebble.castShadow = true;
  pebble.receiveShadow = true;
  scene.add(pebble);

  projectileVelocityTemp.copy(tmpAimDir)
    .multiplyScalar(PEBBLE_SPEED)
    .addScaledVector(playerVelocity, 0.35);

  projectiles.push({
    mesh: pebble,
    velocity: projectileVelocityTemp.clone(),
    life: PEBBLE_LIFETIME,
  });

  playShootSound();
  updateHud();
}

function updateProjectiles(delta, elapsed) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= delta;
    projectile.velocity.y -= PEBBLE_GRAVITY * delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);

    let shouldRemove = false;

    if (
      projectile.life <= 0
      || projectile.mesh.position.y < 0.05
      || Math.abs(projectile.mesh.position.x) > PLAY_BOUNDARY + 8
      || Math.abs(projectile.mesh.position.z) > PLAY_BOUNDARY + 8
    ) {
      shouldRemove = true;
    }

    if (!shouldRemove) {
      for (let wormIndex = worms.length - 1; wormIndex >= 0; wormIndex -= 1) {
        if (projectile.mesh.position.distanceToSquared(worms[wormIndex].group.position) <= PEBBLE_HIT_RADIUS * PEBBLE_HIT_RADIUS) {
          const worm = worms[wormIndex];
          if (worm.mafia) {
            stunMafiaWorm(worm, elapsed);
          } else {
            collectWorm(wormIndex, elapsed);
          }
          shouldRemove = true;
          break;
        }
      }
    }

    if (!shouldRemove) {
      for (const pigeon of rivalPigeons) {
        if (!pigeon.alive || !pigeon.crow.visible) {
          continue;
        }

        if (projectile.mesh.position.distanceToSquared(pigeon.crow.position) <= PIGEON_HIT_RADIUS * PIGEON_HIT_RADIUS) {
          handleRivalPigeonHit(pigeon, elapsed);
          shouldRemove = true;
          break;
        }
      }
    }

    if (!shouldRemove) {
      for (let trashIndex = trashItems.length - 1; trashIndex >= 0; trashIndex -= 1) {
        if (projectile.mesh.position.distanceToSquared(trashItems[trashIndex].group.position) <= PEBBLE_HIT_RADIUS * PEBBLE_HIT_RADIUS) {
          collectTrash(trashIndex);
          shouldRemove = true;
          break;
        }
      }
    }

    if (shouldRemove) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function updateRivalPigeons(delta, elapsed) {
  for (const pigeon of rivalPigeons) {
    if (!pigeon.alive) {
      if (elapsed >= pigeon.respawnAt) {
        respawnRivalPigeon(pigeon);
      }
      continue;
    }

    const toTarget = tmpDesired.copy(pigeon.target).sub(pigeon.crow.position);
    if (toTarget.lengthSq() < 6) {
      const next = randomWorldPosition(10);
      pigeon.target.set(next.x, randRange(2.6, 11), next.z);
    }

    tmpDesired.copy(pigeon.target).sub(pigeon.crow.position).setY(0);
    if (tmpDesired.lengthSq() > 0.001) {
      tmpDesired.normalize();
    }

    const distToPlayer = pigeon.crow.position.distanceTo(playerCrow.position);
    if (distToPlayer < 8.5) {
      tmpDesired.add(
        tmpRight.copy(pigeon.crow.position).sub(playerCrow.position).setY(0).normalize().multiplyScalar(1.4),
      );
      tmpDesired.normalize();
      pigeon.speed = Math.min(8.2, pigeon.speed + delta * 1.4);
    } else {
      pigeon.speed = THREE.MathUtils.lerp(pigeon.speed, 5.2, 1 - Math.exp(-delta * 1.6));
    }

    pigeon.velocity.lerp(
      tmpForward.copy(tmpDesired).multiplyScalar(pigeon.speed),
      1 - Math.exp(-delta * 3.2),
    );
    pigeon.crow.position.addScaledVector(pigeon.velocity, delta);

    pigeon.crow.position.x = THREE.MathUtils.clamp(pigeon.crow.position.x, -PLAY_BOUNDARY + 2, PLAY_BOUNDARY - 2);
    pigeon.crow.position.z = THREE.MathUtils.clamp(pigeon.crow.position.z, -PLAY_BOUNDARY + 2, PLAY_BOUNDARY - 2);
    pigeon.crow.position.y = THREE.MathUtils.lerp(
      pigeon.crow.position.y,
      pigeon.target.y + Math.sin(elapsed * 2 + pigeon.bobPhase) * 0.35,
      1 - Math.exp(-delta * 3.5),
    );

    const horizontalSpeed = Math.hypot(pigeon.velocity.x, pigeon.velocity.z);
    if (horizontalSpeed > 0.12) {
      pigeon.crow.rotation.y = dampAngle(
        pigeon.crow.rotation.y,
        Math.atan2(pigeon.velocity.x, pigeon.velocity.z),
        8.8,
        delta,
      );
    }

    animateCrow(pigeon.crow, elapsed, horizontalSpeed * 1.8 + 1.2);
  }
}

function respawnRivalPigeon(pigeon) {
  const pos = randomWorldPosition(10);
  pigeon.crow.position.set(pos.x, randRange(2.6, 10.4), pos.z);
  const target = randomWorldPosition(10);
  pigeon.target.set(target.x, randRange(2.6, 10.4), target.z);
  pigeon.velocity.set(0, 0, 0);
  pigeon.alive = true;
  pigeon.crow.visible = true;
}

function handleRivalPigeonHit(pigeon, elapsed) {
  pigeon.alive = false;
  pigeon.crow.visible = false;
  pigeon.respawnAt = elapsed + RIVAL_PIGEON_RESPAWN + randRange(-1.2, 2.2);

  if (elapsed - state.lastPigeonHitNoticeAt > 1.8) {
    state.lastPigeonHitNoticeAt = elapsed;
    showDialogue('Rival Pigeon', 'Coo! You got me this round!', 2.1);
  }

  const dropCount = state.crafted.pigeon_totem > 0 ? 2 : 1;
  for (let i = 0; i < dropCount; i += 1) {
    const lootType = Math.random() < 0.55 ? 'feather' : (Math.random() < 0.5 ? 'bottle_cap' : 'wire');
    const dropPos = pigeon.crow.position.clone();
    dropPos.x += randRange(-0.5, 0.5);
    dropPos.z += randRange(-0.5, 0.5);
    dropPos.y = 0.19;
    spawnTrashAt(lootType, dropPos);
  }
}

function stunMafiaWorm(worm, elapsed) {
  const stunDuration = MAFIA_STUN_BASE + (state.crafted.worm_bait > 0 ? 5 : 0);
  worm.stunnedUntil = Math.max(worm.stunnedUntil, elapsed + stunDuration);
  worm.material.color.setHex(worm.stunnedColor);

  if (elapsed - state.lastMafiaBlockNoticeAt > 0.9) {
    state.lastMafiaBlockNoticeAt = elapsed;
    showDialogue('Mafia Worm', 'Agh! I am stunned... now you can eat me!', 2.2);
  }
}

function refreshInventoryScreen() {
  const stacks = [];

  for (const [itemId, meta] of Object.entries(INVENTORY_ITEM_DEFS)) {
    const count = state.inventory[itemId];
    if (count > 0) {
      stacks.push({ short: meta.short, label: meta.label, count });
    }
  }

  for (const [itemId, meta] of Object.entries(CRAFTED_ITEM_DEFS)) {
    const count = state.crafted[itemId];
    if (count > 0) {
      stacks.push({ short: meta.short, label: meta.label, count });
    }
  }

  inventoryGridEl.innerHTML = '';
  for (let slotIndex = 0; slotIndex < 27; slotIndex += 1) {
    const stack = stacks[slotIndex] || null;
    inventoryGridEl.appendChild(createSlotElement(stack));
  }

  const hotbarStacks = [
    state.crafted.slingshot > 0 ? { short: 'SS', label: 'Slingshot', count: state.crafted.slingshot } : null,
    state.inventory.bottle_cap > 0 ? { short: 'BC', label: 'Bottle Cap', count: state.inventory.bottle_cap } : null,
    state.inventory.feather > 0 ? { short: 'FE', label: 'Feather', count: state.inventory.feather } : null,
    state.inventory.wire > 0 ? { short: 'WR', label: 'Wire', count: state.inventory.wire } : null,
    state.inventory.cloth_scrap > 0 ? { short: 'CS', label: 'Cloth Scrap', count: state.inventory.cloth_scrap } : null,
  ];

  hotbarGridEl.innerHTML = '';
  for (let slotIndex = 0; slotIndex < 9; slotIndex += 1) {
    const stack = hotbarStacks[slotIndex] || null;
    hotbarGridEl.appendChild(createSlotElement(stack));
  }
}

function refreshCraftingScreen() {
  craftingRecipesEl.innerHTML = '';

  const recipeEntries = Object.values(CRAFTING_RECIPES);
  let readyCount = 0;

  for (const recipe of recipeEntries) {
    const craftedCount = state.crafted[recipe.id] || 0;
    const atCap = craftedCount >= recipe.max;
    const canCraftNow = state.craftingUnlocked && !atCap && canCraft(recipe.id);
    if (canCraftNow) {
      readyCount += 1;
    }

    const card = document.createElement('div');
    card.className = 'recipe-card';

    const ingredientHtml = Object.entries(recipe.inputs)
      .map(([inputId, needed]) => {
        const meta = INVENTORY_ITEM_DEFS[inputId];
        const have = state.inventory[inputId] || 0;
        const missing = have < needed;
        return `<span class="recipe-chip${missing ? ' missing' : ''}">${meta.short} ${have}/${needed}</span>`;
      })
      .join('');

    const buttonLabel = atCap ? 'Crafted' : 'Craft';
    const buttonDisabled = !canCraftNow;
    const ownedLabel = `<span class="recipe-owned">Owned ${craftedCount}/${recipe.max}</span>`;

    card.innerHTML = `
      <div class="recipe-head">
        <div class="recipe-title">${recipe.short} ${recipe.label}</div>
        ${ownedLabel}
      </div>
      <div class="recipe-ingredients">${ingredientHtml}</div>
      <div class="recipe-desc">${recipe.description}</div>
      <button class="recipe-craft-btn" type="button" data-craft-id="${recipe.id}"${buttonDisabled ? ' disabled' : ''}>${buttonLabel}</button>
    `;

    craftingRecipesEl.appendChild(card);
  }

  if (!state.craftingUnlocked) {
    craftingNoteEl.textContent = 'Crafting is locked. Finish the scavenging quests first.';
  } else if (readyCount > 0) {
    craftingNoteEl.textContent = `${readyCount} recipe${readyCount === 1 ? '' : 's'} ready. Craft manually from this screen.`;
  } else {
    craftingNoteEl.textContent = 'Gather more materials to unlock additional builds.';
  }
}

function createSlotElement(stack) {
  const slot = document.createElement('div');
  slot.className = 'mc-slot';

  if (!stack) {
    slot.classList.add('empty');
    slot.innerHTML = '<div class=\"mc-slot-name\">--</div>';
    return slot;
  }

  slot.innerHTML = `<div class=\"mc-slot-name\">${stack.short}</div><div class=\"mc-slot-count\">${stack.count}</div>`;
  slot.title = `${stack.label}: ${stack.count}`;
  return slot;
}

function handleQuestGiverInteraction() {
  const activeQuest = getActiveQuest();
  if (activeQuest) {
    showQuestHint(activeQuest);
    return;
  }

  const nextQuest = getNextQuest();
  if (!nextQuest) {
    showDialogue('Quest Giver', 'You completed all quests. Enjoy the city skies, champion crow.', 4.2);
    return;
  }

  startQuest(nextQuest);
}

function startQuest(quest) {
  quest.started = true;

  if (quest.id === 'worms') {
    showDialogue('Quest Giver', 'Quest one: find and eat 3 worms. Then your flight speed will double.', 4.2);
  } else if (quest.id === 'cleanup') {
    showDialogue('Quest Giver', 'Quest two: pick up 6 pieces of trash around town.', 3.8);
  } else if (quest.id === 'parts') {
    showDialogue('Quest Giver', 'Quest three: collect 1 stick and 1 rubber band for crafting.', 3.8);
    syncPartsQuestProgress(quest);
  } else if (quest.id === 'slingshot') {
    state.craftingUnlocked = true;
    showDialogue('Quest Giver', 'Final quest: open the crafting screen and craft your slingshot manually.', 3.8);
    syncCraftQuestProgress(quest);
  }

  updateHud();
}

function showQuestHint(quest) {
  if (quest.id === 'worms') {
    const remaining = quest.goal - quest.progress;
    showDialogue('Quest Giver', `Worm hunt progress: ${quest.progress}/${quest.goal}. ${remaining} left.`, 3.1);
    return;
  }

  if (quest.id === 'cleanup') {
    const remaining = quest.goal - quest.progress;
    showDialogue('Quest Giver', `Cleanup progress: ${quest.progress}/${quest.goal}. ${remaining} pieces left.`, 3.1);
    return;
  }

  if (quest.id === 'parts') {
    const stickState = state.inventory.stick >= 1 ? 'done' : 'missing';
    const bandState = state.inventory.rubber_band >= 1 ? 'done' : 'missing';
    showDialogue('Quest Giver', `Parts check: stick ${stickState}, rubber band ${bandState}.`, 3.1);
    return;
  }

  if (quest.id === 'slingshot') {
    if (state.crafted.slingshot >= 1) {
      showDialogue('Quest Giver', 'Slingshot crafted. Speak to me again if you want a victory lap.', 3.1);
    } else if (canCraft('slingshot')) {
      showDialogue('Quest Giver', 'You have the parts. Open crafting and craft the slingshot manually.', 3.1);
    } else {
      showDialogue('Quest Giver', 'Still missing parts. You need 1 stick and 1 rubber band.', 3.1);
    }
  }
}

function handleWormQuestProgress() {
  const quest = getActiveQuest();
  if (!quest || quest.id !== 'worms') {
    return;
  }

  quest.progress = Math.min(quest.goal, quest.progress + 1);

  if (quest.progress >= quest.goal) {
    completeQuest(quest, 'Brilliant work. Worm quest complete and your speed is now doubled.', () => {
      state.speedMultiplier = BOOST_MULTIPLIER;
    });
    return;
  }

  const remaining = quest.goal - quest.progress;
  showDialogue('Quest Giver', `Lovely. ${remaining} more worm${remaining === 1 ? '' : 's'} to go.`, 2.8);
}

function handleTrashQuestProgress() {
  const quest = getActiveQuest();
  if (!quest) {
    return;
  }

  if (quest.id === 'cleanup') {
    quest.progress = Math.min(quest.goal, quest.progress + 1);
    if (quest.progress >= quest.goal) {
      completeQuest(quest, 'Excellent cleanup. The town looks much better already.');
    }
    return;
  }

  if (quest.id === 'parts') {
    syncPartsQuestProgress(quest);
  }
}

function syncPartsQuestProgress(quest) {
  const partCount = Number(state.inventory.stick >= 1) + Number(state.inventory.rubber_band >= 1);
  quest.progress = Math.min(quest.goal, partCount);

  if (quest.progress >= quest.goal) {
    completeQuest(quest, 'Perfect scavenging. Crafting unlocked: you can now build a slingshot.', () => {
      state.craftingUnlocked = true;
    });
  }

  updateHud();
}

function syncCraftQuestProgress(quest) {
  quest.progress = Math.min(quest.goal, state.crafted.slingshot);

  if (quest.progress >= quest.goal) {
    completeQuest(quest, 'Master crafter status achieved. You built your first slingshot.');
  }

  updateHud();
}

function completeQuest(quest, completionLine, rewardFn = null) {
  quest.completed = true;
  quest.started = false;
  quest.progress = quest.goal;

  if (typeof rewardFn === 'function') {
    rewardFn();
  }

  const nextQuest = getNextQuest();
  if (nextQuest) {
    showDialogue('Quest Giver', `${completionLine} Return for your next quest.`, 4.4);
  } else {
    showDialogue('Quest Giver', `${completionLine} All quests complete.`, 4.4);
  }

  updateHud();
}

function tryCraftItem(itemId) {
  if (!state.craftingUnlocked) {
    showDialogue('Crafting', 'Crafting is locked. Finish the scavenging quests first.', 2.9);
    return;
  }

  const recipe = CRAFTING_RECIPES[itemId];
  if (!recipe) {
    return;
  }

  const craftedCount = state.crafted[itemId] || 0;
  if (craftedCount >= recipe.max) {
    showDialogue('Crafting', `You already crafted ${recipe.label}.`, 2.4);
    return;
  }

  if (!canCraft(itemId)) {
    showDialogue('Crafting', `Missing ingredients for ${recipe.label}.`, 2.9);
    return;
  }

  for (const [inputId, amount] of Object.entries(recipe.inputs)) {
    state.inventory[inputId] -= amount;
  }

  state.crafted[itemId] += 1;

  if (itemId === 'wing_charm') {
    showDialogue('Crafting', 'Wing Charm crafted. Passive speed boost active.', 3.1);
  } else if (itemId === 'ammo_pouch') {
    showDialogue('Crafting', 'Ammo Pouch crafted. Bottle cap pickups now give extra ammo.', 3.1);
  } else if (itemId === 'crow_goggles') {
    showDialogue('Crafting', 'Crow Goggles crafted. Aim spread is tighter now.', 3.1);
  } else if (itemId === 'worm_bait') {
    showDialogue('Crafting', 'Worm Bait crafted. Mafia worm stuns last longer.', 3.1);
  } else if (itemId === 'pigeon_totem') {
    showDialogue('Crafting', 'Pigeon Totem crafted. Rival pigeons drop extra loot.', 3.1);
  } else {
    showDialogue('Crafting', `You crafted ${recipe.label}.`, 3.1);
  }

  const activeQuest = getActiveQuest();
  if (itemId === 'slingshot' && activeQuest && activeQuest.id === 'slingshot') {
    syncCraftQuestProgress(activeQuest);
  }

  updateHud();
}

function canCraft(itemId) {
  const recipe = CRAFTING_RECIPES[itemId];
  if (!recipe) {
    return false;
  }

  return Object.entries(recipe.inputs).every(([inputId, requiredCount]) => state.inventory[inputId] >= requiredCount);
}

function getActiveQuest() {
  return state.quests.find((quest) => quest.started && !quest.completed) || null;
}

function getNextQuest() {
  return state.quests.find((quest) => !quest.completed) || null;
}

function updateGuardCrows(elapsed) {
  const showGuards = elapsed <= state.guardVisibleUntil;

  for (const guard of guardCrows) {
    guard.visible = showGuards;

    if (!showGuards) {
      continue;
    }

    const anchor = guard.userData.guardAnchor || guard.position;
    const phase = guard.userData.phase;

    guard.position.x = anchor.x + Math.sin(elapsed * 2.1 + phase) * 0.12;
    guard.position.z = anchor.z + Math.cos(elapsed * 1.8 + phase * 0.8) * 0.09;

    const baseY = guard.userData.guardBaseY ?? anchor.y;
    guard.position.y = baseY + Math.sin(elapsed * 2.2 + phase) * 0.18;

    const movement = 4 + Math.sin(elapsed * 3.5 + phase) * 2;
    animateCrow(guard, elapsed, movement);
    guard.lookAt(playerCrow.position.x, playerCrow.position.y + 1.1, playerCrow.position.z);
  }
}

function maybeWarnBoundary(elapsed, side) {
  if (elapsed < state.boundaryWarnCooldownUntil) {
    return;
  }

  state.boundaryWarnCooldownUntil = elapsed + 4;
  state.guardVisibleUntil = elapsed + 3.3;

  const profile = SIDE_PATROLS[side] || SIDE_PATROLS.north;
  const line = profile.lines[Math.floor(Math.random() * profile.lines.length)];

  showDialogue(profile.speaker, line, 3.6);
  placeGuardsNearPlayer(side);
}

function placeGuardsNearPlayer(side) {
  const inward = getInwardVectorForSide(side);
  const lateral = new THREE.Vector3(-inward.z, 0, inward.x);

  guardCrows.forEach((guard, index) => {
    const lateralOffset = (index - 1) * 1.6;
    const forwardOffset = 2.1 + index * 0.32;

    const position = playerCrow.position.clone()
      .addScaledVector(inward, forwardOffset)
      .addScaledVector(lateral, lateralOffset);

    position.x = THREE.MathUtils.clamp(position.x, -PLAY_BOUNDARY + 2, PLAY_BOUNDARY - 2);
    position.z = THREE.MathUtils.clamp(position.z, -PLAY_BOUNDARY + 2, PLAY_BOUNDARY - 2);
    position.y = THREE.MathUtils.clamp(playerCrow.position.y + 0.8 + index * 0.18, 2.1, MAX_ALTITUDE - 2.4);

    guard.position.copy(position);
    guard.userData.guardAnchor = position.clone();
    guard.userData.guardBaseY = position.y;
    guard.visible = true;
  });
}

function getBoundarySide(x, z) {
  if (Math.abs(x) > Math.abs(z)) {
    return x >= 0 ? 'east' : 'west';
  }

  return z >= 0 ? 'south' : 'north';
}

function getInwardVectorForSide(side) {
  if (side === 'east') {
    return new THREE.Vector3(-1, 0, 0);
  }
  if (side === 'west') {
    return new THREE.Vector3(1, 0, 0);
  }
  if (side === 'south') {
    return new THREE.Vector3(0, 0, -1);
  }

  return new THREE.Vector3(0, 0, 1);
}

function updateQuestGiver(delta, elapsed) {
  if (questGiverMixer) {
    questGiverMixer.update(delta);
  }

  if (questGiver) {
    questGiver.position.y = 0.02 + Math.sin(elapsed * 1.6) * 0.04;
  }

  if (questBeacon) {
    questBeacon.rotation.z += delta * 0.7;
    questBeacon.position.y = 0.34 + Math.sin(elapsed * 2.1) * 0.03;
  }
}

function animateCrow(crow, elapsed, speed) {
  const leftWingPivot = crow.userData.leftWingPivot;
  const rightWingPivot = crow.userData.rightWingPivot;
  const phase = crow.userData.phase;
  const flapRate = 5.6 + speed * 0.33;
  const flap = Math.sin(elapsed * flapRate + phase) * 0.92;

  leftWingPivot.rotation.z = flap;
  rightWingPivot.rotation.z = -flap;
}

function updateDialogue(elapsed) {
  if (dialogueEl.classList.contains('visible') && elapsed >= state.dialogueHideAt) {
    dialogueEl.classList.remove('visible');
  }
}

function showDialogue(speaker, text, duration = 2.8) {
  dialogueSpeakerEl.textContent = speaker;
  dialogueTextEl.textContent = text;
  dialogueEl.classList.add('visible');
  state.dialogueHideAt = clock.elapsedTime + duration;
}

function showPrompt(text) {
  promptEl.textContent = text;
  promptEl.classList.add('visible');
}

function hidePrompt() {
  promptEl.classList.remove('visible');
}

function updateHud() {
  const activeQuest = getActiveQuest();
  const nextQuest = getNextQuest();
  const completedCount = state.quests.filter((quest) => quest.completed).length;

  if (activeQuest) {
    questStatusEl.textContent = `Quest ${completedCount + 1}/${state.quests.length}: ${activeQuest.title} (${activeQuest.progress}/${activeQuest.goal})`;
  } else if (nextQuest) {
    questStatusEl.textContent = `Quest ready: talk to quest giver for "${nextQuest.title}".`;
  } else {
    questStatusEl.textContent = 'All quests complete. Explore freely.';
  }

  const mafiaActive = worms.filter((worm) => worm.mafia).length;
  wormStatusEl.textContent = `Worms eaten: ${state.wormsEaten} | Mafia worms active: ${mafiaActive} | Trash found: ${state.totalTrashCollected}`;

  const speedBoostText = state.speedMultiplier > 1 ? 'quest boost 2x' : 'quest boost none';
  const passiveText = state.crafted.wing_charm > 0 ? ' + wing charm' : '';
  speedStatusEl.textContent = `Flight speed: ${speedBoostText}${passiveText}`;

  questLogEl.textContent = state.quests
    .map((quest, index) => `${quest.completed ? '✓' : quest.started ? '→' : '•'} ${index + 1}. ${quest.title}`)
    .join('   ');

  const inventorySummary = [
    `cap ${state.inventory.bottle_cap}`,
    `stick ${state.inventory.stick}`,
    `band ${state.inventory.rubber_band}`,
    `wire ${state.inventory.wire}`,
    `cloth ${state.inventory.cloth_scrap}`,
    `feather ${state.inventory.feather}`,
  ].join(', ');
  inventoryStatusEl.textContent = `Inventory: ${inventorySummary}`;

  if (!state.craftingUnlocked) {
    craftStatusEl.textContent = 'Crafting: locked (finish scavenging quests)';
  } else if (state.crafted.slingshot >= 1) {
    const readyCount = Object.values(CRAFTING_RECIPES)
      .filter((recipe) => (state.crafted[recipe.id] || 0) < recipe.max && canCraft(recipe.id))
      .length;
    craftStatusEl.textContent = `Crafting: manual via O | Ammo ${state.inventory.bottle_cap} | Ready recipes ${readyCount}`;
  } else if (canCraft('slingshot')) {
    craftStatusEl.textContent = 'Crafting: slingshot recipe ready (open O)';
  } else {
    craftStatusEl.textContent = 'Crafting: gather ingredients and craft in O screen';
  }

  refreshInventoryScreen();
  refreshCraftingScreen();
}

function isAimingActive() {
  return (
    input.aiming
    && state.crafted.slingshot > 0
    && !state.ui.mainMenuOpen
    && !state.ui.inventoryOpen
    && !state.ui.craftingOpen
  );
}

function getAimSpread() {
  const base = isAimingActive() ? 0.008 : 0.028;
  return state.crafted.crow_goggles > 0 ? base * 0.5 : base;
}

function getWingSpeedMultiplier() {
  return state.crafted.wing_charm > 0 ? 1.16 : 1;
}

function getCollectAmountForTrash(type) {
  if (type === 'bottle_cap') {
    return state.crafted.ammo_pouch > 0 ? 2 : 1;
  }

  return 1;
}

function updateReticleState() {
  reticleEl.classList.toggle('aiming', isAimingActive());
}

function enableAudio() {
  state.audioEnabled = true;
  primeAudioContext();
  updateThemeTrack();
  updateMenuHint();
}

function updateThemeTrack() {
  if (!state.audioEnabled) {
    setActiveTheme('none');
    return;
  }

  if (state.ui.mainMenuOpen) {
    setActiveTheme('menu');
  } else {
    setActiveTheme('gameplay');
  }
}

function setActiveTheme(themeId) {
  if (state.activeTheme === themeId) {
    return;
  }

  stopTheme(menuThemeEl, themeId !== 'menu');
  stopTheme(gameplayThemeEl, themeId !== 'gameplay');

  if (themeId === 'menu') {
    playTheme(menuThemeEl, 0.62);
  } else if (themeId === 'gameplay') {
    playTheme(gameplayThemeEl, 0.5);
  }

  state.activeTheme = themeId;
}

function playTheme(audioEl, volume) {
  if (!audioEl) {
    return;
  }

  audioEl.volume = volume;
  audioEl.loop = true;
  audioEl.currentTime = 0;
  const playPromise = audioEl.play();

  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      state.audioEnabled = false;
      state.activeTheme = 'none';
      updateMenuHint('Browser blocked autoplay. Click Enable Audio to start music.');
    });
  }
}

function stopTheme(audioEl, reset = false) {
  if (!audioEl) {
    return;
  }

  audioEl.pause();
  if (reset) {
    audioEl.currentTime = 0;
  }
}

function primeAudioContext() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!audioContext) {
    const ContextClass = window.AudioContext || window.webkitAudioContext;
    if (!ContextClass) {
      return;
    }
    audioContext = new ContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playTone(startFreq, endFreq, duration, volume, type = 'triangle', offset = 0) {
  if (!audioContext) {
    primeAudioContext();
  }

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + offset;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(40, startFreq), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.025);
}

function playEatSound() {
  playTone(680, 360, 0.1, 0.042, 'sine', 0);
  playTone(420, 240, 0.12, 0.032, 'sine', 0.07);
}

function playPickupSound() {
  playTone(520, 860, 0.09, 0.03, 'triangle', 0);
  playTone(780, 980, 0.06, 0.024, 'triangle', 0.04);
}

function playShootSound() {
  playTone(240, 140, 0.07, 0.026, 'square', 0);
  playTone(180, 120, 0.06, 0.02, 'square', 0.04);
}

function dampAngle(from, to, lambda, delta) {
  const angle = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + angle * (1 - Math.exp(-lambda * delta));
}

function distance2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}

function createVisualAssets() {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const grassColor = createGrassTexture(640);
  const grassRoughness = createGrassRoughnessTexture(640);
  const cityTint = createCityTintTexture(640);
  const cityRoughness = createCityRoughnessTexture(640);
  const roadColor = createRoadTexture(640);
  const roadRoughness = createRoadRoughnessTexture(640);
  const roadStripe = createRoadStripeTexture(320);
  const barkColor = createBarkTexture(384);
  const barkRoughness = createBarkRoughnessTexture(384);
  const leafColor = createLeafTexture(320);
  const leafRoughness = createLeafRoughnessTexture(320);
  const stoneColor = createStoneTexture(360);
  const stoneRoughness = createStoneRoughnessTexture(360);
  const roofColor = createRoofTexture(360);
  const roofRoughness = createRoofRoughnessTexture(360);
  const cloudSprite = createCloudSpriteTexture(256);
  const facades = [createFacadeSet(194), createFacadeSet(483), createFacadeSet(792)];
  const nestTower = createFacadeSet(932, { warm: true, emissiveBoost: 1.18 });

  setTextureSampling(grassColor, 24, 24, anisotropy, true);
  setTextureSampling(grassRoughness, 24, 24, anisotropy, false);
  setTextureSampling(cityTint, 14, 14, anisotropy, true);
  setTextureSampling(cityRoughness, 14, 14, anisotropy, false);
  setTextureSampling(roadColor, 26, 4, anisotropy, true);
  setTextureSampling(roadRoughness, 26, 4, anisotropy, false);
  setTextureSampling(roadStripe, 6, 1, anisotropy, true);
  setTextureSampling(barkColor, 2, 3, anisotropy, true);
  setTextureSampling(barkRoughness, 2, 3, anisotropy, false);
  setTextureSampling(leafColor, 1, 1, anisotropy, true);
  setTextureSampling(leafRoughness, 1, 1, anisotropy, false);
  setTextureSampling(stoneColor, 2, 2, anisotropy, true);
  setTextureSampling(stoneRoughness, 2, 2, anisotropy, false);
  setTextureSampling(roofColor, 2, 2, anisotropy, true);
  setTextureSampling(roofRoughness, 2, 2, anisotropy, false);

  return {
    grassColor,
    grassRoughness,
    cityTint,
    cityRoughness,
    roadColor,
    roadRoughness,
    roadStripe,
    barkColor,
    barkRoughness,
    leafColor,
    leafRoughness,
    stoneColor,
    stoneRoughness,
    roofColor,
    roofRoughness,
    cloudSprite,
    facades,
    nestTower,
  };
}

function setTextureSampling(texture, repeatX, repeatY, anisotropy, colorTexture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  texture.colorSpace = colorTexture
    ? THREE.SRGBColorSpace
    : (THREE.NoColorSpace || THREE.LinearSRGBColorSpace);
}

function createCanvasTexture(size, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  painter(ctx, size);
  return new THREE.CanvasTexture(canvas);
}

function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) {
    s += 2147483646;
  }
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function paintNoise(ctx, size, strength, rng, baseRgb) {
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rng() * 2 - 1) * strength;
    data[i] = THREE.MathUtils.clamp(baseRgb[0] + n, 0, 255);
    data[i + 1] = THREE.MathUtils.clamp(baseRgb[1] + n, 0, 255);
    data[i + 2] = THREE.MathUtils.clamp(baseRgb[2] + n, 0, 255);
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function createGrassTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(701);
    paintNoise(ctx, s, 26, rng, [122, 166, 110]);

    for (let i = 0; i < 3200; i += 1) {
      const x = rng() * s;
      const y = rng() * s;
      const w = 1 + rng() * 2;
      const h = 4 + rng() * 10;
      const alpha = 0.08 + rng() * 0.2;
      ctx.fillStyle = `rgba(${98 + Math.floor(rng() * 54)}, ${136 + Math.floor(rng() * 76)}, ${82 + Math.floor(rng() * 46)}, ${alpha.toFixed(3)})`;
      ctx.fillRect(x, y, w, h);
    }
  });
}

function createGrassRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(702);
    paintNoise(ctx, s, 40, rng, [214, 214, 214]);
  });
}

function createCityTintTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(703);
    paintNoise(ctx, s, 24, rng, [140, 162, 137]);
    for (let i = 0; i < 380; i += 1) {
      ctx.strokeStyle = `rgba(104, 120, 104, ${0.06 + rng() * 0.08})`;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(rng() * s, rng() * s);
      ctx.lineTo(rng() * s, rng() * s);
      ctx.stroke();
    }
  });
}

function createCityRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(704);
    paintNoise(ctx, s, 34, rng, [196, 196, 196]);
  });
}

function createRoadTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(705);
    paintNoise(ctx, s, 18, rng, [91, 96, 103]);
    for (let i = 0; i < 420; i += 1) {
      ctx.strokeStyle = `rgba(46, 52, 59, ${0.05 + rng() * 0.12})`;
      ctx.lineWidth = 1 + rng() * 1.8;
      ctx.beginPath();
      const x = rng() * s;
      const y = rng() * s;
      ctx.moveTo(x, y);
      ctx.lineTo(x + randRange(-20, 20), y + randRange(-20, 20));
      ctx.stroke();
    }
  });
}

function createRoadRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(706);
    paintNoise(ctx, s, 46, rng, [172, 172, 172]);
  });
}

function createRoadStripeTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    ctx.fillStyle = '#cec7a6';
    ctx.fillRect(0, 0, s, s);
    const rng = createSeededRandom(707);
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = `rgba(158, 144, 115, ${0.1 + rng() * 0.14})`;
      ctx.fillRect(rng() * s, rng() * s, 4 + rng() * 18, 1 + rng() * 4);
    }
  });
}

function createBarkTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(708);
    paintNoise(ctx, s, 24, rng, [92, 66, 43]);
    for (let i = 0; i < 180; i += 1) {
      ctx.strokeStyle = `rgba(54, 36, 22, ${0.24 + rng() * 0.28})`;
      ctx.lineWidth = 1 + rng() * 2.2;
      const x = rng() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + randRange(-7, 7), s);
      ctx.stroke();
    }
  });
}

function createBarkRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(709);
    paintNoise(ctx, s, 40, rng, [188, 188, 188]);
  });
}

function createLeafTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(710);
    paintNoise(ctx, s, 30, rng, [106, 154, 96]);
    for (let i = 0; i < 700; i += 1) {
      ctx.fillStyle = `rgba(${63 + Math.floor(rng() * 60)}, ${96 + Math.floor(rng() * 82)}, ${58 + Math.floor(rng() * 36)}, ${0.1 + rng() * 0.2})`;
      ctx.beginPath();
      ctx.arc(rng() * s, rng() * s, 1 + rng() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createLeafRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(711);
    paintNoise(ctx, s, 30, rng, [172, 172, 172]);
  });
}

function createStoneTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(712);
    paintNoise(ctx, s, 20, rng, [176, 174, 165]);
    for (let i = 0; i < 260; i += 1) {
      ctx.strokeStyle = `rgba(124, 124, 118, ${0.08 + rng() * 0.12})`;
      ctx.lineWidth = 1 + rng() * 1.4;
      ctx.beginPath();
      const x = rng() * s;
      const y = rng() * s;
      ctx.moveTo(x, y);
      ctx.lineTo(x + randRange(-26, 26), y + randRange(-26, 26));
      ctx.stroke();
    }
  });
}

function createStoneRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(713);
    paintNoise(ctx, s, 26, rng, [180, 180, 180]);
  });
}

function createRoofTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(714);
    paintNoise(ctx, s, 24, rng, [128, 136, 148]);
    for (let y = 0; y < s; y += 10) {
      ctx.fillStyle = `rgba(70, 77, 86, ${0.12 + rng() * 0.1})`;
      ctx.fillRect(0, y, s, 2 + rng() * 2);
    }
  });
}

function createRoofRoughnessTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const rng = createSeededRandom(715);
    paintNoise(ctx, s, 34, rng, [196, 196, 196]);
  });
}

function createCloudSpriteTexture(size) {
  return createCanvasTexture(size, (ctx, s) => {
    const grad = ctx.createRadialGradient(s * 0.5, s * 0.45, s * 0.08, s * 0.5, s * 0.5, s * 0.5);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.42, 'rgba(243,248,255,0.42)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  });
}

function createFacadeSet(seed, options = {}) {
  const rng = createSeededRandom(seed);
  const size = 512;
  const warm = options.warm === true;
  const emissiveBoost = options.emissiveBoost || 1;

  const albedo = createCanvasTexture(size, (ctx, s) => {
    paintNoise(ctx, s, 16, rng, warm ? [170, 161, 150] : [152, 162, 176]);
    const cols = 10 + Math.floor(rng() * 7);
    const rows = 13 + Math.floor(rng() * 10);
    const cellW = s / cols;
    const cellH = s / rows;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const px = x * cellW;
        const py = y * cellH;
        ctx.fillStyle = `rgba(${122 + Math.floor(rng() * 36)}, ${128 + Math.floor(rng() * 36)}, ${136 + Math.floor(rng() * 36)}, 0.22)`;
        ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
      }
    }
  });

  const emissive = createCanvasTexture(size, (ctx, s) => {
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, s, s);
    const cols = 10 + Math.floor(rng() * 7);
    const rows = 13 + Math.floor(rng() * 10);
    const cellW = s / cols;
    const cellH = s / rows;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (rng() > 0.33) {
          continue;
        }
        const px = x * cellW + cellW * 0.18;
        const py = y * cellH + cellH * 0.22;
        const width = cellW * 0.62;
        const height = cellH * 0.56;
        const c = warm
          ? `rgba(${232 + Math.floor(rng() * 20)}, ${182 + Math.floor(rng() * 25)}, ${112 + Math.floor(rng() * 20)}, ${0.38 * emissiveBoost})`
          : `rgba(${164 + Math.floor(rng() * 22)}, ${198 + Math.floor(rng() * 30)}, ${230 + Math.floor(rng() * 24)}, ${0.3 * emissiveBoost})`;
        ctx.fillStyle = c;
        ctx.fillRect(px, py, width, height);
      }
    }
  });

  const roughness = createCanvasTexture(size, (ctx, s) => {
    paintNoise(ctx, s, 30, rng, [182, 182, 182]);
  });

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  setTextureSampling(albedo, 1, 1, anisotropy, true);
  setTextureSampling(emissive, 1, 1, anisotropy, false);
  setTextureSampling(roughness, 1, 1, anisotropy, false);

  return { albedo, emissive, roughness };
}

function randomWorldPosition(margin = 6) {
  return new THREE.Vector3(
    randRange(-PLAY_BOUNDARY + margin, PLAY_BOUNDARY - margin),
    0,
    randRange(-PLAY_BOUNDARY + margin, PLAY_BOUNDARY - margin),
  );
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function onResize() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  composer.setPixelRatio(pixelRatio);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);

  if (mobileControlState.enabled) {
    resetMobileStick();
    updateMobileControlsVisibility();
  }
}
