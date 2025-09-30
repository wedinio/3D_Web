'use client';

import React, { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, useProgress } from '@react-three/drei';
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
function Model({ url, format, position = [0,0,0], scale = [1,1,1] }: { url: string; format: string; position?: [number, number, number]; scale?: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Object3D | null>(null);

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
            const gltf = await new Promise<unknown>((resolve, reject) => {
              gltfLoader.load(url, resolve, undefined, reject);
            });
            loadedModel = (gltf as any).scene;
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

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        loadedModel.position.sub(center);
        loadedModel.scale.setScalar(scale);
        loadedModel.position.multiplyScalar(scale);

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

  return (
    <group ref={meshRef} position={position as unknown as THREE.Vector3} scale={scale as unknown as THREE.Vector3}>
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
}

interface ModelViewerProps {
  models?: PlacedModel[];
}

export default function ModelViewer({ models = [] }: ModelViewerProps) {

  return (
    <div className="w-full h-full flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-900">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          shadows
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
              <Model key={m.id} url={m.url} format={m.format} position={m.position} scale={m.scale} />
            ))}

            {/* Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={50}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
