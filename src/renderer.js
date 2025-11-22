// Basic renderer with Three.js: adds tubes (as hollow boxes) and detects bounding-box intersections
// Use module imports for Three.js and OrbitControls
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let tubes = [];
let history = { past: [], future: [] };

function init() {
  const container = document.getElementById('renderContainer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);


  const fallbackWidth = Math.max(1, container.clientWidth || (window.innerWidth - 320));
  const fallbackHeight = Math.max(1, container.clientHeight || (window.innerHeight - 60));
  camera = new THREE.PerspectiveCamera(45, fallbackWidth / fallbackHeight, 1, 10000);
  camera.position.set(400, 300, 400);

  renderer = new THREE.WebGLRenderer({antialias:true});
  const w = container.clientWidth || fallbackWidth;
  const h = container.clientHeight || fallbackHeight;
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;


  const grid = new THREE.GridHelper(1000, 40, 0x444444, 0x263244);
  scene.add(grid);
  const axes = new THREE.AxesHelper(200);
  scene.add(axes);

  const light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(1,2,1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040, 1.0));

  window.addEventListener('resize', onWindowResize);


  setTimeout(()=> onWindowResize(), 50);
  animate();
}

function onWindowResize(){
  const container = document.getElementById('renderContainer');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}

function mmToUnit(v){ return v; } 

function createHollowBox(width, height, thickness, length, wireframe=false){
 
  const outer = new THREE.BoxGeometry(length, height, width);
  const inner = new THREE.BoxGeometry(length - 2*thickness, height - 2*thickness, width - 2*thickness);
 
  const outerMat = new THREE.MeshStandardMaterial({metalness:0.2, roughness:0.6, wireframe:wireframe});
  const innerMat = new THREE.MeshStandardMaterial({color:0x0b1220, metalness:0.2, roughness:0.6});
  const outerMesh = new THREE.Mesh(outer, outerMat);
  const innerMesh = new THREE.Mesh(inner, innerMat);
 
  const g = new THREE.Group();
  g.add(outerMesh);
  innerMesh.scale.set(1,1,1);
  g.add(innerMesh);
  innerMesh.position.set(0,0,0);
  return g;
}

function addTube(params){
  const { width, height, thickness, length, angleDeg, id } = params;
  const wireframe = document.getElementById('wireframe').checked;
  const mesh = createHollowBox(width, height, thickness, length, wireframe);
  mesh.userData = {...params};
  mesh.name = id;

  mesh.position.set(0, height/2, 0);
  mesh.rotation.y = THREE.MathUtils.degToRad(angleDeg || 0);
  scene.add(mesh);
  tubes.push(mesh);
  pushHistory();
  refreshList();
  highlightIntersections();
  return mesh;
}

function pushHistory(){

  const snapshot = tubes.map(t => ({
    id: t.name,
    params: Object.assign({}, t.userData),
    position: [t.position.x, t.position.y, t.position.z],
    rotationY: t.rotation.y
  }));
  history.past.push(snapshot);
  history.future = [];
  if(history.past.length > 50) history.past.shift();
}

function undo(){
  if(history.past.length < 2) return;
  const last = history.past.pop();
  history.future.push(last);
  const snapshot = history.past[history.past.length - 1];
  applySnapshot(snapshot);
}

function redo(){
  if(history.future.length === 0) return;
  const snap = history.future.pop();
  history.past.push(snap);
  applySnapshot(snap);
}

function applySnapshot(snapshot){
  
  if(!snapshot) return;
  
  clearTubes();
  snapshot.forEach(s => {
    const params = Object.assign({}, s.params);
    // ensure id is present
    params.id = s.id;
    const wireframe = document.getElementById('wireframe').checked;
    const mesh = createHollowBox(params.width, params.height, params.thickness, params.length, wireframe);
    mesh.userData = params;
    mesh.name = s.id;
    mesh.position.set(s.position[0], s.position[1], s.position[2]);
    mesh.rotation.y = s.rotationY;
    scene.add(mesh);
    tubes.push(mesh);
  });
  refreshList();
  highlightIntersections();
}

function clearTubes(){

  tubes.forEach(t => {
    t.traverse(node => {
      if(node.isMesh){
        if(node.geometry){ node.geometry.dispose && node.geometry.dispose(); }
        if(node.material){
          if(Array.isArray(node.material)){
            node.material.forEach(m => m.dispose && m.dispose());
          } else {
            node.material.dispose && node.material.dispose();
          }
        }
      }
    });
    scene.remove(t);
  });
  tubes = [];
}

function refreshList(){
  const list = document.getElementById('tubeList');
  list.innerHTML = '';
  tubes.forEach(t => {
    const div = document.createElement('div');
    div.className = 'tube-item';
    div.textContent = `${t.name} — angle ${Math.round(THREE.MathUtils.radToDeg(t.rotation.y))}°`;
    div.onclick = () => selectTube(t.name);
    list.appendChild(div);
  });
}

let selectedId = null;
function selectTube(id){
  selectedId = id;
  const items = document.querySelectorAll('.tube-item');
  items.forEach(it => it.classList.remove('selected'));
  const idx = Array.from(items).find(i => i.textContent.startsWith(id));
  if(idx) idx.classList.add('selected');

  const tube = tubes.find(t => t.name === id);
  if(!tube) return;
  const angleInput = document.getElementById('angle');
  angleInput.value = Math.round(THREE.MathUtils.radToDeg(tube.rotation.y));
}

function highlightIntersections(){
 
  for(let i=0;i<tubes.length;i++){
    for(let j=0;j<tubes.length;j++){
      const a = tubes[i], b = tubes[j];
      const matOuterA = a.children[0].material;
      const matOuterB = b.children[0].material;
      matOuterA.color.set(0x8aa6ff); 
      matOuterB.color.set(0x8aa6ff);
    }
  }
  if(!document.getElementById('highlightJoint').checked) return;
  for(let i=0;i<tubes.length;i++){
    for(let j=i+1;j<tubes.length;j++){
      const a = tubes[i], b = tubes[j];
      const boxA = new THREE.Box3().setFromObject(a);
      const boxB = new THREE.Box3().setFromObject(b);
      if(boxA.intersectsBox(boxB)){
    
        a.children[0].material.color.set(0xffaa33);
        b.children[0].material.color.set(0xffaa33);
        
        const inter = boxA.clone().intersect(boxB);
        drawIntersectionHelper(inter);
      }
    }
  }
}

let lastHelper = null;
function drawIntersectionHelper(box){
  if(lastHelper) scene.remove(lastHelper);
  const size = new THREE.Vector3();
  box.getSize(size);
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mat = new THREE.MeshStandardMaterial({transparent:true, opacity:0.3});
  const m = new THREE.Mesh(geo, mat);
  const center = new THREE.Vector3();
  box.getCenter(center);
  m.position.copy(center);
  scene.add(m);
  lastHelper = m;
  setTimeout(()=> {
    if(lastHelper){ scene.remove(lastHelper); lastHelper = null; }
  }, 2500);
}

function snapAngle(angle){
  if(!document.getElementById('snapAngle').checked) return angle;

  const to15 = Math.round(angle/15)*15;
  const to45 = Math.round(angle/45)*45;
 
  if(Math.abs(angle-to45) < 7) return to45;
  return to15;
}

function setupUI(){
  document.getElementById('addTube').onclick = ()=>{
    const id = 'Tube' + (tubes.length+1);
    const params = {
      id,
      type: document.getElementById('tubeType').value,
      width: parseFloat(document.getElementById('width').value),
      height: parseFloat(document.getElementById('height').value),
      thickness: parseFloat(document.getElementById('thickness').value),
      length: parseFloat(document.getElementById('length').value),
      angleDeg: snapAngle(parseFloat(document.getElementById('angle').value) || 0)
    };
    addTube(params);
  };
  document.getElementById('wireframe').onchange = ()=>{
    const wire = document.getElementById('wireframe').checked;
    tubes.forEach(t => t.children.forEach(ch => { if(ch.material) ch.material.wireframe = wire; }));
  };
  document.getElementById('angle').onchange = ()=>{
    if(!selectedId) return;
    const tube = tubes.find(t=>t.name===selectedId);
    if(!tube) return;
    const newA = snapAngle(parseFloat(document.getElementById('angle').value) || 0);
    tube.rotation.y = THREE.MathUtils.degToRad(newA);
    pushHistory();
    refreshList();
    highlightIntersections();
  };
  document.getElementById('undo').onclick = undo;
  document.getElementById('redo').onclick = redo;
  document.getElementById('snapAngle').onchange = ()=>{};
  document.getElementById('highlightJoint').onchange = highlightIntersections;
}

init();
setupUI();
pushHistory(); 






