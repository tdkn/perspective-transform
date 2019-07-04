<template>
  <div>
    <canvas class="renderer" ref="original"></canvas>
    <canvas class="renderer" ref="preview"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TweakPane from "tweakpane";
import perspective from "perspective-transform";
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
    orbitControls: null
  }),
  mounted() {
    this.createRenderer();
    this.createScene();
    this.createCamera();
    this.createImageMesh();
    this.createCornerMesh();
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
        new THREE.BoxGeometry(width, height, 1),
        new THREE.MeshBasicMaterial({ map: texture })
      );

      this.imageMesh = imageMesh.clone();
      this.previewMesh = imageMesh.clone();

      this.sceneOfOriginal.add(this.imageMesh);
      this.sceneOfPreview.add(this.previewMesh);
    },
    createCornerMesh() {
      // Create four meshes to show the corner points

      // prettier-ignore
      const positions = [
        [-100, -100],  // bottom-left
        [100, -100],   // bottom-right
        [100, 100],    // top-right
        [-100, 100]    // top-left
      ];

      positions.forEach(([x, y]) => {
        const cornerMesh = new THREE.Mesh(
          new THREE.BoxGeometry(10, 10, 0),
          new THREE.MeshBasicMaterial({ color: "#00ff00" })
        );

        cornerMesh.position.set(x, y, 1);

        this.cornerMeshes.push(cornerMesh);
        this.sceneOfOriginal.add(cornerMesh);
      });
    },
    applyTransform() {
      const srcPts = this.cornerMeshes.reduce((points, mesh) => {
        return [...points, mesh.position.x, mesh.position.y];
      }, []);

      // Destination points - this is the four corners of the visible viewport (bottom left, bottom right, top right, top left)
      // These are half the width & height because the origin is at the center
      const w = this.$refs.original.width / 2;
      const h = this.$refs.original.height / 2;

      // prettier-ignore
      const destPts = [
        -w, -h, // bottom left
        w, -h, // bottom right
        w, h, // top right
        -w, h // top left
      ];

      // Get the coefficience for a perspective transform mapping from the source (TV screen corners) to the destination (entire viewport)
      const { coeffs } = perspective(srcPts, destPts);
      const [a1, a2, a3, b1, b2, b3, c1, c2, c3] = coeffs;

      // Create a 4x4 transformation matrix.
      // Transform x and y coordinate, but leave the z coordinates of the homogeneous coordinate vectors alone
      const transformMatrix = new THREE.Matrix4();

      // prettier-ignore
      transformMatrix.set(
        a1, a2, 0, a3,
        b1, b2, 0, b3,
        0, 0, 1, 0,
        c1, c2, 0, c3
      );

      // Apply the transform to the preview image mesh
      this.previewMesh.matrix = transformMatrix;
      this.previewMesh.matrixAutoUpdate = false;
    },
    render() {
      this.applyTransform();

      this.rendererOfOriginal.render(
        this.sceneOfOriginal,
        this.cameraOfOriginal
      );
      this.rendererOfPreview.render(this.sceneOfPreview, this.cameraOfPreview);

      requestAnimationFrame(this.render);
    },
    createHelper() {
      // OrbitControls
      this.orbitControls = new OrbitControls(
        this.cameraOfOriginal,
        this.rendererOfOriginal.domElement
      );
      this.orbitControls.enabled = false;

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

      const setupOrbitControls = () => {
        const folder = pane.addFolder({ title: "OrbitControls" });
        folder.addInput(this.orbitControls, "enabled");
      };

      setupPerspectiveCamera();
      setupOrbitControls();
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
