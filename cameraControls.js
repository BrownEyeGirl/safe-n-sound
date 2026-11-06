import * as THREE from 'three';

const SPEED = 50; // how fast the camera moves, in units per second

// --- Input: tracks which keys are currently held down ---
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault(); // stop the page from scrolling
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// --- Camera movement ---
const forward = new THREE.Vector3(); // direction the camera is facing (flattened)
const right = new THREE.Vector3();   // direction to the camera's right
const up = new THREE.Vector3(0, 1, 0);

// Call this every frame. dt = seconds since the last frame.
export function updateCamera(camera, dt) {
  camera.getWorldDirection(forward); // where the camera is looking
  forward.y = 0;                     // ignore up/down so we stay level
  forward.normalize();
  right.crossVectors(forward, up);   // sideways direction

  const step = SPEED * dt; // distance to move this frame (same speed on any frame rate)

  if (keys['ArrowUp'])    camera.position.addScaledVector(forward, step);
  if (keys['ArrowDown'])  camera.position.addScaledVector(forward, -step);
  if (keys['ArrowRight']) camera.position.addScaledVector(right, step);
  if (keys['ArrowLeft'])  camera.position.addScaledVector(right, -step);
}