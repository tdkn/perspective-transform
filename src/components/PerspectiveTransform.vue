<template>
  <div>
    <canvas class="renderer" ref="original"></canvas>
    <canvas class="renderer" ref="preview"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import TweakPane from "tweakpane";
import { getPerspectiveTransform } from "../lib/perspective-transform";
import image from "../assets/clock.jpg";

export default {
  name: "PerspectiveTransform",
  data: () => ({
    canvasSize: {
      width: 500,
      height: 500
    },
    rendererOfOriginal: null,
    rendererOfPreview: null,
    sceneOfOriginal: null,
    sceneOfPreview: null,
    cameraOfOriginal: null,
    cameraOfPreview: null,
    imageMesh: null,
    previewMesh: null,
    cameraOptions: {
      fov: 75,
      aspect: 1,
      near: 0.1,
      far: 1000
    },
    cornerMeshes: [],
    positions: [
      new THREE.Vector3(-100, 100, 1), // top-left
      new THREE.Vector3(100, 100, 1), // top-right
      new THREE.Vector3(100, -100, 1), // bottom-right
      new THREE.Vector3(-100, -100, 1) // bottom-left
    ],
    planeMesh: null,
    lineSegments: null
  }),
  computed: {
    namedPosition() {
      return {
        topLeft: this.positions[3],
        topRight: this.positions[2],
        bottomRight: this.positions[1],
        bottomLeft: this.positions[0]
      };
    }
  },
  mounted() {
    this.createRenderer();
    this.createScene();
    this.createCamera();
    this.createImageMesh();
    this.createCornerMesh();
    this.createPlaneMesh();
    this.createHelper();
    this.createTweakPane();
    this.render();
  },
  methods: {
    createRenderer() {
      const { width, height } = this.canvasSize;

      this.rendererOfOriginal = new THREE.WebGLRenderer({
        canvas: this.$refs.original,
        alpha: true,
        antialias: true
      });

      this.rendererOfPreview = new THREE.WebGLRenderer({
        canvas: this.$refs.preview,
        alpha: true,
        antialias: true
      });

      this.rendererOfOriginal.setSize(width, height);
      this.rendererOfPreview.setSize(width, height);
    },
    createScene() {
      this.sceneOfOriginal = new THREE.Scene();
      this.sceneOfPreview = new THREE.Scene();
    },
    createCamera() {
      const { height } = this.canvasSize;
      const { fov, aspect, near, far } = this.cameraOptions;
      const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      camera.position.z = height / 2 / Math.tan(THREE.Math.degToRad(fov / 2));

      this.cameraOfOriginal = camera.clone();
      this.cameraOfPreview = camera.clone();

      // Add to the scene
      this.sceneOfOriginal.add(this.cameraOfOriginal);
      this.sceneOfPreview.add(this.cameraOfPreview);
    },
    createImageMesh() {
      const loader = new THREE.TextureLoader();

      const texture = loader.load(image);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const { width, height } = this.canvasSize;
      const imageMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0),
        new THREE.MeshBasicMaterial({ map: texture })
      );

      this.imageMesh = imageMesh.clone();
      this.previewMesh = imageMesh.clone();

      this.sceneOfOriginal.add(this.imageMesh);
      this.sceneOfPreview.add(this.previewMesh);
    },
    createCornerMesh() {
      // Create four meshes to show the corner points
      this.positions.forEach(position => {
        const cornerMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 10, 1),
          new THREE.MeshBasicMaterial({
            color: "#00ff00",
            side: THREE.DoubleSide
          })
        );

        cornerMesh.position.copy(position);

        this.cornerMeshes.push(cornerMesh);
        this.sceneOfOriginal.add(cornerMesh);
      });
    },
    createPlaneMesh() {
      const geometry = new THREE.PlaneGeometry(200, 200, 1);
      const edges = new THREE.EdgesGeometry(geometry);
      const meshMaterial = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        opacity: 0.5,
        transparent: true
      });
      const lineMaterial = new THREE.LineBasicMaterial({
        color: "#00ff00"
      });

      this.planeMesh = new THREE.Mesh(geometry, meshMaterial);
      this.lineSegments = new THREE.LineSegments(edges, lineMaterial);

      this.sceneOfOriginal.add(this.planeMesh);
      this.sceneOfOriginal.add(this.lineSegments);
    },
    syncPositions() {
      const { topLeft, topRight, bottomLeft, bottomRight } = this.namedPosition;

      // Positions
      this.cornerMeshes.forEach((mesh, index) => {
        this.positions[index].copy(mesh.position);
      });

      // Plane
      this.planeMesh.geometry.vertices[0].copy(topLeft);
      this.planeMesh.geometry.vertices[1].copy(topRight);
      this.planeMesh.geometry.vertices[2].copy(bottomLeft);
      this.planeMesh.geometry.vertices[3].copy(bottomRight);
      this.planeMesh.geometry.verticesNeedUpdate = true;

      // Lines
      this.lineSegments.geometry.dispose();
      this.lineSegments.geometry = new THREE.EdgesGeometry(
        this.planeMesh.geometry
      );
    },
    applyTransform() {
      const srcPts = this.positions.reduce((points, { x, y }) => {
        return [...points, x, y];
      }, []);

      // Destination points - this is the four corners of the visible viewport (bottom left, bottom right, top right, top left)
      // These are half the width & height because the origin is at the center
      const w = this.$refs.original.width / 2;
      const h = this.$refs.original.height / 2;

      // prettier-ignore
      const destPts = [
        -w, h, // top-left
        w, h, // top-right
        w, -h, // bottom-right
        -w, -h // bottom-left
      ];

      // Apply the transform to the preview image mesh
      this.previewMesh.matrix = getPerspectiveTransform(srcPts, destPts);
      this.previewMesh.matrixAutoUpdate = false;
    },
    render() {
      this.syncPositions();
      this.applyTransform();

      this.rendererOfOriginal.render(
        this.sceneOfOriginal,
        this.cameraOfOriginal
      );
      this.rendererOfPreview.render(this.sceneOfPreview, this.cameraOfPreview);

      requestAnimationFrame(this.render);
    },
    createHelper() {
      // DragControls
      new DragControls(
        this.cornerMeshes,
        this.cameraOfOriginal,
        this.rendererOfOriginal.domElement
      );
    },
    createTweakPane() {
      const pane = new TweakPane();

      const setupPerspectiveCamera = () => {
        const folder = pane.addFolder({ title: "PerspectiveCamera" });
        folder.addInput(this.cameraOptions, "fov");
        folder.addInput(this.cameraOptions, "aspect");
        folder.addInput(this.cameraOptions, "near");
        folder.addInput(this.cameraOptions, "far");
        folder.addInput(this.cameraOfOriginal.position, "x");
        folder.addInput(this.cameraOfOriginal.position, "y");
        folder.addInput(this.cameraOfOriginal.position, "z");
      };

      setupPerspectiveCamera();
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.renderer {
  background-color: black;
}
</style>
