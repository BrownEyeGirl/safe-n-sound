import * as THREE from 'three';
import { heightAt } from './world.js';

const MOVE_SPEED = 50;       // units per second
const MOUSE_SENSITIVITY = 0.002;
const CAMERA_HEIGHT = 10;    // how far above the player the camera sits
const CAMERA_BEHIND = 15;    // how far behind the player the camera sits ("x")

// Input: which keys are currently held down
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault(); // stop the page from scrolling
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Create the player and attach the camera to it 
export function createPlayer(scene, camera, domElement = document.body) {
  const player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  player.position.set(0, 0, 380); // start in the flat field, facing the mountains
  scene.add(player);

  // Camera is a child of the player: it sits above and behind (+Z is behind),
  // and tilts down by exactly the angle needed to look at the player.
  player.add(camera);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_BEHIND);
  camera.rotation.x = -Math.atan2(CAMERA_HEIGHT, CAMERA_BEHIND);

  // Click the game to capture the mouse (press Esc to release it)
  domElement.addEventListener('click', () => domElement.requestPointerLock());

  // Mouse movement left/right turns the player
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === domElement) {
      player.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
    }
  });

  return player;
}

// Move the player. Call every frame; dt = seconds since last frame 
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export function updatePlayer(player, dt) {
  // Direction the player is facing, and the direction to their right
  forward.set(0, 0, -1).applyAxisAngle(up, player.rotation.y);
  right.crossVectors(forward, up);

  // Add up whichever arrow keys are held
  move.set(0, 0, 0);
  if (keys['ArrowUp'])    move.add(forward);
  if (keys['ArrowDown'])  move.sub(forward);
  if (keys['ArrowRight']) move.add(right);
  if (keys['ArrowLeft'])  move.sub(right);

  // Normalize so diagonals aren't faster, then move
  if (move.lengthSq() > 0) {
    move.normalize();
    player.position.addScaledVector(move, MOVE_SPEED * dt);
  }

  // Stick to the terrain (+1 because the box is 2 tall and centered)
  player.position.y = heightAt(player.position.x, player.position.z) + 1;
}