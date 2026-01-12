// src/components/GeospatialMap/ThreeOverlay.ts
import L from 'leaflet';
import * as THREE from 'three';

export class ThreeOverlay extends L.Layer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement | null = null;
  private objects: THREE.Object3D[] = [];
  private isVisible: boolean = true;
  private animationFrame: number | null = null;
  private map: L.Map | null = null;

  constructor(map: L.Map) {
    super();
    this.map = map;

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 1000, 10000);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Add lights to scene
    this.setupLights();
  }

  onAdd(map: L.Map): this {
    this.map = map;

    // Create canvas for Three.js
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '500';

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add canvas to map container
    const mapContainer = map.getContainer();
    mapContainer.appendChild(this.canvas);

    // Bind update events
    map.on('viewreset', this.update, this);
    map.on('move', this.update, this);
    map.on('moveend', this.update, this);
    map.on('zoom', this.update, this);
    map.on('zoomend', this.update, this);

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Initial update
    this.update();

    // Start animation loop
    this.animate();

    return this;
  }

  onRemove(map: L.Map): this {
    // Stop animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove event listeners
    map.off('viewreset', this.update, this);
    map.off('move', this.update, this);
    map.off('moveend', this.update, this);
    map.off('zoom', this.update, this);
    map.off('zoomend', this.update, this);
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Clean up Three.js
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Remove canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }

    // Clear objects
    this.objects.forEach(obj => {
      this.scene.remove(obj);
    });
    this.objects = [];

    this.map = null;

    return this;
  }

  private setupLights(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Hemisphere light for sky/ground color
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4);
    this.scene.add(hemisphereLight);
  }

  private update(): void {
    if (!this.map || !this.renderer || !this.canvas) return;

    const mapSize = this.map.getSize();
    const mapBounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // Update canvas size
    this.canvas.width = mapSize.x;
    this.canvas.height = mapSize.y;
    this.renderer.setSize(mapSize.x, mapSize.y);

    // Update camera
    this.updateCamera(mapBounds, zoom);

    // Update object positions
    this.updateObjectPositions();

    // Render the scene
    this.render();
  }

  private updateCamera(_bounds: L.LatLngBounds, zoom: number): void {
    if (!this.map) return;

    // Calculate camera position based on map view
    const scale = Math.pow(2, zoom);

    // Set camera position
    const cameraHeight = 1000 / scale;
    this.camera.position.set(0, 0, cameraHeight);
    this.camera.lookAt(0, 0, 0);

    // Update camera aspect ratio
    const mapSize = this.map.getSize();
    this.camera.aspect = mapSize.x / mapSize.y;
    this.camera.updateProjectionMatrix();
  }

  private updateObjectPositions(): void {
    if (!this.map) return;

    // Update positions of all objects based on current map view
    this.objects.forEach(obj => {
      const userData = obj.userData;
      if (userData.lat !== undefined && userData.lng !== undefined) {
        const position = this.latLngToLayerPoint(userData.lat, userData.lng);
        obj.position.set(position.x, position.y, position.z);
      }
    });
  }

  private animate(): void {
    this.animationFrame = requestAnimationFrame(() => this.animate());

    if (!this.isVisible) return;

    // Animate objects
    this.objects.forEach(obj => {
      if (obj.userData.animate) {
        obj.rotation.y += 0.01;
      }
    });

    this.render();
  }

  private render(): void {
    if (!this.renderer || !this.isVisible) return;
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    this.update();
  }

  public latLngToLayerPoint(lat: number, lng: number): THREE.Vector3 {
    if (!this.map) return new THREE.Vector3(0, 0, 0);

    const point = this.map.latLngToLayerPoint(L.latLng(lat, lng));
    const mapSize = this.map.getSize();

    // Convert to Three.js coordinates (centered)
    const x = point.x - mapSize.x / 2;
    const y = -(point.y - mapSize.y / 2); // Invert Y axis
    const z = 0;

    return new THREE.Vector3(x, y, z);
  }

  public addObject(object: THREE.Object3D): void {
    this.objects.push(object);
    this.scene.add(object);
    this.update();
  }

  public removeObject(object: THREE.Object3D): void {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
      this.scene.remove(object);
      this.update();
    }
  }

  public clearObjects(): void {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
    });
    this.objects = [];
    this.update();
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.canvas) {
      this.canvas.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.canvas) {
      this.canvas.style.display = visible ? 'block' : 'none';
    }
  }

  // Helper method to create a marker mesh
  public createMarkerMesh(color: number = 0xff0000, size: number = 10): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(size, size * 2, 8);
    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.x = Math.PI;

    return mesh;
  }

  // Helper method to create a line between two points
  public createLine(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    color: number = 0x0000ff
  ): THREE.Line {
    const startPoint = this.latLngToLayerPoint(start.lat, start.lng);
    const endPoint = this.latLngToLayerPoint(end.lat, end.lng);

    const geometry = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      endPoint,
    ]);

    const material = new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
    });

    return new THREE.Line(geometry, material);
  }
}

