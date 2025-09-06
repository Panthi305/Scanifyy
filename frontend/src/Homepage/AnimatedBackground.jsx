// src/components/AnimatedBackground.jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { softShadows, OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Apply soft shadows globally
softShadows();

const Particles = () => {
  const meshRef = useRef();
  const count = 500; // Number of particles
  const particles = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    particles[i * 3] = (Math.random() - 0.5) * 10; // x
    particles[i * 3 + 1] = (Math.random() - 0.5) * 10; // y
    particles[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
  }

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the particle system
      meshRef.current.rotation.x += 0.0005;
      meshRef.current.rotation.y += 0.0008;

      // Make particles subtly move
      const positions = meshRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.0001;
        positions[i * 3 + 1] += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.0001;
        positions[i * 3 + 2] += Math.sin(state.clock.elapsedTime * 0.5 + i * 2) * 0.0001;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={particles.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color="#8B5CF6" // Purple glow
        size={0.03}
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

const AnimatedBackground = () => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: '#0A0A0A' }} // Very dark background
      >
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          castShadow
          intensity={1}
          color="#3B82F6" // Blue light
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" /> {/* Purple point light */}

        <Particles />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
};

export default AnimatedBackground;