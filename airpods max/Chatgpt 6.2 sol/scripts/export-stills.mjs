import {writeFileSync} from 'node:fs';
import * as T from 'three';
import {buildModel,finishColors} from '../src/model.js';
import {cameraPose,moveModel,pose} from '../src/choreography.js';

// Three generates its geometry in Node as well. Blender shades the offline frames.
const noop=()=>{};
const context=new Proxy({
  createLinearGradient:()=>({addColorStop:noop}),createPattern:()=>null,
  createImageData:(w,h)=>({data:new Uint8Array(w*h*4)})
},{get:(obj,key)=>obj[key]??noop});
globalThis.document={createElement:()=>({getContext:()=>context})};
const model=buildModel(),point=new T.Vector3();
const snapshots=[['hero',0,2],['finishes',.19,2],['controls',.36,2],['textiles',.55,2],['cushions',.655,1],['engineering',.805,0],['case',1,2],
  ...[0,1,3,4].map(i=>['hero-'+i,0,i])];
const once=new Map();
const shots=snapshots.map(([name,progress,finish])=>{
  cameraPose(progress);
  moveModel(model,progress);
  model.materials.forEach((list,i)=>list.forEach(mat=>mat.color.copy(finishColors[finish][i])));
  model.headphone.updateMatrixWorld(true);
  const meshes=[];
  model.headphone.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry,material=mesh.material;
    if(!once.has(g.uuid)){
      once.set(g.uuid,{verts:Array.from(g.attributes.position.array),indices:g.index?Array.from(g.index.array):null,
        uv:g.attributes.uv?Array.from(g.attributes.uv.array):null});
    }
    const properties={color:material.color.toArray(),metalness:material.metalness,roughness:material.roughness,
      fabric:material.sheen>0?material.alphaMap?'open':'knit':null};
    const push=matrix=>meshes.push({id:g.uuid,matrix:matrix.elements.slice(),properties});
    if(mesh.isInstancedMesh){
      for(let i=0;i<mesh.count;i++){
        const instance=new T.Matrix4();mesh.getMatrixAt(i,instance);push(new T.Matrix4().multiplyMatrices(mesh.matrixWorld,instance));
      }
    }else push(mesh.matrixWorld);
  });
  const [,,,x,y,d]=pose;
  model.cups[1].anchors.crown.getWorldPosition(point);
  let target=[x,y,0],distance=d;
  if(name==='controls'){target=[point.x,point.y-.18,0];distance=3.1}
  if(name==='textiles')distance=3.10;
  if(name==='engineering'){target=[.35,-.40,0];distance=6.45}
  if(name==='cushions')distance=7.15;
  if(name==='case'){target=[0,-.11,0];distance=6.30}
  return {name,progress,target,distance,meshes};
});
writeFileSync(process.argv[2],JSON.stringify({geometry:Object.fromEntries(once),shots}));
