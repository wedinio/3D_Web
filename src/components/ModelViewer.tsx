'use client';

import React, { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, useProgress, Text } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import { FBXLoader } from 'three-stdlib';
import * as THREE from 'three';
// IFC support temporarily disabled due to WASM loading issues

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white bg-black/50 px-4 py-2 rounded">
        Loading {Math.round(progress)}%
      </div>
    </Html>
  );
}

// Model component that handles different formats
function Model({ url, format, position = [0,0,0], scale = [1,1,1], rotation = [0,0,0] }: { url: string; format: string; position?: [number, number, number]; scale?: [number, number, number]; rotation?: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [originalBottomY, setOriginalBottomY] = useState(0);
  const [originalLeftX, setOriginalLeftX] = useState(0);
  const [originalFrontZ, setOriginalFrontZ] = useState(0);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Optional: Add subtle rotation
      // meshRef.current.rotation.y += delta * 0.1;
    }
  });

  React.useEffect(() => {
    const loadModel = async () => {
      try {
        let loadedModel: THREE.Object3D;

        switch (format.toLowerCase()) {
          case 'gltf':
          case 'glb':
            const gltfLoader = new GLTFLoader();
            const gltf = await new Promise<any>((resolve, reject) => {
              gltfLoader.load(url, resolve, undefined, reject);
            });
            loadedModel = gltf.scene;
            break;

          case 'fbx':
            try {
              const fbxLoader = new FBXLoader();
              loadedModel = await new Promise((resolve, reject) => {
                fbxLoader.load(
                  url, 
                  (model) => {
                    console.log('FBX loaded successfully:', model);
                    resolve(model);
                  },
                  (progress) => {
                    console.log('FBX loading progress:', progress);
                  },
                  (error) => {
                    console.error('FBX loading error details:', error);
                    if (error.message && error.message.includes('version not supported')) {
                      reject(new Error('FBX file version not supported. Please try a different FBX file or convert to glTF format.'));
                    } else {
                      reject(new Error(`FBX loading failed: ${error.message || 'Unknown error'}`));
                    }
                  }
                );
              });
            } catch (error) {
              console.error('FBX catch error:', error);
              if (error instanceof Error && error.message.includes('version not supported')) {
                throw new Error('FBX file version not supported. Please try a different FBX file or convert to glTF format.');
              } else {
                throw new Error(`FBX loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            break;

          case 'ifc':
            // IFC support temporarily disabled due to WASM loading issues
            throw new Error('IFC support is temporarily disabled. Please use glTF or FBX files.');

          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        // Scale the model first
        const box = new THREE.Box3().setFromObject(loadedModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        
        loadedModel.scale.setScalar(scale);
        
        // Get bounding box after scaling
        const scaledBox = new THREE.Box3().setFromObject(loadedModel);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        
        // Position model so bottom sits at Y=-1 (slightly below ground)
        // The bottom of the model should be at Y=-1, so we move it up by the bottom Y value minus 1
        loadedModel.position.set(-scaledCenter.x, -scaledBox.min.y - 1, -scaledCenter.z);

        // Store the reference points for scaling calculations
        setOriginalBottomY(-scaledBox.min.y);
        setOriginalLeftX(-scaledBox.min.x);
        setOriginalFrontZ(-scaledBox.min.z);
        setModel(loadedModel);
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };

    loadModel();
  }, [url, format]);

  if (!model) {
    return null;
  }

  // Calculate position to keep bottom, left, front surfaces fixed when scaling
  // When scale changes, we need to adjust position to keep bottom-left-front corner fixed
  const adjustedPosition = [
    position[0] - (originalLeftX * (scale[0] - 1)), // Adjust X to keep left surface fixed
    position[1] - (originalBottomY * (scale[1] - 1)), // Adjust Y to keep bottom surface fixed
    position[2] - (originalFrontZ * (scale[2] - 1))  // Adjust Z to keep front surface fixed
  ] as [number, number, number];

  return (
    <group 
      ref={meshRef} 
      position={adjustedPosition as unknown as THREE.Vector3} 
      scale={scale as unknown as THREE.Vector3}
      rotation={rotation.map(r => r * Math.PI / 180) as unknown as THREE.Euler}
    >
      <primitive object={model} />
    </group>
  );
}

// Main ModelViewer component
interface PlacedModel {
  id: string;
  url: string;
  format: 'gltf' | 'glb' | 'fbx';
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

interface ModelViewerProps {
  models?: PlacedModel[];
}

// Camera controller component
function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  React.useEffect(() => {
    const handleCameraViewChange = (event: CustomEvent) => {
      const { view } = event.detail;
      if (!camera || !controlsRef.current) return;

      const controls = controlsRef.current;
      
      // Reset camera position based on view - using proper Three.js coordinate system
      const distance = 8;
      switch (view) {
        case 'front':
          camera.position.set(0, 0, distance);
          controls.target.set(0, 0, 0);
          break;
        case 'back':
          camera.position.set(0, 0, -distance);
          controls.target.set(0, 0, 0);
          break;
        case 'left':
          camera.position.set(-distance, 0, 0);
          controls.target.set(0, 0, 0);
          break;
        case 'right':
          camera.position.set(distance, 0, 0);
          controls.target.set(0, 0, 0);
          break;
        case 'top':
          camera.position.set(0, distance, 0);
          controls.target.set(0, 0, 0);
          break;
        case 'bottom':
          camera.position.set(0, -distance, 0);
          controls.target.set(0, 0, 0);
          break;
      }
      
      // Force update controls
      controls.update();
    };

    window.addEventListener('camera-view-change', handleCameraViewChange as EventListener);
    return () => {
      window.removeEventListener('camera-view-change', handleCameraViewChange as EventListener);
    };
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={50}
    />
  );
}


export default function ModelViewer({ models = [] }: ModelViewerProps) {

  return (
    <div className="w-full h-full flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-900">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          shadows
          gl={{ preserveDrawingBuffer: true }}
        >
          <Suspense fallback={<Loader />}>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            {/* Environment */}
            <Environment preset="studio" />

            {/* Grid */}
            <Grid
              position={[0, -1, 0]}
              args={[10, 10]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#6f6f6f"
              sectionSize={3}
              sectionThickness={1}
              sectionColor="#9d4edd"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid={true}
            />


            {/* Models */}
            {models.map((m) => (
              <Model key={m.id} url={m.url} format={m.format} position={m.position} scale={m.scale} rotation={m.rotation} />
            ))}

            {/* Camera Controller */}
            <CameraController />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
