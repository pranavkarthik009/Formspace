import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

function parseGltf(file, extension) {
  const loader = new GLTFLoader();
  if (extension === ".glb") {
    return file.arrayBuffer().then((buffer) => loader.parseAsync(buffer, ""));
  }
  return file.text().then((text) => {
    const json = JSON.parse(text);
    const externalUris = [
      ...(json.buffers || []).map((item) => item.uri),
      ...(json.images || []).map((item) => item.uri),
    ].filter((uri) => uri && !uri.startsWith("data:"));
    if (externalUris.length) {
      throw new Error("This .gltf references separate files. Upload a self-contained .glb instead.");
    }
    return loader.parseAsync(text, "");
  });
}

function parseModel(file, extension) {
  if (extension === ".glb" || extension === ".gltf") return parseGltf(file, extension);
  if (extension === ".stl") {
    return file.arrayBuffer().then((buffer) => {
      const geometry = new STLLoader().parse(buffer);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0xbfc8c2, metalness: 0.12, roughness: 0.58 }),
      );
      return { scene: mesh };
    });
  }
  if (extension === ".obj") {
    return file.text().then((text) => ({ scene: new OBJLoader().parse(text) }));
  }
  if (extension === ".fbx") {
    return file.arrayBuffer().then((buffer) => ({ scene: new FBXLoader().parse(buffer, "") }));
  }
  throw new Error("That file type isn't supported.");
}

function exportGlb(scene) {
  const exporter = new GLTFExporter();
  return exporter.parseAsync(scene, { binary: true, onlyVisible: true });
}

function makeMaterialsExportable(scene) {
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const convertMaterial = (material) => {
      if (!material || material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) return material;
      const standard = new THREE.MeshStandardMaterial({
        color: material.color ?? 0xbfc8c2,
        map: material.map ?? null,
        metalness: 0.05,
        roughness: 0.68,
        opacity: material.opacity ?? 1,
        transparent: material.transparent ?? false,
        side: material.side ?? THREE.FrontSide,
      });
      return standard;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(convertMaterial)
      : convertMaterial(node.material);
  });
}

export async function convertToGlb(file, units) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  try {
    const parsed = await parseModel(file, extension);
    const scale = extension === ".glb" || extension === ".gltf"
      ? 1
      : units === "mm" ? 0.001 : units === "cm" ? 0.01 : 1;
    parsed.scene.scale.multiplyScalar(scale);
    makeMaterialsExportable(parsed.scene);
    const output = await exportGlb(parsed.scene);
    return new File([output], `${file.name.replace(/\.[^.]+$/, "")}.glb`, { type: "model/gltf-binary" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("This .gltf")) throw error;
    throw new Error("We couldn't read this model. Check that it is valid and try another file.");
  }
}
