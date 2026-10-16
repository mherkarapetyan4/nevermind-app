import * as THREE from './assets/three.mjs';
import {writeFileSync} from 'node:fs';
const points=[[.42,.08],[.51,.09],[.56,.23],[.59,.41],[.76,.35],[.88,.37],[.91,.46],[.84,.54],[.71,.59],[.81,.62],[.88,.69],[.86,.80],[.75,.82],[.69,.77],[.68,.71],[.32,.71],[.31,.78],[.23,.83],[.12,.79],[.12,.69],[.19,.63],[.30,.60],[.13,.56],[.09,.48],[.13,.38],[.23,.37],[.39,.43],[.37,.24],[.37,.13]].map(([x,y])=>new THREE.Vector2((x-.5)*3.5,(.83-y)*3.5+.16));
const tangents=points.map((p,i)=>{const a=points[(i+28)%29],b=points[(i+1)%29],v=b.clone().sub(a),len=v.length(),h=Math.min(len/6,Math.min(p.distanceTo(a),p.distanceTo(b))*.48);return v.multiplyScalar(h/len)});
const shape=new THREE.Shape();shape.moveTo(points[0].x,points[0].y);points.forEach((p,i)=>{let j=(i+1)%29,a=p.clone().add(tangents[i]),b=points[j].clone().sub(tangents[j]);shape.bezierCurveTo(a.x,a.y,b.x,b.y,points[j].x,points[j].y)});shape.closePath();
// Inflate the original outline into a continuous clay surface, front and back.
// A signed distance field rounds every limb; there are no flat extrusion caps.
const outline=shape.getPoints(10);
function signedDistance(x,y){let inside=false,min=Infinity;for(let i=0,j=outline.length-1;i<outline.length;j=i++) {const a=outline[j],b=outline[i],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,u=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;min=Math.min(min,Math.hypot(x-a.x-u*dx,y-a.y-u*dy));if((a.y>y)!=(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside?min:-min;}
const halfDepth=.46,roundness=.105;
function surfaceZ(x,y){return halfDepth*Math.sqrt(Math.max(0,1-Math.exp(-Math.max(0,signedDistance(x,y))/roundness)));}
const nx=52,ny=52,nz=24,x0=-1.6,y0=0,z0=-.50,dx=3.2/nx,dy=3/ny,dz=1/nz;
const distances=new Float32Array((nx+1)*(ny+1));for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)distances[y*(nx+1)+x]=signedDistance(x0+x*dx,y0+y*dy);
const verts=[],indices=[],lookup=new Map();
function vertex(p){const k=p.map(v=>v.toFixed(5)).join(',');let i=lookup.get(k);if(i===undefined){i=verts.length/3;lookup.set(k,i);verts.push(...p);}return i;}
function tri(a,b,c){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const normal=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];const mid=a.map((v,i)=>(v+b[i]+c[i])/3),e=.0001;const grad=[-(signedDistance(mid[0]+e,mid[1])-signedDistance(mid[0]-e,mid[1]))/ (2*e)*Math.exp(-signedDistance(mid[0],mid[1])/roundness)/roundness,-(signedDistance(mid[0],mid[1]+e)-signedDistance(mid[0],mid[1]-e))/(2*e)*Math.exp(-signedDistance(mid[0],mid[1])/roundness)/roundness,2*mid[2]/(halfDepth*halfDepth)];if(normal.reduce((v,n,i)=>v+n*grad[i],0)<0)[b,c]=[c,b];indices.push(vertex(a),vertex(b),vertex(c));}
const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){if(Math.max(distances[y*(nx+1)+x],distances[y*(nx+1)+x+1],distances[(y+1)*(nx+1)+x],distances[(y+1)*(nx+1)+x+1])<0)continue;for(let z=0;z<nz;z++){const ps=corners.map(([a,b,c])=>[x0+(x+a)*dx,y0+(y+b)*dy,z0+(z+c)*dz]);const fs=corners.map(([a,b,c])=>Math.exp(-distances[(y+b)*(nx+1)+x+a]/roundness)+Math.pow((z0+(z+c)*dz)/halfDepth,2)-1);if(fs.every(f=>f>=0)||fs.every(f=>f<0))continue;
for(const tet of tets){const ins=tet.filter(i=>fs[i]<0),out=tet.filter(i=>fs[i]>=0);if(!ins.length||!out.length)continue;const cross=(a,b)=>{const u=fs[a]/(fs[a]-fs[b]);return ps[a].map((v,k)=>v+(ps[b][k]-v)*u)};if(ins.length===1){tri(...out.map(b=>cross(ins[0],b)))}else if(ins.length===3){tri(...ins.map(a=>cross(a,out[0])))}else{const a=cross(ins[0],out[0]),b=cross(ins[0],out[1]),c=cross(ins[1],out[0]),d=cross(ins[1],out[1]);tri(a,b,c);tri(b,d,c);}}}}
// Relax the sampled surface so the clay has no triangulation creases.
const neighbors=Array.from({length:verts.length/3},()=>new Set());for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);}
for(let iteration=0;iteration<24;iteration++){const next=verts.slice(),weight=.42;for(let i=0;i<neighbors.length;i++){const n=neighbors[i];if(!n.size)continue;for(let k=0;k<3;k++){let sum=0;for(const j of n)sum+=verts[j*3+k];next[i*3+k]=verts[i*3+k]+weight*(sum/n.size-verts[i*3+k]);}}for(let i=0;i<verts.length;i++)verts[i]=next[i];}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();

const position=geometry.attributes.position.array;
const normal=geometry.attributes.normal.array;
const index=new Uint32Array(geometry.index.array);
writeFileSync(new URL('./assets/mascot.bin',import.meta.url),Buffer.concat([Buffer.from(position.buffer),Buffer.from(normal.buffer),Buffer.from(index.buffer)]));
writeFileSync(new URL('./assets/mascot-geometry.json',import.meta.url),JSON.stringify({vertexCount:position.length/3,indexCount:index.length,eyes:[[.49,.565],[.565,.548]].map(([x,y])=>{const px=(x-.5)*3.5,py=(.83-y)*3.5+.16;return [px,py,surfaceZ(px,py)+.012]})}));
console.log('Baked compact mascot',position.length/3,'vertices');
