import * as THREE from 'three';

const SPEED = 50; // how fast the camera moves, in units per second
const MOUSE_SENSITIVITY = 0.002;
const move = new THREE.Vector3(); // next to your forward/right/up vectors

// --- Input: tracks which keys are currently held down ---
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault(); // stop the page from scrolling
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Camera movement 
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


export function attachCamera(mounted, camera, target, domElement = document.body, options = {}) {
  let { pitchMin = 0.5, pivotHeight = 7, radius = 10, startPitch = 0.5 } = options;

  const pivot = new THREE.Object3D();
  pivot.position.set(0, pivotHeight, 0);
  target.add(pivot);
  pivot.add(camera);
  camera.position.set(0, 0, radius);
  camera.rotation.set(0, 0, 0);
  let pitch = startPitch;
  pivot.rotation.x = pitch;

  const onClick = () => domElement.requestPointerLock();
  const onMouseMove = (e) => {
    if (document.pointerLockElement === domElement) {
      target.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = Math.max(-1.2, Math.min(pitchMin, pitch));
      pivot.rotation.x = pitch;
    }
  };
  domElement.addEventListener('click', onClick);
  document.addEventListener('mousemove', onMouseMove);
  
  function detach() {
    domElement.removeEventListener('click', onClick);
    document.removeEventListener('mousemove', onMouseMove);
    pivot.remove(camera);
    target.remove(pivot);
  }
  return { pivot, detach };
}


/* move the meshes */
export function moveMesh(mesh, dt, speed = SPEED) { 
  forward.set(0, 0, -1).applyAxisAngle(up, mesh.rotation.y);
  right.crossVectors(forward, up);

  move.set(0, 0, 0);
  if (keys['ArrowUp'])    move.add(forward);
  if (keys['ArrowDown'])  move.sub(forward);
  if (keys['ArrowRight']) move.add(right);
  if (keys['ArrowLeft'])  move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize();
    mesh.position.addScaledVector(move, speed * dt);
  }

  return move; 
}

export function setPivotHeight(y) {

}