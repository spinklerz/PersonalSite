import "./style.css";
import { Clock } from "three";
import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const material = new THREE.PointsMaterial({ size: 0.01, color: 0x8b8000 });

const scene = new THREE.Scene();
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height);
camera.position.z = 2;

const canvas = document.querySelector(".webgL");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
document.body.appendChild(renderer.domElement);

// Define the parametric equation for the figure-eight
function lemniscate(t) {
  const a = 1.5;
  const x = (a * Math.cos(t)) / (1 + Math.sin(t) ** 2);
  const y = (a * Math.cos(t) * Math.sin(t)) / (1 + Math.sin(t) ** 2);
  const z = 0;
  return new THREE.Vector3(x, y, z);
}

const numPoints = 800;
const points = [];
for (let i = 0; i < numPoints + 1; i++) {
  const t = (i / numPoints) * Math.PI * 2;
  //if (i > 190 && i < 216) {
  //continue;
  // } else if (i > 587 && i < 611) {
  //continue;

  const point = lemniscate(t);
  points.push(point);
}

const curve = new THREE.CatmullRomCurve3(points);

const tubeGeometry = new THREE.TubeGeometry(curve, 200, 0.09, 10, false);

const figureEightMesh = new THREE.Points(tubeGeometry, material);

scene.add(figureEightMesh);
// orbital controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 3;
//const worldPosition = figureEightMesh.getWorldPosition();
// Animation loop
const clock = new THREE.Clock();
//function randomColor(object) {
// Generate a random color
//clock.tick();

// Check if it is time to change the color of the object
//if (clock.getElapsedTime() >= 1.0) {
// Change the color of the object
// figureEightMes.material.color = new THREE.Color(
//  Math.random(),
//  Math.random(),
//  Math.random()
// );

// Reset the clock
//clock.reset();
// }

//const color = new THREE.Color(Math.random(), Math.random(), Math.random());

//figureEightMesh.material.color = color;

let startTime = 0;
//RGB figure8
const animate = function () {
  window.requestAnimationFrame(animate);

  // Check if it is time to change the color of the object
  const elapsedTime = performance.now() - startTime;
  //figureEightMesh.rotateX(0.008);
  // Check if it is time to change the color of the object
  if (elapsedTime >= 1400) {
    // Change the color of the object
    figureEightMesh.material.color = new THREE.Color(
      Math.random(),
      Math.random(),
      Math.random()
    );
    if (controls.isMouseDown) {
      // If the Ctrl key is being held down, translate the object
      if (controls.isCtrlDown) {
        object.position.add(controls.getDelta());
      } else {
        // Otherwise, rotate the object
        object.rotate(controls.getDelta());
      }
    }

    // Reset the start time
    startTime = performance.now();
  }
  // Reset the last time

  //console.log(worldPosition);
  // Rotate the figure-eight
  //figureEightMesh.rotation.y += 0.005;
  // Calculate the rotation of the figure-eight based on the time

  controls.update();
  renderer.render(scene, camera);
};
// dynamic resize
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  //update camera
  camera.aspect = sizes.width / sizes.height; // IMPORTANT THAT THESE ARE IN SYNC
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
});

// Start the animation loop
let mousedown = true;
let mouseup = true;
let rgb = [];
/*function rgbFunc(e, sizes) {
  // Generate a random RGB color.
  const r = Math.round((e.pageX / sizes.width) * 255);
  const g = Math.round((e.pageY / sizes.height) * 255);
  const b = 100;

  // Check if the color is a light shade of red, green, or blue.
  if (r < 128 && g < 128 && b < 128) {
    // Reject the color and generate a new one.
    return rgb(e, sizes);
  }

  // Check if the color is a dark shade of yellow or orange.
  if (r > 255 - 128 && g > 255 - 128) {
    // Reject the color and generate a new one.
    return rgb(e, sizes);
  }

  // Check if the color is a shade of purple or pink.
  if (r > 128 && g < 128 && b > 128) {
    // Reject the color and generate a new one.
    return rgb(e, sizes);
  }

  // Return the color.
  return [r, g, b];
}
*/
window.addEventListener("mousedown", () => (mousedown = true));
window.addEventListener("mouseup", () => (mouseup = true));
const elements = document.querySelectorAll(
  "h1, .Proj, .ects, .ContactMe, .AboutMe"
);
for (let i = 0; i < elements.length; i++) {
  elements[i].style.display = "block";
}
const t1 = gsap.timeline({ defaults: { duration: 1 } });
const t2 = gsap.timeline({ defaults: { duration: 5 } });
t1.fromTo(figureEightMesh.scale, { z: 0, x: 0, y: 0 }, { z: 1, x: 1, y: 1 });
t1.fromTo("h1", { opacity: 0 }, { opacity: 1 });
t1.fromTo("#TaskBar", { y: "-120%" }, { y: "-10%" });
animate();
