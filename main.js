import * as THREE from "https://unpkg.com/three@0.182.0/build/three.module.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'https://unpkg.com/three@0.182.0/examples/jsm/objects/Water.js';
import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise";
import { BokehPass } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from 'https://unpkg.com/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three/examples/jsm/postprocessing/RenderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // for sky

import { heightAt } from './world.js'; // imports the hightAt function, gets Z at specific x,y
import { createHills, createMap } from './world.js';
import { createPlayer, updatePlayer } from './player.js';


let scene, renderer, controls, camera, player;
const clock = new THREE.Clock();

  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000)
  //scene.fog = new THREE.Fog(0x000000, 80, 400); // new fog, darker, shorter range


// to see, ambient light 
const light = new THREE.AmbientLight( 0xffffff, 1 ); // soft white light
light.distance = 10000; // size of perlin noise snowdrift map 
scene.add( light );

// Create a plane geometry: width = 10, height = 10
const geometry = new THREE.PlaneGeometry(10, 10);

// Apply a basic material
const material = new THREE.MeshBasicMaterial({ 
    color: 0x74AAA3, 
    side: THREE.DoubleSide // Visible from both front and back
});

// Combine into a mesh and add to the scene
const planeMesh = new THREE.Mesh(geometry, material);
planeMesh.rotation.x = Math.PI / 2;  // Rotate 90 degrees around the X-axis (makes the plane horizontal like a floor)
planeMesh.y=0
scene.add(planeMesh);

scene.add(createHills());
scene.add(createMap()); 

  /* Renderer */
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.NoToneMapping; // try to make corners invisible
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  let birdsEyeView = false; // toggle for birds eye view camera
  let flowers = []; // list of flowers to be generated

  /* Birds eye view camera for map */
  if(birdsEyeView) {
    // 0. Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    // 1. Create a PerspectiveCamera or OrthographicCamera
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(150, width / height, 1, 20000); // camera to make map 
    // 2. Position high up on the Y-axis looking straight down
    camera.position.set(0, 1000, 0); // X, Y (height), Z

    // 3. Point the camera at the center of the scene (or use lookAt)
    camera.lookAt(0, 0, 0);
  }

  if(!birdsEyeView) {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    player = createPlayer(scene, camera);
    generatePlants("media/pine_tree_low-poly/scene.gltf"); // generate trees
  }

  //  Controls 
  /*controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false; // keeps it like a head-turning camera
  window.addEventListener("resize", onWindowResize);*/

  // EFFECT COMPOSER 
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  /*
    const bokeh = new BokehPass(scene, camera, {
      focus: 50.0,        // distance where image is sharp
      aperture: 0.0001,  // blur strength (smaller = subtle blur)
      maxblur: 0.01      // max blur allowed
    });
    composer.addPass(bokeh); */
    

  const skyLoader = new THREE.TextureLoader();

  // load background 
  /*skyLoader.load('sky.jpeg', function (texture) {
      scene.background = texture;
  });*/


const loader = new GLTFLoader();
//let dumpster = loadGLTF("dumpster_reduced_size.glb"); 



animate()
function animate() {

  if(!birdsEyeView) {updatePlayer(player, clock.getDelta());} // move the camera based on held keys

  requestAnimationFrame(animate);

// camera
  /*if(camera.position.z<75) {
    camera.position.z += 0.05; // increase slowly → zoom out
    camera.position.x +=0.01
  }
*/
//  controls.update(); // important
  composer.render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadGLTF(path) {
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


function generatePlants(model) { // make list flowers = [] in main
  const noise2D = createNoise2D(); // generate the perlin noise

  const loader = new GLTFLoader(); // loader for all of the gltf files 

  const parentGroup = new THREE.Group();
  scene.add(parentGroup);

  loader.load(model, function(gltf) {

  const baseFlower = gltf.scene;
  parentGroup.add(baseFlower);
    //baseFlower.scale.set(10,10,10); // scale the flower model
    parentGroup.scale.set(1,1,1); 

  const radius = 2000;
  const half = radius / 2;

  // increase this for density
  const count = 200;

  for (let i = 0; i < count; i++) {

    // square distribution
    const x = (Math.random() - 0.5) * radius;
    const y = (Math.random() - 0.5) * radius;

    // noise filter (controls clustering)
    const n = noise2D(x * 0.03, y * 0.03);

    if (n > 0.1) { // lower threshold = more flowers, dont generate if on the car
      const flower = baseFlower.clone(true); // 

      flower.position.set(x, heightAt(x,y), y);

      // variation (makes it look natural)
      //const s = 15 + Math.random() * 10;
      //flower.scale.set(s, s, s);

      flower.rotation.y = Math.random() * Math.PI * 2;

      scene.add(flower);
      flowers.push(flower);
    }
  }
  }); 

}
