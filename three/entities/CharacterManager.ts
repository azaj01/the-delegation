
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  Fn,
  instanceIndex,
  storage,
  float,
  vec3,
  vec4,
  mat3,
  mat4,
  uint,
  If,
  Loop,
  uniform,
  atan,
  attribute,
  positionLocal,
  time,
  texture,
  mix,
  sin,
  cos
} from 'three/tsl';
import { BoidsParams } from '../../types';

export class CharacterManager {
  private instanceCount = 100;

  // Compute Buffers (GPU)
  private posAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private velAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private timeOffsetAttribute: THREE.InstancedBufferAttribute | null = null;
  private positionStorage: any;
  private velocityStorage: any;

  // CPU Simulation Buffers (For Debug Canvas)
  private debugPosArray: Float32Array | null = null;
  private debugVelArray: Float32Array | null = null;

  // Logic Nodes
  private computeNode: any;

  // Assets & Objects
  private instancedMesh: THREE.Mesh | null = null;
  private baseGeometry: THREE.BufferGeometry | null = null;
  private baseMaterial: THREE.MeshStandardMaterial | null = null;

  // Animation Data
  private bakedAnimationBuffer: THREE.StorageBufferAttribute | null = null;
  private numFrames = 0;
  private numBones = 0;
  private animationDuration = 0;

  // Uniforms
  private uSpeed = uniform(0.05);
  private uSeparationRadius = uniform(2.0);
  private uSeparationStrength = uniform(0.05);
  private uWorldSize = uniform(20.0);
  private uDebugMode = uniform(0);

  public isLoaded = false;

  constructor(private scene: THREE.Scene) {}

  public async load() {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/character.glb');
      const model = gltf.scene;

      let skinnedMesh: THREE.SkinnedMesh | null = null;
      model.traverse((child) => {
        if ((child as any).isSkinnedMesh && !skinnedMesh) {
          skinnedMesh = child as THREE.SkinnedMesh;
        }
      });

      const clip = gltf.animations[0];
      if (!skinnedMesh || !clip) return;

      this.baseGeometry = skinnedMesh.geometry;
      this.baseMaterial = skinnedMesh.material as THREE.MeshStandardMaterial;

      this.bakeAnimation(skinnedMesh, clip, model);
      this.initInstances();
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load character:", err);
    }
  }

  public setInstanceCount(count: number) {
    if (this.instanceCount === count) return;
    this.instanceCount = count;
    if (this.isLoaded) {
      this.cleanupInstances();
      this.initInstances();
    }
  }

  public updateBoidsParams(params: BoidsParams) {
    this.uSpeed.value = params.speed;
    this.uSeparationRadius.value = params.separationRadius;
    this.uSeparationStrength.value = params.separationStrength;
  }

  public updateWorldSize(size: number) {
    this.uWorldSize.value = size;
  }

  public setDebugMode(enabled: boolean) {
    this.uDebugMode.value = enabled ? 1 : 0;
  }

  public simulateOnCPU(params: BoidsParams, worldSize: number): Float32Array | null {
    if (!this.debugPosArray || !this.debugVelArray) return null;
    const count = this.instanceCount;
    const currentPos = this.debugPosArray;
    const currentVel = this.debugVelArray;

    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      let px = currentPos[idx], pz = currentPos[idx + 2];
      let vx = currentVel[idx], vz = currentVel[idx + 2];

      const dist = Math.sqrt(px * px + pz * pz);
      if (dist > worldSize) {
        vx += (-px / (dist || 1)) * 0.01;
        vz += (-pz / (dist || 1)) * 0.01;
      }

      let sepX = 0, sepZ = 0;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const jdx = j * 4;
        const dx = px - currentPos[jdx], dz = pz - currentPos[jdx + 2];
        const d = Math.sqrt(dx*dx + dz*dz);
        if (d < params.separationRadius && d > 0.01) {
          sepX += (dx / d) * params.separationStrength;
          sepZ += (dz / d) * params.separationStrength;
        }
      }
      vx += sepX; vz += sepZ;
      const speed = Math.sqrt(vx*vx + vz*vz);
      if (speed > 0.001) {
        vx = (vx / speed) * params.speed;
        vz = (vz / speed) * params.speed;
      } else {
        vx = 0; vz = params.speed;
      }
      currentVel[idx] = vx; currentVel[idx + 2] = vz;
      currentPos[idx] = px + vx; currentPos[idx + 2] = pz + vz;
    }
    return this.debugPosArray;
  }

  public update(delta: number, renderer: any) {
    if (this.computeNode) {
      renderer.compute(this.computeNode);
    }
  }

  private cleanupInstances() {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh = null;
    }
    this.computeNode = null;
  }

  private initInstances() {
    if (!this.baseGeometry || !this.baseMaterial) return;

    const posArray = new Float32Array(this.instanceCount * 4);
    const velArray = new Float32Array(this.instanceCount * 4);
    const timeOffsetArray = new Float32Array(this.instanceCount);

    for (let i = 0; i < this.instanceCount; i++) {
      posArray[i * 4 + 0] = (Math.random() - 0.5) * 20;
      posArray[i * 4 + 2] = (Math.random() - 0.5) * 20;
      posArray[i * 4 + 3] = 1;
      velArray[i * 4 + 0] = (Math.random() - 0.5) * 0.1;
      velArray[i * 4 + 2] = (Math.random() - 0.5) * 0.1;
      timeOffsetArray[i] = Math.random() * 10;
    }

    this.debugPosArray = new Float32Array(posArray);
    this.debugVelArray = new Float32Array(velArray);

    this.posAttribute = new THREE.StorageInstancedBufferAttribute(posArray, 4);
    this.velAttribute = new THREE.StorageInstancedBufferAttribute(velArray, 4);
    this.timeOffsetAttribute = new THREE.InstancedBufferAttribute(timeOffsetArray, 1);

    this.positionStorage = storage(this.posAttribute, 'vec4', this.instanceCount);
    this.velocityStorage = storage(this.velAttribute, 'vec4', this.instanceCount);

    this.initComputeNode();
    this.createInstancedMesh();
  }

  private initComputeNode() {
    // FIX: Use .assign() as a METHOD on the storage element, not as a standalone function.
    // Standalone assign() creates an AssignNode but doesn't register it as a side-effect
    // in the TSL compute graph, so the writes were silently dropped.
    this.computeNode = Fn(() => {
      const index = instanceIndex;

      // Get references to the storage elements themselves (not just .xyz copies)
      const posElement = this.positionStorage.element(index);
      const velElement = this.velocityStorage.element(index);

      // Read current values into local vars
      const pos = posElement.xyz.toVar();
      const vel = velElement.xyz.toVar();
      const accel = vec3(0).toVar();

      // World Boundary
      const distToCenter = pos.length();
      If(distToCenter.greaterThan(this.uWorldSize), () => {
        accel.addAssign(pos.negate().normalize().mul(0.01));
      });

      // Separation
      Loop({ start: uint(0), end: uint(this.instanceCount), type: 'uint' }, ({ i }) => {
        const otherPos = this.positionStorage.element(i).xyz;
        const diff = pos.sub(otherPos);
        const dist = diff.length();
        If(dist.lessThan(this.uSeparationRadius).and(dist.greaterThan(0.01)), () => {
            accel.addAssign(diff.normalize().mul(this.uSeparationStrength));
        });
      });

      const newVel = vel.add(accel).toVar();
      const speed = newVel.length();
      If(speed.greaterThan(0.001), () => {
         newVel.assign(newVel.normalize().mul(this.uSpeed));
      }).Else(() => {
         newVel.assign(vec3(0, 0, this.uSpeed));
      });

      // FIXED: Use .assign() method on storage elements (registers as side-effect)
      velElement.assign(vec4(newVel, 0.0));
      posElement.assign(vec4(pos.add(newVel), 1.0));

    })().compute(this.instanceCount);
  }

  private createInstancedMesh() {
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.copy(this.baseGeometry as any);
    instancedGeometry.instanceCount = this.instanceCount;

    // Solo dejamos el atributo que NO se calcula en el Compute Shader
    if (this.timeOffsetAttribute) instancedGeometry.setAttribute('instanceTimeOffset', this.timeOffsetAttribute);

    const material = new THREE.MeshStandardNodeMaterial();
    material.roughness = this.baseMaterial.roughness;
    material.metalness = this.baseMaterial.metalness;

    const map = (this.baseMaterial as any).map;
    const baseColor = map ? texture(map) : vec4(1,1,1,1);

    // Color por velocidad + Pulsación de debug para confirmar frescura de datos
    const vel = this.velocityStorage.element(instanceIndex).xyz;
    const speed = vel.length();
    const pulse = sin(time.mul(5)).add(1).mul(0.2); // Pequeño pulso de brillo
    const debugColor = vec4(speed.mul(20), float(1).sub(speed.mul(20)), pulse, 1);

    material.colorNode = mix(baseColor, debugColor, this.uDebugMode);
    material.positionNode = this.createVertexNode();

    this.instancedMesh = new THREE.Mesh(instancedGeometry, material);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;
    this.scene.add(this.instancedMesh);
  }

  private createVertexNode() {
    return Fn(() => {
      const instancePos = this.positionStorage.element(instanceIndex).xyz;
      const instanceVel = this.velocityStorage.element(instanceIndex).xyz;
      const timeOffset = attribute('instanceTimeOffset');

      const angle = atan(instanceVel.z, instanceVel.x).negate().add(float(Math.PI / 2));
      const rotationMat = mat3(
        vec3(cos(angle), float(0), sin(angle).negate()),
        vec3(float(0), float(1), float(0)),
        vec3(sin(angle), float(0), cos(angle))
      );

      const finalPosition = positionLocal.toVar();

      if (this.bakedAnimationBuffer) {
        const animBuffer = storage(this.bakedAnimationBuffer, 'mat4', this.numFrames * this.numBones);
        const animTime = time.add(timeOffset);
        const t = animTime.div(float(this.animationDuration)).fract();
        const currentFrame = t.mul(float(this.numFrames)).toInt();
        const safeFrame = currentFrame.min(uint(this.numFrames - 1));

        const skinIndex = attribute('skinIndex');
        const skinWeight = attribute('skinWeight');
        const skinMat = mat4(0).toVar();

        const addInfluence = (boneIdxNode: any, weightNode: any) => {
            If(weightNode.greaterThan(0), () => {
              const address = safeFrame.mul(uint(this.numBones)).add(boneIdxNode.toInt());
              skinMat.addAssign(animBuffer.element(address).mul(weightNode));
           });
        };

        addInfluence(skinIndex.x, skinWeight.x);
        addInfluence(skinIndex.y, skinWeight.y);
        addInfluence(skinIndex.z, skinWeight.z);
        addInfluence(skinIndex.w, skinWeight.w);

        finalPosition.assign(skinMat.mul(vec4(positionLocal, 1.0)).xyz);
      }

      // Wobble solo si es debug
      const wobble = vec3(sin(time.mul(10)).mul(0.05), 0, 0).mul(this.uDebugMode);

      return rotationMat.mul(finalPosition).add(instancePos).add(wobble);
    })();
  }

  private bakeAnimation(mesh: THREE.SkinnedMesh, clip: THREE.AnimationClip, root: THREE.Object3D) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    const skeleton = mesh.skeleton;
    this.animationDuration = clip.duration;
    this.numFrames = Math.ceil(clip.duration * 60);
    this.numBones = skeleton.bones.length;
    const data = new Float32Array(this.numFrames * this.numBones * 16);
    for (let f = 0; f < this.numFrames; f++) {
      mixer.setTime((f / this.numFrames) * clip.duration);
      root.updateMatrixWorld(true);
      skeleton.update();
      for (let b = 0; b < this.numBones; b++) {
        const i = (f * this.numBones + b) * 16;
        for (let k = 0; k < 16; k++) data[i + k] = skeleton.boneMatrices[b * 16 + k];
      }
    }
    this.bakedAnimationBuffer = new THREE.StorageBufferAttribute(data, 16);
  }

  public fadeToAction(name: string) {}
  public getCount() { return this.instanceCount; }
}
