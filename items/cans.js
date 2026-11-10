import * as THREE from 'three';
import { mulberry32, heightAt } from '../world.js'


export let cans = []
const visibleDist = 100; 
const collectionDist = 10; 

export class Can {
    constructor(scene, position) {
        this.scene = scene; 
        this.collected = false;

        const geometry = new THREE.CylinderGeometry(
            0.25, // top r
            0.25, // bottom r
            0.7, // height
            16 // segments?  
        )

        const material = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            metalness: 0.8,
            roughness: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.scale.set(10,10,10)
        this.mesh.position.copy(position); // set position 


        // bounding box 
        // Create bounding box helper
        this.boundingBox = new THREE.BoxHelper(this.mesh, 0x04D9FF);

        // Hide initially
        this.boundingBox.visible = false;

        this.scene.add(this.mesh);
        this.scene.add(this.boundingBox);

        cans.push(this) // add enture enstance to array
        this.scene.add(this.mesh); // add to scene 
    }

    getMesh() {
        return this.mesh; 
    }
    
    collect() {
        this.mesh.visible = false; 
        this.boundingBox.visible = false; 
    }
}

export function spawnCans(scene, x, z, radius, count) {
    generateCans(scene, x,z,radius,count)
 
}


/* seeded perlin / simplex noise generator for plants */
export function generateCans(scene, cx, cz, radius, count) {
  const rand = mulberry32(69); // seeded random, same numbers every load
  const items = new THREE.Group(); // container for all the flowers
  const f = new THREE.Group(); 

  for (let i = 0; i < count; i++) { // one flower per loop

     
      // random point inside a circle
      const angle = rand() * Math.PI * 2; // random direction
      const dist = Math.sqrt(rand()) * radius; // random distance, sqrt keeps it evenly spread
      const x = cx + Math.cos(angle) * dist; // angle + distance from center -> x
      const z = cz + Math.sin(angle) * dist; // angle + distance from c -> z

      const can = new Can(
            scene,
            new THREE.Vector3(x, heightAt(x,z), z)
     );
     cans.push(can)
    }
}

export function checkCanCollection(player, cans) {

    for (const can of cans) {

        if (can.collected) continue;

        if (player.position.distanceTo(can.mesh.position) < visibleDist) {

            can.boundingBox.visible = true;

            console.log("Can nearby!");
            if(player.position.distanceTo(can.mesh.position) < collectionDist) {
                can.collected = true; 
                can.collect() 
            }
        }

        else {
            can.boundingBox.visible = false;
        }
    }
}


function radarBox(can, scene) {
 // attemtp to create boundign box
  /// 1. Create an empty Box3 bounding box
    const box = new THREE.Box3();

    // 2. Compute the bounding box of the glTF scene
    box.setFromObject(can);
    const boxH = new THREE.BoxHelper( can, 0xffff00 );

    scene.add(boxH)

}



