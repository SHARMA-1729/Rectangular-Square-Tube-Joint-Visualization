import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;

function init() {
  const container = document.getElementById('renderContainer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);

  // compute size with safe fallbacks (some layouts report 0 at init)
  const fallbackWidth = Math.max(1, container.clientWidth || (window.innerWidth - 320));
  const fallbackHeight = Math.max(1, container.clientHeight || (window.innerHeight - 60));
  camera = new THREE.PerspectiveCamera(45, fallbackWidth / fallbackHeight, 1, 10000);
  camera.position.set(400, 300, 400);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  const w = container.clientWidth || fallbackWidth;
  const h = container.clientHeight || fallbackHeight;
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Helpers and lights
  const grid = new THREE.GridHelper(1000, 40, 0x444444, 0x263244);
  scene.add(grid);
  const axes = new THREE.AxesHelper(200);
  scene.add(axes);

  const light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(1, 2, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040, 1.0));

  window.addEventListener('resize', onWindowResize);

  // small delay to allow layout to stabilize, then ensure renderer size matches container
  setTimeout(() => onWindowResize(), 50);
  animate();
}

function onWindowResize() {
  const container = document.getElementById('renderContainer');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
