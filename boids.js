
import * as THREE from 'three';
import { heightAt } from './world.js'; // imports the hightAt function, gets Z at specific x,y

/* Flocking algorithm */ 
// flocking code derived from https://natureofcode.com/autonomous-agents/, https://github.com/jackaperkins/boids/blob/master/Boid.pde

const friendRadius = 30;
const crowdRadius = 30;
const coheseRadius = 20;
const avoidRadius = 90;

const maxSpeed = 1.25;

const option_friend = true;
const option_crowd = true;
const option_avoid = true;
const option_noise = true;
const option_cohese = true;


/* BOID CLASS */
class Boid {
  constructor(pos, center, radius) {
    this.pos = pos;
    this.center = center;   // THREE.Vector3
    this.radius = radius;
    this.vel = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );
    this.friends = [];
    this.thinkTimer = Math.floor(Math.random() * 5);
  }

  go(boids, avoids) {
    this.thinkTimer = (this.thinkTimer + 1) % 5;
    this.bounce();

    if (this.thinkTimer === 0) this.getFriends(boids);

    this.flock(avoids);
    this.pos.add(this.vel);
  }

  flock(avoids) {
    const align = this.getAverageDir();
    const avoidDir = this.getAvoidDir();
    const avoidObjs = this.getAvoidAvoids(avoids);
    const cohese = this.getCohesion();
    const noise = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );

    align.multiplyScalar(option_friend ? 0.2 : 0);
    avoidDir.multiplyScalar(option_crowd ? 0.5 : 0);
    avoidObjs.multiplyScalar(option_avoid ? 3 : 0);
    noise.multiplyScalar(option_noise ? 0.1 : 0);
    cohese.multiplyScalar(option_cohese ? 0.2 : 0);

    this.vel.add(align);
    this.vel.add(avoidDir);
    this.vel.add(avoidObjs);
    this.vel.add(noise);
    this.vel.add(cohese);

    if (this.vel.length() > maxSpeed) this.vel.setLength(maxSpeed);

    // gentle pull toward the center point
    this.vel.add(this.center.clone().sub(this.pos).multiplyScalar(0.0002));
  }

  /* FRIENDS */
  getFriends(boids) {
    this.friends = boids.filter(b =>
      b !== this &&
      Math.abs(b.pos.x - this.pos.x) < friendRadius &&
      Math.abs(b.pos.y - this.pos.y) < friendRadius
    );
  }

  /* RULES */
  getAverageDir() {
    const sum = new THREE.Vector3();
    for (const o of this.friends) {
      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < friendRadius) {
        sum.add(o.vel.clone().normalize().divideScalar(d));
      }
    }
    return sum;
  }

  getAvoidDir() {
    const steer = new THREE.Vector3();
    for (const o of this.friends) {
      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < crowdRadius) {
        steer.add(this.pos.clone().sub(o.pos).normalize().divideScalar(d));
      }
    }
    return steer;
  }

  getAvoidAvoids(avoids) {
    const steer = new THREE.Vector3();
    for (const o of avoids) {
      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < avoidRadius) {
        steer.add(this.pos.clone().sub(o.pos).normalize().divideScalar(d));
      }
    }
    return steer;
  }

  getCohesion() {
    const sum = new THREE.Vector3();
    let count = 0;
    for (const o of this.friends) {
      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < coheseRadius) {
        sum.add(o.pos);
        count++;
      }
    }
    if (count === 0) return new THREE.Vector3();
    return sum.divideScalar(count).sub(this.pos).multiplyScalar(0.05);
  }

  /* WORLD: bounce off a sphere of radius r around center */
  bounce() {
    const offset = this.pos.clone().sub(this.center);
    if (offset.length() > this.radius) {
      const normal = offset.normalize();

      // push back inside the boundary
      this.pos.copy(this.center).addScaledVector(normal, this.radius);

      // reflect velocity: v - 2(v·n)n
      this.vel.addScaledVector(normal, -2 * this.vel.dot(normal));
      this.vel.multiplyScalar(0.9);
    }
  }
}


export function renderParticles(count, col, weight, x, y, z, r) {
  const center = new THREE.Vector3(x, y, z);
  const boids = [];
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // random start position inside the sphere
    const start = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).multiplyScalar(2 * r).add(center);

    boids.push(new Boid(start, center, r));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ size: weight, color: col });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  // call every frame
  function update(avoids = []) {
    boids.forEach((b, i) => {
      b.go(boids, avoids);
      positions[i * 3] = b.pos.x;
      positions[i * 3 + 1] = b.pos.y;
      positions[i * 3 + 2] = b.pos.z;
    });
    geometry.attributes.position.needsUpdate = true;
  }

  return { points, update };
}