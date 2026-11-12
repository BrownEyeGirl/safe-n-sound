import * as THREE from 'three';
import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as COLORS from './style/colors.js'


// Perlin noise: three.js addon, based on Ken Perlin's "Improved Noise" (2002).
// Docs:   https://threejs.org/docs/pages/ImprovedNoise.html
// Origin: https://cs.nyu.edu/~perlin/noise/
// Paper:  K. Perlin, "Improving Noise", ACM Trans. Graph. 21(3), 2002, pp. 681-682.
//         https://doi.org/10.1145/566654.566636
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const SEED = 69;           // shifts the noise field, so a new seed gives new hills
const MAX_HEIGHT = 50;     // height of the rolling hills
const FIELD_RADIUS = 6000; // distance from the center where the ground becomes flat

// Large hills: [x, z, height, radius, flat top radius]
const BIG_HILLS = [
  [1200, -800, 150, 2050, 100],
  [-1500, 400, 300, 950, 60],
  [600, 1500, 380, 600, 150],
];

const noise = new ImprovedNoise();

// Noise in roughly -1..1. The z value is a fixed fractional offset: this noise
// returns 0 at whole-number coordinates, so we avoid sampling on the grid.
const perlin = (x, y) => noise.noise(x, y, SEED + 0.5);

// Height added by the big hills at a point
function bigHillsAt(x, z) {
  let sum = 0;
  for (const [hx, hz, h, r, flat] of BIG_HILLS) {
    const dist = Math.hypot(x - hx, z - hz);
    const t = THREE.MathUtils.clamp((dist - flat) / (r - flat), 0, 1); // 0 on the flat top, 1 at the base
    sum += (1 - t) ** 2 * h;
  }
  return sum;
}

// Rolling hills: noise that fades to flat toward FIELD_RADIUS
function hillsAt(x, z) {
  const n = (perlin(x * 0.01, z * 0.02) + 0.05 * perlin(x * 0.01, z * 0.03)) * 0.5;
  const d = Math.min(1, Math.hypot(x, z) / FIELD_RADIUS);
  const centerBoost = 1 - d * d * (3 - 2 * d);
  return n * centerBoost * MAX_HEIGHT;
}

// On big hills the rolling bumps are flattened to 1/5 (no water damage)
function heightFrom(x, z, big) {
  return big + hillsAt(x, z) * (big > 60 ? 0.2 : 1);
}

export const heightAt = (x, z) => heightFrom(x, z, bigHillsAt(x, z));

export function createHills(size = 5000, segments = 1000) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2); // lay it flat so y is up

  const [low, mid, high] = COLORS.hillColors.map((c) => new THREE.Color(c));
  const bigGreen = new THREE.Color(COLORS.hillColors[3]);
  const c = new THREE.Color(); // reused for every vertex

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const big = bigHillsAt(x, z);
    const h = heightFrom(x, z, big);
    pos.setY(i, h);

    // Color by height: low -> mid -> high, then blend toward green on big hills
    const t = THREE.MathUtils.clamp(h / (MAX_HEIGHT * 0.6), 0, 1);
    if (t < 0.5) c.copy(low).lerp(mid, t * 2);
    else c.copy(mid).lerp(high, (t - 0.5) * 2);
    c.lerp(bigGreen, THREE.MathUtils.smoothstep(big, 40, 60));

    c.toArray(colors, i * 3);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true }));
}

export function createMap(scene,x,z, radius ) {

const geometry = new THREE.CircleGeometry(radius, 32);

// 2. Create a material (side: DoubleSide lets you see it from both front and back)
const material = new THREE.MeshPhysicalMaterial({ 
  color: COLORS.swamp,
  roughness: 0.1,       // Lower values make reflections sharper
  metalness: 0.1,       // Gives a slight metallic tint to reflections
  transmission: 0.6,    // Glass-like transparency (0 = opaque, 1 = see-through)
  ior: 1.5,       
  emissive: 0x39FF14,       // The color of the glow
  emissiveIntensity: 1.5,    // Push this above 1.0 to trigger bloom
  side: THREE.DoubleSide });

// 3. Combine them into a mesh and add to your scene
const circle = new THREE.Mesh(geometry, material);
circle.rotation.x = -Math.PI/2; 
circle.position.x = x; 
circle.position.z = z; 
circle.position.y = 0.5; 
scene.add(circle);

}

export function createBase() {
  // 1. Create a square geometry (width = 2, height = 2)
  const geometry = new THREE.PlaneGeometry(20, 20,20);

  // 2. Create a material and set it to render on both sides
  const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0A0A, 
      side: THREE.DoubleSide 
  });

  // 3. Combine them into a mesh
  const square = new THREE.Mesh(geometry, material);

  // 4. Position the square at the desired location (e.g., y = 0)
  square.position.set(0, 0, 0);
  square.position.y = heightAt(square.position.x, square.position.z) + 0.1;

  // 4. Add the square to scene
  return square;
}


/* Mulberry32 PRNG for consistent random numbers (https://www.4rknova.com/blog/2026/03/01/mulberry32-rng) */
export function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        scene.add(gltf.scene);
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}


/* seeded perlin / simplex ? noise generator for plants */ 
export function generatePlants(item) { // 
  const rand = mulberry32(item.seed);
  const noise2D = createNoise2D(rand); // generate the perlin noise
  const loader = new GLTFLoader(); // loader for all of the gltf files 
  const items = new THREE.Group();

  loader.load(item.model, function(gltf) {
  const baseFlower = gltf.scene;
  //items.add(baseFlower);
    //baseFlower.scale.set(10,10,10); // scale the flower model
    items.scale.set(item.scale,item.scale,item.scale); 

  const center = 2000;

  // increase this for density
  for (let i = 0; i < item.count; i++) {

  // square distribution (same every load)
  const x = (rand() - 0.5) * center + 500;
  const z = (rand() - 0.5) * center + 1000;

  // noise filter (controls clustering)
  const n = noise2D(x * 0.001, z * 0.001);

    if (n > 0.1) { // lower threshold = more flowers, dont generate if on the car
      const flower = baseFlower.clone(true); // 
      flower.position.set(x, heightAt(x,z)-100, z);

      // variation (makes it look natural)
      //const s = 15 + Math.random() * 10;
      //flower.scale.set(s, s, s);

      flower.rotation.y = Math.random() * Math.PI * 2;
      flower.castShadow = true; 

      items.add(flower);
    }
   
  }
  }); 
  return items;

}

/* Wall of buildings pngs */
export function generateWalls(cx = 0, cz = 0, radius = 3000, count = 20) {
  const loader = new THREE.TextureLoader();
  const walls = new THREE.Group();

  const width = 2 * radius * Math.tan(Math.PI / count);

  // Load the texture and build the geometry ONCE, then reuse them
  const texture = loader.load('media/buildings_imgs/wall1.jpg');
  const geometryImg = new THREE.PlaneGeometry(width, width);
  const materialImg = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 1,      // fully matte, no shiny highlights
  metalness: 0,      // non-metal
  side: THREE.DoubleSide
});


  for (let i = 0; i < count; i++) {
    const radians = (i / count) * Math.PI * 2;   // angle only, no cx here

    // offset from the circle's center
    const x = cx + radius * Math.cos(radians);
    const z = cz + radius * Math.sin(radians);
    const y = heightAt(x,z)+50;

    const wall = new THREE.Mesh(geometryImg, materialImg);
    wall.position.set(x, y, z);
    wall.lookAt(cx, y, cz);                      // face the NEW center
    walls.add(wall);
  }

  return walls;
}


export function createCloudAt(scene, x, z, y = 50, s) {
  const cloudGroup = new THREE.Group();
  
  // Load a soft, radial cloud PNG texture
  const textureLoader = new THREE.TextureLoader();
  const cloudTexture = textureLoader.load('cloud.png');

  const material = new THREE.SpriteMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false // Prevents ugly square borders overlapping
  });

  // Cluster 5 to 8 puffs together to form one cloud
  const puffCount = 6;
  for (let i = 0; i < puffCount; i++) {
    const sprite = new THREE.Sprite(material);
    
    // Randomize puff offsets around the center of the cloud
    sprite.position.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 15
    );

    
    // Vary puff sizes
    const scale = 15 + Math.random() * 10 *s ;
    
    cloudGroup.add(sprite);
  }

  // Position the entire cloud at your target X and Z
  cloudGroup.position.set(x, y, z);
  return cloudGroup;
  // Usage:

}

