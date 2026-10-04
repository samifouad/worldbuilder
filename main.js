import * as THREE from 'three';

// ============================================================
// THE WORLD IS DATA.
// This object is the entire demo's argument: a scene is a JSON
// document. Hand-written today; later, an LLM writes this.
// ============================================================
const SCENE = {
  meta: { title: "Alley, 2AM — scene 001" },
  environment: {
    sky: "#05070d",
    fog: { color: "#0a0f1a", density: 0.027 },
    ground: { width: 12, length: 56, center: [0, 0, -16], color: "#141a24", roughness: 0.3, metalness: 0.5 },
    buildings: [
      { side: "left",  color: "#1a2030", windows: { litRatio: 0.28, warm: "#ffb066", cool: "#7fd4ff" } },
      { side: "right", color: "#171c29", windows: { litRatio: 0.2,  warm: "#ffb066", cool: "#7fd4ff" } }
    ],
    props: [
      { type: "streetlamp", position: [-3.2, 0, -10], color: "#ffd9a0", flicker: true },
      { type: "neonSign", position: [4.45, 4.2, -18], facing: "left",  color: "#ff2d95", size: [2.4, 0.9] },
      { type: "neonSign", position: [-4.45, 5.4, -30], facing: "right", color: "#35e0ff", size: [1.7, 1.7] },
      { type: "dumpster", position: [3.1, 0, -6] },
      { type: "crate", position: [-2.9, 0, 3] },
      { type: "crate", position: [-2.3, 0, 3.7] },
      { type: "puddle", position: [1.2, 0.01, -14], size: [2.6, 1.4] }
    ],
    rain: { count: 900, area: [14, 12, 56], wind: -0.6 }
  },
  characters: [
    {
      name: "Vale",
      look: { coat: "#4a5878", skin: "#c9a186" },
      position: [0, 0, -8],
      path: [[0, 0, -8], [0, 0, -24], [1.8, 0, -24], [1.8, 0, -8]],
      speed: 1.15
    }
  ],
  cameras: [
    { name: "POV",      type: "player" },
    { name: "Crane",    type: "static", position: [3.4, 7, 5], lookAt: [0, 1.0, -18] },
    { name: "Dolly",    type: "track", target: "Vale", offset: [4.2, 1.6, 2.8] },
    { name: "Close-Up", type: "track", target: "Vale", offset: [1.7, 1.55, 1.5] }
  ]
};

// ============================================================
// BUILDERS — prop types map to functions. This is the
// vocabulary an agent would later call as tools.
// ============================================================
const colliders = [];   // {minX, maxX, minZ, maxZ, y, h}
const flickering = [];
const collider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y: 0, h: 0.7 });

function buildStreetlamp(parent, p) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.6, metalness: 0.8 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 8), dark);
  pole.position.y = 2.3; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), dark);
  arm.position.set(0.45, 4.55, 0); g.add(arm);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x11131a, emissive: new THREE.Color(p.color), emissiveIntensity: 2.2 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.24), headMat);
  head.position.set(0.9, 4.5, 0); g.add(head);
  const spot = new THREE.SpotLight(new THREE.Color(p.color), 260, 18, 0.55, 0.45, 1.8);
  spot.position.set(0.9, 4.45, 0);
  spot.target.position.set(0.9, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  g.add(spot, spot.target);
  if (p.flicker) flickering.push({ light: spot, base: 260, mat: headMat, t: 0 });
  g.position.set(...p.position);
  parent.add(g);
  collider(p.position[0], p.position[2], 0.3, 0.3);
}

function buildNeonSign(parent, p) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, emissive: new THREE.Color(p.color), emissiveIntensity: 2.6 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(p.size[0], p.size[1], 0.1), mat);
  sign.position.set(...p.position);
  // wall-mounted: orientation handled by the pivot (baseRotY); else legacy left/right
  const ry = p.normal ? 0 : (p.facing === "left" ? -Math.PI / 2 : Math.PI / 2);
  sign.rotation.y = ry;
  parent.add(sign);
  const off = p.normal ? [0, 0, 0.6] : (p.facing === "left" ? [-0.6, 0, 0] : [0.6, 0, 0]);
  const glow = new THREE.PointLight(new THREE.Color(p.color), 40, 14, 1.8);
  glow.position.set(p.position[0] + off[0], p.position[1] + off[1], p.position[2] + off[2]);
  parent.add(glow);
}

function buildDumpster(parent, p) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1d2b22, roughness: 0.75, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 1.05), mat);
  body.position.set(p.position[0], 0.55, p.position[2]); body.castShadow = true; parent.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.05), mat);
  lid.position.set(p.position[0], 1.12, p.position[2] - 0.06); lid.rotation.x = -0.14; parent.add(lid);
  collider(p.position[0], p.position[2], 2.0, 1.2);
}

function buildCrate(parent, p) {
  const c = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.68, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.85 })
  );
  c.position.set(p.position[0], 0.34, p.position[2]);
  c.rotation.y = Math.random() * 0.8; c.castShadow = true;
  parent.add(c);
  collider(p.position[0], p.position[2], 0.8, 0.8);
}

function buildPuddle(parent, p) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.04, metalness: 1.0 })
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(p.size[0], p.size[1], 1);
  m.position.set(...p.position);
  parent.add(m);
}

function buildBuildings(parent, spec) {
  const left = spec.side === "left";
  const wallX = left ? -4.5 : 4.5;
  const cx = left ? -6.6 : 6.6;
  const faceRot = left ? Math.PI / 2 : -Math.PI / 2;
  for (let z = 6; z > -40; z -= 8) {
    const h = 9 + ((z * 7919) % 10 + 10) % 10;   // deterministic pseudo-random 9..18
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, h, 7.9),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.9 })
    );
    b.position.set(cx, h / 2, z - 4);
    parent.add(b);
    const win = spec.windows;
    for (let y = 2.8; y < h - 1.4; y += 2.3) {
      for (let wz = z - 7.1; wz < z - 0.9; wz += 1.55) {
        const lit = Math.random() < win.litRatio;
        const warm = Math.random() < 0.6;
        const wm = new THREE.MeshStandardMaterial({
          color: 0x05070a,
          emissive: lit ? new THREE.Color(warm ? win.warm : win.cool) : new THREE.Color(0x000000),
          emissiveIntensity: lit ? 2.2 : 0
        });
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.85), wm);
        w.position.set(wallX + (left ? 0.02 : -0.02), y, wz);
        w.rotation.y = faceRot;
        parent.add(w);
      }
    }
  }
}

function buildRain(parent, spec) {
  const n = spec.count;
  const pos = new Float32Array(n * 3);
  const [ax, ay, az] = spec.area;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ax;
    pos[i * 3 + 1] = Math.random() * ay;
    pos[i * 3 + 2] = 8 - Math.random() * az;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x9db4d0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false
  }));
  parent.add(rain);
  return { update(dt) {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] -= 17 * dt;
      a[i * 3] += spec.wind * dt;
      if (a[i * 3 + 1] < 0) { a[i * 3 + 1] = ay; a[i * 3] = (Math.random() - 0.5) * ax; }
    }
    geo.attributes.position.needsUpdate = true;
  } };
}

const PROP_DEFAULTS = {
  streetlamp: { color: '#ffd9a0', flicker: true },
  neonSign: { color: '#ff2d95', size: [2.2, 0.9], facing: 'left' },
  dumpster: {},
  crate: {},
  puddle: { size: [2.2, 1.2] }
};
// footprint [w, d] for validity/snapping (0 = walks over); height for stacking
const FOOTPRINTS = { streetlamp: [0.3, 0.3], neonSign: [0, 0], dumpster: [2.0, 1.2], crate: [0.8, 0.8], puddle: [0, 0] };
const PROP_HEIGHTS = { streetlamp: 4.6, neonSign: 0, dumpster: 1.2, crate: 0.7, puddle: 0 };

const PROP_BUILDERS = { streetlamp: buildStreetlamp, neonSign: buildNeonSign, dumpster: buildDumpster, crate: buildCrate, puddle: buildPuddle };

// ---------- prop registry: every prop is pickable, movable, rotatable ----------
const props = [];
let propSeq = 0;
function addProp(spec) {
  const group = new THREE.Group();
  const collBefore = colliders.length;
  const flickBefore = flickering.length;
  PROP_BUILDERS[spec.type](group, spec);
  // re-base: children become local to the prop's own pivot so it can rotate/lift
  const pivot = new THREE.Vector3(...spec.position);
  group.children.forEach(c => c.position.sub(pivot));
  group.position.copy(pivot);
  const id = propSeq++;
  group.traverse(o => o.userData.propId = id);
  scene.add(group);
  const h = PROP_HEIGHTS[spec.type] ?? 0.7;
  const rec = {
    id, spec, group,
    elev: spec.position[1] ?? 0,
    rotY: 0,
    baseRotY: spec.normal ? Math.atan2(spec.normal[0], spec.normal[2]) : 0,
    colliders: colliders.slice(collBefore),
    flickers: flickering.slice(flickBefore)
  };
  group.rotation.y = rec.baseRotY;
  rec.colliders.forEach(c => { c.h = h; c.y = rec.elev; });
  props.push(rec);
  return rec;
}
function removeProp(rec) {
  scene.remove(rec.group);
  for (const c of rec.colliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
  for (const f of rec.flickers) { const i = flickering.indexOf(f); if (i >= 0) flickering.splice(i, 1); }
  const pi = props.indexOf(rec); if (pi >= 0) props.splice(pi, 1);
  const si = SCENE.environment.props.indexOf(rec.spec); if (si >= 0) SCENE.environment.props.splice(si, 1);
  if (selected === rec) selected = null;
}
// rotation widens the axis-aligned footprint (conservative box)
function rotatedFootprint(rec) {
  const [w, d] = FOOTPRINTS[rec.spec.type] ?? [0, 0];
  const c = Math.abs(Math.cos(rec.rotY)), s = Math.abs(Math.sin(rec.rotY));
  return [w * c + d * s, w * s + d * c];
}
function setCollidersAt(rec) {
  const [w, d] = rotatedFootprint(rec);
  const x = rec.group.position.x, z = rec.group.position.z;
  for (const c of rec.colliders) {
    c.minX = x - w / 2; c.maxX = x + w / 2;
    c.minZ = z - d / 2; c.maxZ = z + d / 2;
    c.y = rec.elev;
  }
}
function updateSpec(rec) {
  rec.spec.position = [rec.group.position.x, rec.elev, rec.group.position.z];
  rec.spec.rotationY = +rec.rotY.toFixed(3);
  if (rec.spec.wall) rec.spec.normal = [Math.sin(rec.baseRotY), 0, Math.cos(rec.baseRotY)];
}
function validAt(x, z, w, d, elev, h, ignore = []) {
  if (Math.abs(x) > 4.2 - w / 2 || z < -39 + d / 2 || z > 7.4 - d / 2) return false;
  if (h === 0) return true;  // flat/hanging things never block
  return !colliders.some(c =>
    !ignore.includes(c) &&
    x + w / 2 > c.minX && x - w / 2 < c.maxX &&
    z + d / 2 > c.minZ && z - d / 2 < c.maxZ &&
    elev < c.y + c.h - 1e-6 && elev + h > c.y + 1e-6
  );
}
let snapOn = true;
function snapPos(x, z, w, d, ignore = []) {
  const g = 0.25;
  let sx = Math.round(x / g) * g, sz = Math.round(z / g) * g;
  const T = 0.5;
  for (const c of colliders) {
    if (ignore.includes(c)) continue;
    for (const v of [c.maxX + w / 2, c.minX - w / 2, c.minX + w / 2, c.maxX - w / 2])
      if (Math.abs(sx - v) < T) { sx = v; break; }
    for (const v of [c.maxZ + d / 2, c.minZ - d / 2, c.minZ + d / 2, c.maxZ - d / 2])
      if (Math.abs(sz - v) < T) { sz = v; break; }
  }
  return [sx, sz];
}

// ============================================================
// WORLD
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE.environment.sky);
scene.fog = new THREE.FogExp2(new THREE.Color(SCENE.environment.fog.color), SCENE.environment.fog.density);

const g = SCENE.environment.ground;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(g.width, g.length),
  new THREE.MeshStandardMaterial({ color: g.color, roughness: g.roughness, metalness: g.metalness })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(...g.center);
ground.receiveShadow = true;
scene.add(ground);

scene.add(new THREE.AmbientLight(0x2a3450, 0.9));
const moon = new THREE.DirectionalLight(0x4a5a80, 1.0);
moon.position.set(-6, 14, 4);
scene.add(moon);

SCENE.environment.buildings.forEach(b => buildBuildings(scene, b));
SCENE.environment.props.forEach(p => addProp(p));
const rain = SCENE.environment.rain ? buildRain(scene, SCENE.environment.rain) : null;

// ---------- characters ----------
const actors = {};
for (const c of SCENE.characters) {
  const grp = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.85, 6, 14),
    new THREE.MeshStandardMaterial({ color: c.look.coat, roughness: 0.8 })
  );
  coat.position.y = 0.98; coat.castShadow = true; grp.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 18, 14),
    new THREE.MeshStandardMaterial({ color: c.look.skin, roughness: 0.6 })
  );
  head.position.y = 1.78; head.castShadow = true; grp.add(head);
  grp.position.set(...c.position);
  grp.traverse(o => o.userData.actor = true);
  scene.add(grp);
  actors[c.name] = { group: grp, spec: c, wp: 0, phase: Math.random() * 6 };
}

// ---------- player ----------
const player = { pos: new THREE.Vector3(0, 1.7, 6), yaw: 0, pitch: 0, third: false };
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 200);
let look = null;  // {x, y} while left-dragging empty space
let drag = null;  // {kind:'prop'|'cam', rec, pos:[x,z], start:[x,z], valid, placing, lastMouse}
let selected = null;

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyT') player.third = !player.third;
  if (e.code === 'KeyR') toggleRec();
  if (e.code === 'KeyG') { snapOn = !snapOn; hint(`snap ${snapOn ? 'on' : 'off'}`); }
  if (e.code === 'Escape') {
    if (drag?.placing) cancelPlacement();
    else if (selected) { setTint(selected, null); selected = null; }
  }
  if ((e.code === 'Delete' || e.code === 'Backspace') && selected && !drag) {
    hint(`removed ${selected.spec.type}`);
    removeProp(selected);
    refreshJson();
  }
  if (e.code === 'KeyQ' || e.code === 'KeyE') {
    const rec = drag?.kind === 'prop' ? drag.rec : selected;
    if (rec) {
      rotateProp(rec, (e.code === 'KeyQ' ? 1 : -1) * (e.shiftKey ? 0.087 : 0.262));
      e.preventDefault();
    }
  }
  if (e.code.startsWith('Digit')) {
    const i = +e.code.slice(5) - 1;
    if (SCENE.cameras[i]) setCam(i);
  }
});
addEventListener('keyup', e => keys[e.code] = false);

function movePlayer(dt) {
  const run = keys['ShiftLeft'] || keys['ShiftRight'];
  const sp = run ? 6.2 : 3.1;
  const f = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  const s = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  if (!f && !s) return;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  player.pos.x += (-sin * f + cos * s) * sp * dt;
  player.pos.z += (-cos * f - sin * s) * sp * dt;
  player.pos.x = Math.max(-4.05, Math.min(4.05, player.pos.x));
  player.pos.z = Math.max(-39, Math.min(7.4, player.pos.z));
  const r = 0.35;
  for (const c of colliders) {
    if (c.y > 1.2) continue;  // raised or hanging things don't block walking
    const px = player.pos.x, pz = player.pos.z;
    if (px > c.minX - r && px < c.maxX + r && pz > c.minZ - r && pz < c.maxZ + r) {
      const dxl = px - (c.minX - r), dxr = (c.maxX + r) - px;
      const dzl = pz - (c.minZ - r), dzr = (c.maxZ + r) - pz;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) player.pos.x = c.minX - r;
      else if (m === dxr) player.pos.x = c.maxX + r;
      else if (m === dzl) player.pos.z = c.minZ - r;
      else player.pos.z = c.maxZ + r;
    }
  }
}

// ---------- camera rig ----------
let camIndex = 0;
const camsEl = document.getElementById('cams');
function rebuildCamButtons() {
  camsEl.innerHTML = '';
  SCENE.cameras.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1} ${c.name}`;
    b.id = `cam-${i}`;
    b.onclick = () => setCam(i);
    camsEl.appendChild(b);
  });
  [...camsEl.children].forEach((b, j) => b.classList.toggle('active', j === camIndex));
}
function setCam(i) {
  camIndex = i;
  [...camsEl.children].forEach((b, j) => b.classList.toggle('active', j === i));
}
rebuildCamButtons();

const tmpV = new THREE.Vector3();
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

function updateCamera(dt) {
  const spec = SCENE.cameras[camIndex];
  if (spec.type === 'player') {
    if (player.third) {
      const bx = player.pos.x + Math.sin(player.yaw) * 3.1;
      const bz = player.pos.z + Math.cos(player.yaw) * 3.1;
      camera.position.set(damp(camera.position.x, bx, 8, dt), damp(camera.position.y, player.pos.y + 1.1, 8, dt), damp(camera.position.z, bz, 8, dt));
      camera.quaternion.setFromEuler(new THREE.Euler(player.pitch - 0.28, player.yaw, 0, 'YXZ'));
    } else {
      camera.position.copy(player.pos);
      camera.quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
    }
    return;
  }
  if (spec.type === 'static') {
    camera.position.set(...spec.position);
    camera.lookAt(tmpV.set(...spec.lookAt));
    return;
  }
  if (spec.type === 'track') {
    const a = actors[spec.target];
    const p = a.group.position;
    tmpV.set(p.x + spec.offset[0], p.y + spec.offset[1], p.z + spec.offset[2]);
    camera.position.set(damp(camera.position.x, tmpV.x, 5, dt), damp(camera.position.y, tmpV.y, 5, dt), damp(camera.position.z, tmpV.z, 5, dt));
    camera.lookAt(p.x, p.y + 1.5, p.z);
  }
}

// ---------- right-click menu, toast, ground picking ----------
const ctxmenu = document.getElementById('ctxmenu');
const toast = document.getElementById('toast');
let ctxPoint = null, toastTimer = null;

function hint(msg) {
  toast.textContent = msg;
  toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.style.opacity = 0, 2600);
}

function refreshJson() {
  document.querySelector('#scenejson pre').textContent = JSON.stringify(SCENE, null, 1);
}

function groundPoint(cx, cy) {
  const p = surfacePoint(cx, cy);
  return p && !p.onWall ? { x: p.x, z: p.z } : null;
}

// raycast any surface (ground, walls, props); returns point + world normal
const surfRay = new THREE.Raycaster();
surfRay.params.Points = { threshold: 0 };
function surfacePoint(cx, cy) {
  surfRay.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
  const ignore = drag?.rec?.group;
  const hits = surfRay.intersectObjects(scene.children.filter(o => o !== ignore && o !== rain), true);
  for (const h of hits) {
    if (!h.face) continue;
    if (h.object.userData.propId != null || h.object.userData.camIdx != null || h.object.userData.actor) continue;  // don't stack on props/cams/actors
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z) < 0.5) continue;
    return { x: h.point.x, y: h.point.y, z: h.point.z, normal: [n.x, n.y, n.z], onWall: Math.abs(n.y) < 0.5 };
  }
  return null;
}

// ---------- picking, ghost drag, placement, selection ----------
const raycaster = new THREE.Raycaster();
const camRegs = [];

function pickAt(cx, cy) {
  raycaster.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
  const hits = raycaster.intersectObjects([...props.map(p => p.group), ...camRegs.map(c => c.gizmo)], true);
  if (!hits.length) return null;
  const u = hits[0].object.userData;
  if (u.propId != null) return { prop: props.find(p => p.id === u.propId) };
  if (u.camIdx != null) return { cam: camRegs[u.camIdx] };
  return null;
}

// mode: null = normal, 'sel' = cyan highlight, 'bad' = red ghost
function setTint(rec, mode) {
  rec.group.traverse(o => {
    if (!o.isMesh || !o.material.emissive) return;
    const m = o.material;
    if (!m.userData.orig) m.userData.orig = { e: m.emissive.getHex(), i: m.emissiveIntensity };
    if (mode === 'bad') { m.emissive.setHex(0xff2233); m.emissiveIntensity = 1.4; }
    else if (mode === 'sel') {
      if (m.userData.orig.e !== 0) { m.emissive.setHex(m.userData.orig.e); m.emissiveIntensity = m.userData.orig.i * 1.5; }
      else { m.emissive.setHex(0x35e0ff); m.emissiveIntensity = 0.5; }
    }
    else { m.emissive.setHex(m.userData.orig.e); m.emissiveIntensity = m.userData.orig.i; }
  });
}

function select(rec) {
  if (selected && selected !== rec) setTint(selected, null);
  selected = rec;
  if (rec) {
    setTint(rec, 'sel');
    hint(`${rec.spec.type} selected — Q/E rotate · scroll raise/lower · Del remove`);
  }
}

function rotateProp(rec, delta) {
  rec.rotY += delta;
  rec.group.rotation.y = rec.baseRotY + rec.rotY;
  updateSpec(rec);
  refreshJson();
  revalidate(rec);
}

function elevateProp(rec, dy) {
  rec.elev = Math.max(0, Math.min(9, rec.elev + dy));
  rec.group.position.y = rec.elev;
  updateSpec(rec);
  refreshJson();
  revalidate(rec);
}

function revalidate(rec) {
  if (!drag || drag.rec !== rec) return;
  const [w, d] = rotatedFootprint(rec);
  const ok = validAt(drag.pos[0], drag.pos[1], w, d, rec.elev, PROP_HEIGHTS[rec.spec.type] ?? 0.7, rec.colliders);
  drag.valid = ok;
  setTint(rec, ok ? 'sel' : 'bad');
  window.__ghost = { valid: ok, x: drag.pos[0], z: drag.pos[1], elev: rec.elev, rotY: rec.rotY };
}

function moveGhost(e) {
  const rec = drag.rec;
  drag.lastMouse = [e.clientX, e.clientY];
  if (drag.kind === 'cam') {
    const pt = surfacePoint(e.clientX, e.clientY) ?? groundPoint(e.clientX, e.clientY);
    if (!pt) return;
    if (pt.onWall) {
      rec.gizmo.position.set(pt.x + pt.normal[0] * 0.3, pt.y, pt.z + pt.normal[2] * 0.3);
      rec.gizmo.lookAt(pt.x + pt.normal[0] * 5, pt.y, pt.z + pt.normal[2] * 5);
      drag.pos = [pt.x, pt.z, pt.y, pt.normal];
    } else {
      const x = Math.max(-4, Math.min(4, pt.x)), z = Math.max(-38.5, Math.min(7, pt.z));
      rec.gizmo.position.set(x, 1.6, z);
      rec.gizmo.lookAt(0, 1.2, -16);
      drag.pos = [x, z];
    }
    return;
  }
  if (rec.spec.wall) {
    // wall-mounted prop: stick to whatever vertical surface is under the cursor
    const pt = surfacePoint(e.clientX, e.clientY);
    if (!pt || !pt.onWall) return;
    rec.group.position.set(pt.x + pt.normal[0] * 0.08, pt.y, pt.z + pt.normal[2] * 0.08);
    rec.baseRotY = Math.atan2(pt.normal[0], pt.normal[2]);
    rec.group.rotation.y = rec.baseRotY + rec.rotY;
    drag.pos = [pt.x, pt.z];
    drag.valid = true;
    setTint(rec, 'sel');
    window.__ghost = { valid: true, x: pt.x, z: pt.z, elev: pt.y, wall: true };
    return;
  }
  const pt = groundPoint(e.clientX, e.clientY);
  if (!pt) return;
  const [w, d] = rotatedFootprint(rec);
  const [sx, sz] = snapOn ? snapPos(pt.x, pt.z, w, d, rec.colliders) : [pt.x, pt.z];
  rec.group.position.x = sx;
  rec.group.position.z = sz;
  drag.pos = [sx, sz];
  revalidate(rec);
}

function finishDrag() {
  const rec = drag.rec;
  if (drag.kind === 'prop') {
    if (!drag.valid) {
      rec.group.position.x = drag.start[0];
      rec.group.position.z = drag.start[1];
      rec.elev = drag.startElev;
      rec.group.position.y = rec.elev;
      rec.rotY = drag.startRot;
      rec.group.rotation.y = rec.baseRotY + rec.rotY;
      hint("can't place it there — snapped back");
    }
    setCollidersAt(rec);
    updateSpec(rec);
    setTint(rec, rec === selected ? 'sel' : null);
  } else if (drag.kind === 'cam') {
    rec.spec.position[0] = drag.pos[0];
    rec.spec.position[2] = drag.pos[1];
  }
  refreshJson();
  renderer.domElement.style.cursor = 'crosshair';
  drag = null;
  window.__ghost = null;
}

function startPlacement(type) {
  const onWall = ctxPoint.onWall && type === 'neonSign';
  const spec = { type, position: [ctxPoint.x, onWall ? ctxPoint.y : 0, ctxPoint.z], ...PROP_DEFAULTS[type] };
  if (type === 'neonSign') {
    if (onWall) { spec.wall = true; spec.normal = ctxPoint.normal; }
    else { spec.position[1] = 2.6; spec.facing = player.pos.x < ctxPoint.x ? 'right' : 'left'; }
  }
  const rec = addProp(spec);
  SCENE.environment.props.push(spec);
  select(rec);
  drag = { kind: 'prop', rec, pos: [spec.position[0], spec.position[2]], start: null, startElev: rec.elev, startRot: 0, valid: true, placing: true, lastMouse: null };
  hint(`placing ${type} — click to drop · Q/E rotate · scroll height · Esc cancel`);
  refreshJson();
}

function commitPlacement() {
  const rec = drag.rec;
  setCollidersAt(rec);
  updateSpec(rec);
  refreshJson();
  drag = null;
  window.__ghost = null;
  hint(`placed ${rec.spec.type}`);
}

function cancelPlacement() {
  const rec = drag.rec;
  removeProp(rec);
  refreshJson();
  drag = null;
  window.__ghost = null;
  hint('cancelled');
}

let addedCams = 0;
function addCamera(x, z) {
  addedCams++;
  const name = `Cam ${addedCams}`;
  const onWall = !!ctxPoint?.onWall;
  const y = onWall ? ctxPoint.y : 1.6;
  const lookAt = onWall
    ? [x + ctxPoint.normal[0] * 6, y, z + ctxPoint.normal[2] * 6]
    : [0, 1.2, -16];
  const spec = { name, type: 'static', position: [x, y, z], lookAt };
  SCENE.cameras.push(spec);
  const gizmo = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.15, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x222630, emissive: 0x35e0ff, emissiveIntensity: 0.6 })
  );
  const lens = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x11141a, emissive: 0x35e0ff, emissiveIntensity: 0.9 })
  );
  lens.rotation.x = -Math.PI / 2;
  lens.position.z = -0.26;
  gizmo.add(body, lens);
  gizmo.position.set(x, y, z);
  gizmo.lookAt(...lookAt);
  const camIdx = camRegs.length;
  gizmo.traverse(o => o.userData.camIdx = camIdx);
  scene.add(gizmo);
  camRegs.push({ spec, gizmo });
  rebuildCamButtons();
  refreshJson();
  hint(`added ${name} — press ${SCENE.cameras.length} to look through it · drag it to move`);
}

// ---------- mouse wiring: build-mode controls ----------
// left = select/move/drop · right-drag = look (like a game) · middle-click = add menu
const cv = renderer.domElement;
function openMenuAt(cx, cy) {
  ctxPoint = surfacePoint(cx, cy);
  if (!ctxPoint) return;
  // walls offer wall-appropriate items only
  ctxmenu.querySelectorAll('[data-act]').forEach(el => {
    el.style.display = ctxPoint.onWall && el.dataset.act !== 'camera' && el.dataset.act !== 'neonSign' ? 'none' : '';
  });
  ctxmenu.style.left = cx + 'px';
  ctxmenu.style.top = cy + 'px';
  ctxmenu.style.display = 'block';
}
cv.addEventListener('mousedown', e => {
  if (e.button === 1) {  // middle: placement menu
    e.preventDefault();
    if (!drag?.placing) openMenuAt(e.clientX, e.clientY);
    return;
  }
  if (e.button === 2) {  // right: look
    look = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.button !== 0) return;
  if (drag?.placing) {
    if (drag.valid) commitPlacement();
    else hint("red means it won't fit there");
    return;
  }
  const hit = pickAt(e.clientX, e.clientY);
  if (hit?.prop) {
    select(hit.prop);
    drag = { kind: 'prop', rec: hit.prop, pos: [hit.prop.group.position.x, hit.prop.group.position.z],
             start: [hit.prop.group.position.x, hit.prop.group.position.z],
             startElev: hit.prop.elev, startRot: hit.prop.rotY, valid: true, placing: false, lastMouse: [e.clientX, e.clientY] };
    cv.style.cursor = 'grabbing';
  } else if (hit?.cam) {
    select(null);
    drag = { kind: 'cam', rec: hit.cam, pos: [hit.cam.spec.position[0], hit.cam.spec.position[2]], valid: true, placing: false };
    cv.style.cursor = 'grabbing';
  } else {
    select(null);
    look = { x: e.clientX, y: e.clientY };
  }
});
addEventListener('mousemove', e => {
  if (look) {
    player.yaw -= (e.clientX - look.x) * 0.0042;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - (e.clientY - look.y) * 0.0042));
    look = { x: e.clientX, y: e.clientY };
  } else if (drag) {
    moveGhost(e);
  }
});
addEventListener('mouseup', e => {
  if (e.button === 2) { look = null; return; }
  if (e.button !== 0) return;
  if (look) { look = null; return; }
  if (drag && !drag.placing) finishDrag();
});
addEventListener('wheel', e => {
  const rec = drag?.kind === 'prop' ? drag.rec : selected;
  if (!rec) return;
  e.preventDefault();
  elevateProp(rec, -Math.sign(e.deltaY) * 0.12);
}, { passive: false });
cv.addEventListener('contextmenu', e => {
  e.preventDefault();  // right button is camera-look, not a menu
  if (drag?.placing) cancelPlacement();
});
document.addEventListener('click', e => { if (!ctxmenu.contains(e.target)) ctxmenu.style.display = 'none'; });
ctxmenu.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  ctxmenu.style.display = 'none';
  if (el.dataset.act === 'camera') addCamera(ctxPoint.x, ctxPoint.z);
  else startPlacement(el.dataset.act);
});

// ---------- take recorder ----------
const takesEl = document.getElementById('takes');
const recBtn = document.getElementById('rec');
const recTime = document.getElementById('rectime');
const playback = document.getElementById('playback');
window.__takes = [];
let recorder = null, chunks = [], recStart = 0, recTimer = null, takeN = 0;

function toggleRec() {
  if (recorder) { recorder.stop(); return; }
  const stream = renderer.domElement.captureStream(60);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const secs = ((performance.now() - recStart) / 1000).toFixed(1);
    const cam = SCENE.cameras[camIndex].name;
    takeN++;
    window.__takes.push({ take: takeN, cam, secs, bytes: blob.size });
    const a = document.createElement('a');
    a.textContent = `take ${takeN} · ${cam} · ${secs}s · ${(blob.size / 1e6).toFixed(1)}MB`;
    a.href = url; a.download = `take-${takeN}-${cam}.webm`;
    a.onclick = e => { e.preventDefault(); playback.src = url; playback.style.display = 'block'; playback.play(); };
    takesEl.appendChild(a);
    recorder = null;
    recBtn.classList.remove('on'); recBtn.textContent = '● REC';
    recTime.textContent = '';
    clearInterval(recTimer);
  };
  recorder.start(250);
  recStart = performance.now();
  recBtn.classList.add('on'); recBtn.textContent = '■ STOP';
  recTimer = setInterval(() => recTime.textContent = ((performance.now() - recStart) / 1000).toFixed(1) + 's', 100);
}
recBtn.onclick = toggleRec;

// ---------- scene.json panel ----------
refreshJson();
window.__scene = SCENE;
window.__colliders = colliders;
window.__ghost = null;
window.__player = player;
window.__dragState = () => drag && { kind: drag.kind, placing: drag.placing, valid: drag.valid };
window.__surfacePoint = surfacePoint;
window.__project = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return [(v.x + 1) / 2 * innerWidth, (-v.y + 1) / 2 * innerHeight];
};

// ---------- loop ----------
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  movePlayer(dt);
  for (const name in actors) {
    const a = actors[name];
    const path = a.spec.path;
    const cur = a.group.position;
    const tgt = path[a.wp];
    const dx = tgt[0] - cur.x, dz = tgt[2] - cur.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) { a.wp = (a.wp + 1) % path.length; continue; }
    let mx = (dx / d) * a.spec.speed * dt;
    let mz = (dz / d) * a.spec.speed * dt;
    const r = 0.32;
    const blockedAt = (x, z) => colliders.some(c => c.y <= 1.2 && x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
    if (blockedAt(cur.x + mx, cur.z + mz)) {
      let clear = false;
      for (const ang of [0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) {
        const rx = mx * Math.cos(ang) - mz * Math.sin(ang);
        const rz = mx * Math.sin(ang) + mz * Math.cos(ang);
        if (!blockedAt(cur.x + rx, cur.z + rz)) { mx = rx; mz = rz; clear = true; break; }
      }
      if (!clear) { a.wp = (a.wp + 1) % path.length; continue; }
    }
    cur.x += mx;
    cur.z += mz;
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - a.group.rotation.y;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    a.group.rotation.y += dy * Math.min(1, dt * 8);
    a.phase += dt * 7;
    a.group.children[0].position.y = 0.98 + Math.abs(Math.sin(a.phase)) * 0.05;
    a.group.children[1].position.y = 1.78 + Math.abs(Math.sin(a.phase)) * 0.05;
    a.group.rotation.z = Math.sin(a.phase) * 0.03;
  }
  for (const f of flickering) {
    f.t -= dt;
    if (f.t <= 0) {
      const dip = Math.random() < 0.22;
      f.light.intensity = dip ? f.base * (0.15 + Math.random() * 0.3) : f.base;
      f.mat.emissiveIntensity = dip ? 0.4 : 2.2;
      f.t = dip ? 0.06 + Math.random() * 0.12 : 0.8 + Math.random() * 3.5;
    }
  }
  if (rain) rain.update(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
