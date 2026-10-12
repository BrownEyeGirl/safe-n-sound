import * as THREE from 'three';

const SEED = 69; // change this number for a new landscape (same number = same hills)

// --- Perlin noise (2D) ---

// Gives each grid corner a repeatable "random" direction (an angle)
function cornerAngle(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7 + SEED) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

// How much the point (x, y) lines up with the direction at corner (i, j)
function corner(i, j, x, y) {
  const a = cornerAngle(i, j);
  return Math.cos(a) * (x - i) + Math.sin(a) * (y - j);
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smooths 0-1 so there are no hard edges
const lerp = (t, a, b) => a + t * (b - a);               // blend from a to b

function perlin(x, y) {
  const i = Math.floor(x), j = Math.floor(y);  // which grid cell we're in
  const u = fade(x - i), v = fade(y - j);      // where inside the cell (smoothed)

  // Blend the four corners: along x twice, then along y
  return lerp(v,
    lerp(u, corner(i, j, x, y),     corner(i + 1, j, x, y)),
    lerp(u, corner(i, j + 1, x, y), corner(i + 1, j + 1, x, y)));
}

// --- Height at any world position ---
const MAX_HEIGHT = 50;   // height of the tallest mountains
const FIELD_RADIUS = 1500; // distance from the center where the ground becomes totally flat

const PEAK_HEIGHT = 120; // how tall the central peak is, on top of the other mountains
const PEAK_RADIUS = 120; // how wide its base is

const FLAT_TOP = 150; // the peak's height; anything higher gets sliced flat
const PLATEAU_HEIGHT = 150; // height of the flat summit
const PLATEAU_RADIUS = 40;  // flat summit area
const SLOPE_WIDTH = 390;     // how far the slopes stretch before meeting the normal terrain
const CRATER_RADIUS = 20;   // outer edge of the indent
const CRATER_EDGE = 6;      // how wide the sloped crater wall is
const CRATER_DEPTH = 10;    // how far the floor sits below the summit

// 0 below a, 1 above b, smooth in between
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const n = (perlin(x * 0.01, z * 0.01) + 0.5 * perlin(x * 0.03, z * 0.03)) * 0.5 + 0.5;
  const dist = Math.hypot(x, z); // distance from the center

  const d = Math.min(1, dist / FIELD_RADIUS);
  const centerBoost = 1 - d * d * (3 - 2 * d);
  const peak = Math.pow(Math.max(0, 1 - dist / PEAK_RADIUS), 2);

  let height = n * centerBoost * MAX_HEIGHT + peak * PEAK_HEIGHT; // the terrain as before

  // 1. Flat summit: blend to exactly PLATEAU_HEIGHT near the center
  const summit = 1 - smooth(PLATEAU_RADIUS, PLATEAU_RADIUS + SLOPE_WIDTH, dist);
  height = height + (PLATEAU_HEIGHT - height) * summit;

  // 2. Crater: blend to a flat floor below the summit
  const crater = 1 - smooth(CRATER_RADIUS - CRATER_EDGE, CRATER_RADIUS, dist);
  height = height + (PLATEAU_HEIGHT - CRATER_DEPTH - height) * crater;

  return height;
}

// --- Hill mesh ---
export function createHills(size = 10000, segments = 1000) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2); // lay it flat so y is up

    const low = new THREE.Color(0x00008B);  // deeper lavender (field and valleys)
    const mid = new THREE.Color(0xD3D3D3);  // mid lavender (hillsides)
    const high = new THREE.Color(0xe9e2fa); // pale lavender (peaks)
  const colors = [];
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const h = heightAt(pos.getX(i), pos.getZ(i)); // height at this vertex
    pos.setY(i, h);                               // move the vertex to that height

     const t = THREE.MathUtils.clamp(h / (MAX_HEIGHT * 0.6), 0, 1); // 0 = low, 1 = high

// First half of the height range blends low to mid, second half blends mid to high
const c = t < 0.5
  ? low.clone().lerp(mid, t * 2)
  : mid.clone().lerp(high, (t - 0.5) * 2);          // blend the three colors
  const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, h);

    // ...your existing t and color blend code that makes `c`...

    const grain = 1 + perlin(x * 0.15, z * 0.15) * 0.2; // about 0.8 to 1.2
    c.multiplyScalar(grain);                            // lighten or darken this vertex
  
    colors.push(c.r, c.g, c.b);
  }

 

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals(); // so lighting looks right

  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true }));
}

// Usage:
//   scene.add(createHills());
//   tree.position.set(x, heightAt(x, z), z);