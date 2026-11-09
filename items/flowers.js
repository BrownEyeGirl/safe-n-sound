/* seeded perlin / simplex noise generator for plants */
export function generateFlowers(item) {
  const rand = mulberry32(item.seed); // seeded random, same numbers every load
  const loader = new GLTFLoader(); // loads gltf model files
  const items = new THREE.Group(); // container for all the flowers
  const f = new THREE.Group(); 

  loader.load(item.model, function(gltf) { // runs once the model has loaded
    const baseFlower = gltf.scene; // original flower, we clone it for each one

    const radius = 500; // how far out flowers can spawn
    const cx = 0; // circle centre x
    const cz = 0; // circle centre z

    for (let i = 0; i < item.count; i++) { // one flower per loop

      // random point inside a circle
      const angle = rand() * Math.PI * 2; // random direction
      const dist = Math.sqrt(rand()) * radius; // random distance, sqrt keeps it evenly spread
      const x = cx + Math.cos(angle) * dist; // angle + distance -> x
      const z = cz + Math.sin(angle) * dist; // angle + distance -> z

      //const n = noise2D(x * 0.001, z * 0.001); // optional clustering filter
      //if (n > 0.1) { ... }

      const flower = baseFlower.clone(true); // copy the flower
      flower.scale.setScalar(item.scale); // scale each flower on its own instead of the group
      flower.position.set(x, heightAt(x, z), z); // set position on the clone, not baseFlower
      flower.rotation.y = rand() * Math.PI * 2; // random spin

      const boxH = new THREE.BoxHelper( flower, 0xffff00 );

      f.add(flower); // add it to the group
      f.add(boxH)
      items.add(f)
    }

    console.log(items.children.length); // logs here, after the flowers actually exist
  });

  return items; // starts empty, fills up once the model loads
}

export function checkFlowerCollection(player, flowers) {

    for (const flower of flowers) {

        if (flower.collected) continue;

        if (player.position.distanceTo(flower.mesh.position) < 100) {

            // Show bounding box
            flower.boundingBox.visible = true;

            console.log("flower nearby!");

            // can.collect();
        }

        else {
            flower.boundingBox.visible = false;
        }
    }
}