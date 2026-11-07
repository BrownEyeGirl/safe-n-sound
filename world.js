import * as THREE from 'three';
import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { hillColors } from './style/colors.js'


const SEED = 69; // seed for snowdrifts

// --- Perlin noise (2D) ---

// Gives each grid corner a repeatable "random" direction (an angle)
function cornerAngle(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7 + SEED) ;
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

/* Height at any world position */
const MAX_HEIGHT = 50;   // height of the tallest mountains
const FIELD_RADIUS = 6000; // distance from the center where the ground becomes totally flat

const PEAK_HEIGHT = 200; // how tall the central peak is, on top of the other mountains
const PEAK_RADIUS = 200; // how wide its base is

const FLAT_TOP = 150; // the peak's height; anything higher gets sliced flat
const PLATEAU_HEIGHT = 150; // height of the flat summit
const PLATEAU_RADIUS = 100;  // flat summit area
const SLOPE_WIDTH = 500;     // how far the slopes stretch before meeting the normal terrain
const CRATER_RADIUS = 60;   // outer edge of the indent
const CRATER_EDGE = 10;      // how wide the sloped crater wall is
const CRATER_DEPTH = -5;    // how far the floor sits below the summit

// 0 below a, 1 above b, smooth in between
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const n = (perlin(x * 0.01, z * 0.02) + 0.05 * perlin(x * 0.01, z * 0.03)) * 0.5;
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


function createPeaks(x,z) {

}


/* Hills/Snowdrifts mesh */
export function createHills(size = 5000, segments = 500) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2); // lay it flat so y is up

    const low = new THREE.Color(hillColors[0]);  // field and valleys
    const mid = new THREE.Color(hillColors[1]);  //hillsides
    const high = new THREE.Color(hillColors[2]); // peaks)
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

    // ...existing t and color blend code that makes `c`...
    const grain = 1 + perlin(x * 0.9, z * 0.1); 
    c.multiplyScalar(grain);                            // lighten or darken this vertex
  
    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals(); // so lighting looks right

  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true})); // vertexColors: true }));
}

export function createMap(scene) {
    // 1. Create the geometry (width, height, widthSegments, heightSegments)
    const geometry = new THREE.PlaneGeometry(5000, 5000);

    // 2. Create a material (DoubleSide allows it to be seen from the back)
    const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    side: THREE.DoubleSide, 
    });

    // 3. Combine into a mesh
    const planeMesh = new THREE.Mesh(geometry, material);

    // 4. By default, planes are vertical (facing the Z-axis). 
    // To make it a horizontal floor, rotate it 90 degrees around the X-axis:
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.y=0
    scene.add(planeMesh)
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

      items.add(flower);
    }
   
  }
  }); 
  return items;

}

/* Wall of buildings pngs */
export function generateWalls() { // source, derived: https://discourse.threejs.org/t/whats-the-latest-way-to-load-an-image/44246 
  const images = ['media/buildings_imgs/wall1.jpg', 'media/buildings_imgs/wall1.jpg', 'media/buildings_imgs/wall1.jpg', 'media/buildings_imgs/wall1.jpg'];  
  const loader = new THREE.TextureLoader(); // initialize texture 
  const walls = new THREE.Group();
  let texture, geometryImg, materialImg, wall;

  // circle parameters
  const radius = 3000;  
  const count = 20; // Number of images to place around the circle
  const width = 2 * radius * Math.tan(Math.PI / count); // in radians, so tan(pi/count) = centre of image (opp = width/2) / radius of circle (adj), so width = 2 * r * tan(pi/count)

  // Loop through a full circle
  for (let i = 0; i < count; i++) {
      const radians = i/count * Math.PI *2;  // Convert degrees to radians

      // 5. Create and position your Three.js object
      texture = loader.load(images[0]);
      geometryImg = new THREE.PlaneGeometry(width, width); // Width, Height. will be the same as each increment to fil the gaps 

      // Create a material and pass the texture to the 'map' property
      materialImg = new THREE.MeshBasicMaterial({ 
          map: texture,
          side: THREE.DoubleSide // Makes the image visible from both sides
      });

      wall = new THREE.Mesh(geometryImg, materialImg);
      
      // Calculate X and Z positions (for a horizontal circle on the XZ plane)
      const x = radius * Math.cos(radians);
      const z = radius * Math.sin(radians);
      const y =  0+width;//heightAt(x,z); // change based on where bumps are

      // Apply the coordinates
      wall.position.set(x, y, z);
      
      // rotate the object to face the center of the circle
      wall.lookAt(0, y, 0);
      walls.add(wall); 
    
  }
    // return array of wall material segments and their positions 
      return walls; 
}




