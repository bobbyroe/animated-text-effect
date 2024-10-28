import * as THREE from "three";

import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getBgSphere from "./getBgSphere.js";

import { TTFLoader } from "jsm/loaders/TTFLoader.js";
import { Font } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";

import { LineMaterial } from "jsm/lines/LineMaterial.js";
import { Line2 } from "jsm/lines/Line2.js";
import { LineGeometry } from "jsm/lines/LineGeometry.js";
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

function createOutlines({ font, message }) {
  const strokeGroup = new THREE.Group();

  let totalDist = 1.0;
  const lineMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: 3,
    dashed: true,
    dashSize: totalDist * 2,
    gapSize: totalDist * 2,
    dashOffset: Math.random() * totalDist,
  });

  function getStrokeMesh({ shape, i = 0.0 }) {
    let points = shape.getPoints();
    let points3d = [];
    points.forEach((p) => {
      points3d.push(p.x, p.y, 0);
    });
    const lineGeo = new LineGeometry();
    lineGeo.setPositions(points3d);
  
    totalDist = shape.getLength();
    lineMaterial.dashSize = totalDist * 2;
    lineMaterial.gapSize = totalDist * 2;
    lineMaterial.dashOffset = Math.random() * totalDist;
    
    const strokeMesh = new Line2(lineGeo, lineMaterial);
    strokeMesh.computeLineDistances();
    let offset = i * 0;
    strokeMesh.userData.update = (t) => {
      strokeMesh.material.dashOffset = t * (totalDist * 0.1) + offset;
    };
    return strokeMesh;
  }

  const shapes = font.generateShapes(message, 1);
  shapes.forEach((s, i) => {
    strokeGroup.add(getStrokeMesh({ shape: s, i }));

    if (s.holes?.length > 0) {
      s.holes.forEach((h) => {
        strokeGroup.add(getStrokeMesh({ shape: h, i }));
      });
    }
  });
  strokeGroup.update = (t, i) => {
    strokeGroup.children.forEach((c) => {
      c.userData.update?.(t);
    });
  };
  return strokeGroup;
}

function createText({ font, message }) {
  const textGroup = new THREE.Group();
  const props = {
    font,
    size: 1,
    depth: 0.1,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.01,
    bevelOffset: 0,
    bevelSegments: 2,
  };
  const textGeo = new TextGeometry(message, props);
  textGeo.computeBoundingBox();
  const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
  const glassMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.5,
    transmission: 1.0,
    transparent: true,
    thickness: 1.0,
  });
  const textMesh = new THREE.Mesh(textGeo, glassMat);
  textMesh.position.x = centerOffset;
  textGroup.add(textMesh);

  const outlineText = createOutlines({ font, message });
  outlineText.position.set(centerOffset, 0, 0.2);
  textGroup.add(outlineText);

  textGroup.userData.update = (t) => {
    let timeStep = t * 0.005;
    outlineText.update(timeStep);
  };
  return textGroup;
}
const bgSphere = getBgSphere({ hue: 0.6 });
scene.add(bgSphere);

let text;
function initScene(res) {
  const font = new Font(res);
  text = createText({ font, message: "Three.js" });
  scene.add(text);
  animate();
}

function animate(timeStep) {
  requestAnimationFrame(animate);
  text.userData.update(timeStep);
  renderer.render(scene, camera);
  ctrls.update();
}

function loadFont() {
  const loader = new TTFLoader();
  loader.load("./fonts/ChakraPetch-Bold.ttf", (res) => {
    initScene(res);
  });
}
loadFont();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);