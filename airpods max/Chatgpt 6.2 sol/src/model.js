import * as T from 'three';

const {sin,cos,pow,abs,PI,sign} = Math;
const V = (x,y,z) => new T.Vector3(x,y,z);
const mat = (color, extras={}) => new T.MeshPhysicalMaterial({color,...extras});
const dark = mat('#222b36',{roughness:.45});
const black = mat('#080d14',{roughness:.65});
const steel = mat('#d3d8dc',{metalness:1,roughness:.06});
const gunmetal = mat('#4e5967',{metalness:.78,roughness:.28});
const gold = mat('#a47a48',{metalness:.75,roughness:.38});
const alloy = mat('#86909b',{metalness:.89,roughness:.27});

export const finishes = [
  ['Silver','#dce0e3','#c9cdd0','#dededb','#e4e4e2','#c6c7c5'],
  ['Space Gray','#53565e','#565960','#34383e','#383b42','#32383f'],
  ['Sky Blue','#9bb0c4','#91abc3','#26465e','#29475d','#294b64'],
  ['Pink','#e4a49a','#e0aaa2','#b64349','#c65b60','#bf5557'],
  ['Green','#b9c7ba','#bdc9bc','#c7d0b9','#ced7c3','#b9c6ad']
];
export const finishColors = finishes.map(row=>row.slice(2).map(hex=>new T.Color(hex)));
const tile = (w,h,paint,srgb=false) => {
  const c=document.createElement('canvas'); c.width=w;c.height=h;
  paint(c.getContext('2d'),w,h);
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  return t;
};

function grain(){
  return tile(192,192,(ctx,w,h)=>{
    const im=ctx.createImageData(w,h);
    let seed=49381;
    for(let i=0;i<im.data.length;i+=4){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const v=99+(seed>>>26);
      im.data.set([v,v,v,255],i);
    }
    ctx.putImageData(im,0,0);
  });
}
function weave(mode){
  return tile(256,256,(ctx,w,h)=>{
    ctx.fillStyle=mode==='alpha'?'#090909':mode==='bump'?'#333':'#919191';
    ctx.fillRect(0,0,w,h);
    for(let y=-1;y<=16;y++)for(let x=-1;x<=16;x++){
      ctx.save();ctx.translate(x*16+(y%2)*8,y*16);ctx.rotate((y%2?1:-1)*.69);
      const grad=ctx.createLinearGradient(0,-4,0,4);
      const colors=mode==='alpha'?['#bebebe','#fff','#b0b0b0']:mode==='bump'?['#777','#eee','#666']:['#c3c3c3','#fafafa','#ababab'];
      grad.addColorStop(0,colors[0]);grad.addColorStop(.43,colors[1]);grad.addColorStop(1,colors[2]);
      ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,10,4.1,0,0,PI*2);ctx.fill();
      if(mode==='color'){
        ctx.strokeStyle='#ffffff4a';ctx.lineWidth=.55;
        for(const offset of [-2,0,2]){ctx.beginPath();ctx.moveTo(-6,offset);ctx.lineTo(6,offset);ctx.stroke();}
      }
      ctx.restore();
    }
  },mode==='color');
}
const repeated = (map,x,y) => {const copy=map.clone();copy.repeat.set(x,y);return copy;};
const superCoord = (v,n) => sign(v)*pow(abs(v),n);
const outline = (a,w,h,n=.65) => [w*superCoord(cos(a),n),h*superCoord(sin(a),n)];

function skin(w,h,rings,exponent=.65){
  const count=96,positions=[],uvs=[],indices=[];
  for(let j=0;j<rings.length;j++){
    const [radius,z]=rings[j];
    for(let i=0;i<=count;i++){
      const [x,y]=outline(i/count*PI*2,w*radius,h*radius,exponent);
      positions.push(x,y,z);uvs.push(i/count,j/(rings.length-1));
      if(j&&i){const k=j*(count+1)+i;indices.push(k-count-2,k-count-1,k,k-count-2,k,k-1);}
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  // The split UV seam shares the same smooth normal on each side.
  const n=g.attributes.normal;
  for(let j=0;j<rings.length;j++){
    const first=j*(count+1),last=first+count;
    const v=V(n.getX(first)+n.getX(last),n.getY(first)+n.getY(last),n.getZ(first)+n.getZ(last)).normalize();
    n.setXYZ(first,v.x,v.y,v.z);n.setXYZ(last,v.x,v.y,v.z);
  }
  return g;
}

function mesh(parent,geo,material,x=0,y=0,z=0){
  const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;
}
function group(parent,x=0,y=0,z=0){
  const o=new T.Group();o.position.set(x,y,z);parent.add(o);return o;
}
function tube(parent,points,r,material,segments=36){
  return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,10,false),material);
}
function roundShape(w,h,r){
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function extrusion(parent,shape,depth,bevel,material,x=0,y=0,z=0){
  return mesh(parent,new T.ExtrudeGeometry(shape,{
    depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:5,curveSegments:32
  }),material,x,y,z);
}
function cylZ(parent,rt,rb,depth,material,x=0,y=0,z=0){
  const m=mesh(parent,new T.CylinderGeometry(rt,rb,depth,64),material,x,y,z);
  m.rotation.x=PI/2;return m;
}
function ringZ(parent,rm,profile,material,z){
  const r=mesh(parent,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x*rm,y)),96),material,0,0,z);
  r.rotation.x=PI/2;return r;
}
function anchor(parent,x,y,z){return group(parent,x,y,z);}

export function buildModel(){
  const headphone=new T.Group(), shellGrain=grain(), clothColor=weave('color'), clothBump=weave('bump');
  const shellMat=mat(0xffffff,{metalness:.92,roughness:.25,bumpMap:repeated(shellGrain,5,2),bumpScale:.003,clearcoat:.16,clearcoatRoughness:.32});
  shellMat.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      #ifdef USE_BUMPMAP
        float aluminumGrain = texture2D( bumpMap, vBumpMapUv ).r - 0.5;
        roughnessFactor = clamp( roughnessFactor + aluminumGrain * 0.19, 0.22, 0.28 );
      #endif`
    );
  };
  const padMat=mat(0xffffff,{roughness:.87,sheen:.95,sheenRoughness:.79,map:repeated(clothColor,12,3),bumpMap:repeated(clothBump,12,3),bumpScale:.021});
  const bandMat=mat(0xffffff,{roughness:.55,clearcoat:.09});
  const caseMat=mat(0xffffff,{roughness:.81,bumpMap:repeated(shellGrain,1,1),bumpScale:.01});
  const canopyMat=mat(0xffffff,{
    roughness:.89,side:T.DoubleSide,map:repeated(clothColor,8,3),bumpMap:repeated(clothBump,8,3),
    bumpScale:.013,alphaMap:repeated(weave('alpha'),8,3),alphaTest:.39,sheen:.7
  });
  const seams=mat('#263645',{roughness:.65});
  const liningMat=mat(0xffffff,{roughness:.9});
  const arch=(a,z,yAdjust=0)=>V(1.30*cos(a),.31+1.37*sin(a)+yAdjust,z);
  const archRail=(a,side)=>arch(a,side*(.065+.225*pow(sin(a),1.1)));
  for(const side of [-1,1]){
    tube(headphone,Array.from({length:65},(_,i)=>archRail(i/64*PI,side)),.064,bandMat,104);
  }
  const pos=[],uv=[],faces=[],across=22,along=96;
  for(let i=0;i<=along;i++){
    const a=.36+i/along*(PI-.72),width=.065+.225*pow(sin(a),1.1);
    for(let j=0;j<=across;j++){
      const t=j/across*2-1,p=arch(a,t*width,-.125*(1-t*t)*sin(a));
      pos.push(...p.toArray());uv.push(i/along,j/across);
      if(i&&j){const k=i*(across+1)+j;faces.push(k-across-2,k-across-1,k,k-across-2,k,k-1);}
    }
  }
  const canopyGeo=new T.BufferGeometry();
  canopyGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  canopyGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  canopyGeo.setIndex(faces);canopyGeo.computeVertexNormals();
  const canopy=mesh(headphone,canopyGeo,canopyMat);
  const arms=[];
  for(const side of [-1,1]){
    const x=side*1.30;
    const sleeve=mesh(headphone,new T.CapsuleGeometry(.126,.20,8,28),bandMat,x,.45,0);
    sleeve.scale.z=.81;sleeve.rotation.z=side*.09;
    mesh(headphone,new T.CylinderGeometry(.113,.106,.05,48),steel,x,.272,0).scale.z=.86;
    const arm=group(headphone,x,.113,0);
    tube(arm,[V(0,.20,0),V(0,.071,0),V(-side*.016,-.049,0),V(-side*.052,-.098,0)],.052,steel,30);
    arms.push(arm);
  }

  const shellGeometry=skin(.650,.775,[[.0001,-.351],[.25,-.349],[.53,-.344],[.73,-.332],[.85,-.312],[.94,-.275],[.989,-.22],[1,-.157],[1,-.092],[.99,-.036],[.974,-.005],[.943,.013],[.86,.019],[.0001,.020]]);
  const trimGeometry=skin(.653,.778,[[.964,-.014],[.988,.005],[.991,.042],[.975,.058],[.88,.064],[.0001,.065]]);
  const padGeometry=skin(.653,.773,[[.66,.039],[.92,.04],[.985,.066],[1,.117],[1.007,.174],[.985,.237],[.94,.29],[.88,.327],[.799,.344],[.723,.338],[.65,.314],[.602,.277],[.574,.225],[.568,.155],[.57,.08],[.60,.04],[.66,.039]]);
  const plateGeometry=skin(.624,.75,[[.93,-.027],[.97,-.012],[.98,.008],[.97,.025],[.93,.043],[.87,.050],[.70,.053],[.59,.039],[.52,.019],[.0001,.016]]);
  const slotGeometry=new T.CapsuleGeometry(.016,.086,6,14);
  const perforationGeo=new T.CircleGeometry(.029,18);
  const perforations=[];
  for(let y=-5;y<=5;y++)for(let x=-4;x<=4;x++){
    const px=x*.072+(y%2)*.036,py=y*.066;
    if((px/.33)**2+(py/.38)**2<1)perforations.push([px,py]);
  }
  const tmp=new T.Object3D();
  const cups=[-1,1].map((side,index)=>{
    const pivot=group(headphone,side*1.248,.055,0);
    pivot.rotation.order='ZYX';
    const body=group(pivot,0,-.70,0);
    const shell=group(body);
    mesh(shell,shellGeometry,shellMat);
    const rim=mesh(shell,trimGeometry,seams);rim.position.z=-.032;
    const mount=mesh(shell,new T.SphereGeometry(.105,36,20),gunmetal,0,.716,-.105);mount.scale.set(.92,.56,1.05);
    for(const [x,y,z,rz] of [[-.39,.55,-.246,-.62],[.31,-.622,-.25,-.52],[-.29,-.656,-.235,.65]]){
      const slit=mesh(shell,slotGeometry,black,x,y,z);slit.rotation.z=rz;
      slit.scale.z=.29;
    }
    if(side===1){
      const port=extrusion(shell,roundShape(.16,.039,.019),.003,.006,black,.08,-.748,-.14);port.rotation.x=1.25;
    }
    const crownSocket=group(shell,-.275,.7,-.109);crownSocket.rotation.z=.31;
    const crown=group(crownSocket);
    mesh(crownSocket,new T.CylinderGeometry(.119,.122,.035,64),black);
    mesh(crown,new T.CylinderGeometry(.104,.113,.061,72),alloy,0,.037,0);
    mesh(crown,new T.CylinderGeometry(.094,.104,.017,72),shellMat,0,.075,0);
    const ridges=new T.InstancedMesh(new T.CapsuleGeometry(.006,.037,3,6),steel,64);
    for(let i=0;i<64;i++){
      const a=i/64*PI*2;
      tmp.position.set(.106*cos(a),.036,.106*sin(a));tmp.rotation.set(0,-a,-.11);
      tmp.updateMatrix();ridges.setMatrixAt(i,tmp.matrix);
    }
    crown.add(ridges);
    crownSocket.visible=side===1;
    const modeSocket=group(shell,.302,.688,-.104);modeSocket.rotation.z=-.31;
    for(const [w,h,y,m] of [[.222,.094,.010,black],[.193,.074,.037,shellMat]]){
      const button=extrusion(modeSocket,roundShape(w,h,h/2),.008,.008,m,0,y,0);
      button.rotation.x=-PI/2;
    }
    modeSocket.visible=side===1;

    const electronics=group(body,0,0,-.14);
    const circuit=mat('#252c28',{roughness:.48,metalness:.22});
    extrusion(electronics,roundShape(.87,1.23,.23),.046,.023,circuit);
    const chip=extrusion(electronics,roundShape(.239,.235,.02),.046,.009,black,-.15,.24,.067);
    const chipLabel=tile(128,128,(ctx)=>{
      ctx.fillStyle='#222831';ctx.fillRect(0,0,128,128);ctx.fillStyle='#b4b9bc';
      ctx.font='38px sans-serif';ctx.textAlign='center';ctx.fillText('H1',64,77);
    },true);
    mesh(chip,new T.PlaneGeometry(.208,.208),mat(0xffffff,{map:chipLabel}),0,0,.056);
    for(const [x,y,w,h] of [[.185,.1,.19,.31],[-.1,-.34,.42,.30],[.11,.36,.13,.14],[-.27,-.19,.12,.15]]){
      extrusion(electronics,roundShape(w,h,.02),.043,.011,dark,x,y,.061);
    }
    for(let i=0;i<17;i++){
      const x=(i%8)*.082-.29,y=i<8?.492:i<16?-.51:0;
      mesh(electronics,new T.BoxGeometry(.038,.029,.016),i%3===0?alloy:gold,x,y,.074);
    }
    for(const s of [-1,1]){
      tube(electronics,[V(s*.15,.48,.07),V(s*.39,.37,.08),V(s*.38,-.31,.08),V(s*.17,-.52,.07)],.024,gold);
      tube(electronics,[V(s*.05,.64,.02),V(s*.29,.60,.067),V(s*.31,.41,.08)],.016,black);
    }

    const driver=group(body,0,0,-.065);
    cylZ(driver,.402,.415,.091,gunmetal,0,0,.01);
    const magnetProfile=[[.76,-.035],[.96,-.035],[1,-.02],[1,.025],[.78,.025],[.76,-.035]];
    ringZ(driver,.365,magnetProfile,alloy,.069);
    ringZ(driver,.263,magnetProfile,gunmetal,.087);
    const diaphragm=mesh(driver,new T.SphereGeometry(.304,64,24),mat('#252b33',{metalness:.39,roughness:.39}),0,0,.098);
    diaphragm.scale.z=.125;
    ringZ(driver,.32,[[.85,-.019],[1,0],[.98,.021],[.85,-.019]],black,.112);

    const baffle=group(body,0,0,.025);
    mesh(baffle,plateGeometry,gunmetal);
    mesh(baffle,skin(.618,.744,[[.91,.017],[.96,.024],[.974,.036],[.961,.049],[.92,.053],[.91,.017]]),alloy);
    const holes=new T.InstancedMesh(perforationGeo,black,perforations.length);
    perforations.forEach(([x,y],i)=>{
      tmp.position.set(x,y,.019);tmp.rotation.set(0,0,0);tmp.updateMatrix();holes.setMatrixAt(i,tmp.matrix);
    });baffle.add(holes);
    for(const [x,y] of [[.42,.36],[-.42,.36],[.42,-.36],[-.42,-.36]]){
      cylZ(baffle,.036,.038,.017,alloy,x,y,.055);
      const thread=mesh(baffle,new T.BoxGeometry(.036,.006,.001),black,x,y,.064);thread.rotation.z=.3;
    }
    extrusion(baffle,roundShape(.04,.15,.02),.012,.008,black,-.439,.04,.05);
    cylZ(baffle,.026,.026,.01,black,.42,.16,.054);

    const cushion=group(body);
    mesh(cushion,padGeometry,padMat);
    mesh(cushion,skin(.604,.725,[[.92,.037],[.97,.06],[.88,.077],[.66,.084],[.54,.087],[.53,.039],[.92,.037]]),seams);
    const letter=tile(512,512,(ctx,w,h)=>{
      ctx.fillStyle='#b4b4b4';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#535353';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 235px Arial';ctx.fillText(index===0?'L':'R',w/2,h/2+12);
      ctx.globalAlpha=.67;ctx.fillStyle=clothColor.image?ctx.createPattern(clothColor.image,'repeat'):'#bcbcbc';ctx.fillRect(0,0,w,h);
    },true);
    letter.wrapS=letter.wrapT=T.ClampToEdgeWrapping;
    const innerMat=mat(0xffffff,{map:letter,bumpMap:repeated(clothBump,3,4),bumpScale:.008,roughness:.94,side:T.DoubleSide});
    const innerShape=roundShape(.78,.97,.22);
    const innerGeo=new T.ShapeGeometry(innerShape,36);
    const p=innerGeo.attributes.position,uv=innerGeo.attributes.uv;
    for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/.78+.5,p.getY(i)/.97+.5);
    mesh(cushion,innerGeo,innerMat,0,0,.083);
    return {pivot,shell,electronics,driver,baffle,cushion,crown,innerMat,anchors:{
      crown:anchor(crownSocket,0,.084,0),mode:anchor(modeSocket,0,.048,0),
      shell:anchor(shell,0,-.44,-.26),electronics:anchor(electronics,0,.31,.09),
      driver:anchor(driver,0,-.28,.09),baffle:anchor(baffle,0,.43,.06),cushion:anchor(cushion,0,-.50,.24)
    }};
  });

  const smartCase=group(headphone);
  for(const s of [-1,1]){
    const g=group(smartCase,s*.67,0,0);g.rotation.z=s*-.20;
    const panel=new T.Shape();
    panel.moveTo(-.65,.15);panel.bezierCurveTo(-.61,.52,-.39,.66,-.05,.66);
    panel.bezierCurveTo(.35,.66,.58,.46,.73,.10);panel.bezierCurveTo(.72,-.11,.56,-.39,.43,-.54);
    panel.bezierCurveTo(.24,-.78,-.09,-.79,-.37,-.65);panel.bezierCurveTo(-.55,-.57,-.63,-.42,-.65,-.18);panel.closePath();
    if(s<0)g.scale.x=-1;
    extrusion(g,panel,.045,.04,caseMat,0,0,.360);
    extrusion(g,panel,.047,.032,liningMat,0,0,-.36);
    const perimeter=panel.getPoints(55).map(p=>V(p.x*.974,p.y*.974,.421));
    tube(g,perimeter,.007,caseMat,72);
    const lowerLip=skin(.67,.71,[[.98,-.31],[1,-.30],[1,.346],[.97,.356]],.79);
    const lip=mesh(g,lowerLip,caseMat,0,-.024,-.006);
    const index=lowerLip.index.array;
    const normals=lowerLip.attributes.position;
    const bottomTriangles=[];
    for(let i=0;i<index.length;i+=3)if(normals.getY(index[i])+normals.getY(index[i+1])+normals.getY(index[i+2]) < -.32)bottomTriangles.push(index[i],index[i+1],index[i+2]);
    lip.geometry.setIndex(bottomTriangles);
  }
  extrusion(smartCase,roundShape(.26,.96,.11),.48,.035,caseMat,0,.04,-.305);
  const flap=group(smartCase,0,.57,.424);
  extrusion(flap,roundShape(1.53,.69,.22),.035,.021,seams,0,-.325,0);
  extrusion(flap,roundShape(1.49,.66,.21),.032,.018,caseMat,0,-.313,.014);

  return {headphone,arms,canopy,cups,smartCase,flap,materials:[
    [shellMat],[bandMat,canopyMat],[padMat,...cups.map(c=>c.innerMat)],[caseMat,liningMat]
  ]};
}
