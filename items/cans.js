import * as THREE from 'three';


export let cans = []

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
        this.mesh.scale.set(50,50,50)
        this.mesh.position.copy(position); // set position 


        // bounding box 
        // Create bounding box helper
        this.boundingBox = new THREE.BoxHelper(this.mesh, 0xffff00);

        // Hide initially
        this.boundingBox.visible = false;

        this.scene.add(this.mesh);
        this.scene.add(this.boundingBox);

        cans.push(this) // add enture enstance to array
        this.scene.add(this.mesh); // add to scene 
    }
}

export function spawnCan(scene, x, y, z) {

    const can = new Can(
        scene,
        new THREE.Vector3(x, y, z)
    );

    return can;
}

export function checkCanCollection(player, cans) {

    for (const can of cans) {

        if (can.collected) continue;

        if (player.position.distanceTo(can.mesh.position) < 100) {

            // Show bounding box
            can.boundingBox.visible = true;

            console.log("Can nearby!");

            // can.collect();
        }

    
        /*if (cyborg.position.distanceTo(can.mesh.position) < 100) {

            // Show bounding box
            can.boundingBox.visible = true;

            console.log("Can nearby!");

            // can.collect();
        }*/


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