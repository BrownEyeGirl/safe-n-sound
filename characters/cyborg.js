

import * as THREE from 'three';
import { heightAt } from '../world.js'; // imports the hightAt function, gets Z at specific x,y

const MOVE_SPEED = 50;       // units per second
const MOUSE_SENSITIVITY = 0.002;
const CAMERA_HEIGHT = 9;    // how far above the cyborg the camera sits (on flat ground)
const CAMERA_BEHIND = 20;    // how far behind the cyborg the camera sits ("x")
const CAMERA_SLOPE_EFFECT = 6; // how much the camera height changes on steep slopes
const CAMERA_SMOOTHING = 4;    // higher = camera reacts faster to slope changes

export let cyborgHeight = 120; 
export let cyborgWidth = 80; 

// Input: which keys are currently held down
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault(); // stop the page from scrolling
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Create the cyborg and attach the camera to it 
export function createCyborg(scene, camera, domElement = document.body) {
  const cyborg = new THREE.Mesh(
    new THREE.BoxGeometry(cyborgWidth, cyborgHeight, cyborgWidth),
    new THREE.MeshBasicMaterial({ color: 0x0000FF })
  );
  cyborg.position.set(0, 0, 0); 
  cyborg.position.y = heightAt(cyborg.position.x, cyborg.position.z)// + cyborgHeight/2; // start on the ground
  scene.add(cyborg);  

  /*
  const pivot = new THREE.Object3D(); // pivot point for the camera to orbit around
  pivot.position.set(0, 5, 0);   // the point the camera orbits, 3 above the cyborg
  cyborg.add(pivot);
  pivot.add(camera);
  camera.position.set(0, 0, 10); // orbit radius
  let pitch = -0.5;
  pivot.rotation.x = pitch;
  //camera.rotation.x = -Math.atan2(CAMERA_HEIGHT, CAMERA_BEHIND);

  // Click the game to capture the mouse (press Esc to release it)
  domElement.addEventListener('click', () => domElement.requestPointerLock());

  // Mouse movement left/right turns the cyborg
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === domElement) {
      cyborg.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = Math.max(-1.2, Math.min(0.13, pitch)); // 0.13 stops the camera before it reaches the cyborg's level
      pivot.rotation.x = pitch;
    }
  });*/
  return cyborg;
}

// Move the cyborg. Call every frame; dt = seconds since last frame 
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export function updateCyborg(cyborg, dt) {

  // Direction the cyborg is facing, and the direction to their right
  forward.set(0, 0, -1).applyAxisAngle(up, cyborg.rotation.y);
  right.crossVectors(forward, up);

  // Add up whichever arrow keys are held
  move.set(0, 0, 0);
  if (keys['ArrowUp'])    move.add(forward);
  if (keys['ArrowDown'])  move.sub(forward);
  if (keys['ArrowRight']) move.add(right);
  if (keys['ArrowLeft'])  move.sub(right);

  // Normalize so diagonals aren't faster, then move
  let distance = 0;                 // how far cyborg moved this frame
  if (move.lengthSq() > 0) {
    move.normalize();
    distance = MOVE_SPEED * dt;
    cyborg.position.addScaledVector(move, distance);
  } 

    cyborg.position.y = heightAt(cyborg.position.x, cyborg.position.z) + 5;

}

export function attachPanningToCyborg() {
  
}