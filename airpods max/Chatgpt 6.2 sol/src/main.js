import * as T from 'three';
import {buildModel,finishes,finishColors} from './model.js';
import {cameraPose,moveModel,pose} from './choreography.js';
import './style.css';

const chapters = [
  {id:'overview', name:'Overview', eyebrow:'THE ORIGINAL OVER-EAR DESIGN', title:'AirPods Max', caption:'Sound, shaped.', body:'A closer look at the materials, controls, and acoustics of the original AirPods Max.'},
  {id:'finishes', name:'Finishes', eyebrow:'ANODIZED ALUMINUM', title:'Five finishes.', caption:'Explore the palette.', body:'Five color-matched finishes, from the aluminum cups to the knit canopy and Smart Case.'},
  {id:'controls', name:'Controls', eyebrow:'PRECISION CONTROLS', title:'Sound at your fingertips.', caption:'Controls within reach.', body:'Two tactile controls sit on top of the right ear cup.'},
  {id:'textiles', name:'Textiles', eyebrow:'KNIT MESH & MEMORY FOAM', title:'Comfort, woven in.', caption:'Made for long listens.', body:'A breathable knit canopy distributes weight across the head. Textile cushions surround the ears with memory foam.'},
  {id:'cushions', name:'Magnetic cushions', eyebrow:'MAGNETIC ATTACHMENT', title:'A closer fit.', caption:'Lift. Align. Snap.', body:'Lift the knit cushions to reveal the acoustic grille, sensors, and magnetic mounting points.'},
  {id:'engineering', name:'Engineering', eyebrow:'INSIDE THE EAR CUP', title:'Anatomy of sound.', caption:'From shell to sound.', body:'Scroll to separate the aluminum shell, electronics, driver, acoustic baffle, and cushion.'},
  {id:'smart-case', name:'Smart Case', eyebrow:'SMART CASE', title:'Rest easy.', caption:'Up to 20 hours.', body:'The original AirPods Max weigh 384.8 g. The Smart Case puts them into an ultralow-power state.'}
];
const breaks=[0,.12,.26,.44,.58,.72,.88,1];
const stops=[0,.19,.36,.49,.655,.805,1];
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const viewport=$('viewport'),sticky=viewport.parentElement;
const swatches=[], chapterButtons=[];
let stage=-1, selectedFinish=-1, displayedFinish=-1;
let targetProgress=0, progress=0,lastFrame=0,frame=0;
let pointerX=0,pointerY=0,goalX=0,goalY=0, model, scene,camera,renderer,key,rim,shadow;
let width=0,height=0, mobile=false;
let announcementStage=-1;
const color=new T.Color(), projected=new T.Vector3(), cameraTarget=new T.Vector3(), sourcePoint=new T.Vector3();
const clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
const smooth=(min,max,x)=>T.MathUtils.smoothstep(x,min,max);

chapters.forEach((item,index)=>{
  const btn=document.createElement('button');
  btn.type='button';btn.setAttribute('aria-label',item.name);btn.title=item.name;
  btn.addEventListener('click',()=>navigate(index));$('chapters').append(btn);chapterButtons.push(btn);
});
finishes.forEach(([name,hex],index)=>{
  const btn=document.createElement('button');
  btn.type='button';btn.setAttribute('aria-label',name);btn.title=name;
  btn.style.setProperty('--swatch',hex);
  btn.addEventListener('click',()=>{selectedFinish=index;showFinish(index);wake()});
  $('swatches').append(btn);swatches.push(btn);
});
document.querySelectorAll('[data-stage]').forEach(link=>{
  link.addEventListener('click',e=>{e.preventDefault();navigate(Number(link.dataset.stage));});
});
$('advance').addEventListener('click',()=>navigate((stage+1)%chapters.length));
const navLinks=[...document.querySelectorAll('.header nav a')];
const poster=$('fallback').querySelector('img');
const posters=[
  ['hero','AirPods Max viewed from the front at an angle'],
  ['finishes','AirPods Max in the Sky Blue finish'],
  ['controls','Macro view of the right ear cup controls'],
  ['textiles','Close-up of the inner ear cushion and textile lining'],
  ['cushions','Both ear cushions detached from their acoustic housings'],
  ['engineering','Exploded AirPods Max ear cup with separated acoustic and electronic layers'],
  ['case','Sky Blue AirPods Max seated in the closed Smart Case']
];
function showPoster(){
  if($('fallback').hidden||stage<0)return;
  const [name,description]=posters[stage];
  const showVariation=stage<=1&&displayedFinish!==2;
  const file=showVariation?'hero-'+displayedFinish:name;
  const url='/stills/'+file+'.webp';
  if(poster.getAttribute('src')!==url)poster.src=url;
  poster.alt=showVariation?finishes[displayedFinish][0]+' AirPods Max viewed from the front at an angle':description;
}
function showFallback(){
  $('fallback').hidden=false;
  showPoster();
}


function navigate(index,updateLocation=true){
  if(updateLocation)history.replaceState(null,'','#'+chapters[index].id);
  window.scrollTo({top:stops[index]*$('scroll-track').offsetHeight,behavior:reduced.matches?'instant':'smooth'});
}
function readScroll(){
  targetProgress=clamp(window.scrollY/$('scroll-track').offsetHeight,0,1);
  wake();
}
function wake(){
  if(!frame && !document.hidden)frame=requestAnimationFrame(render);
}
function showFinish(index){
  if(displayedFinish===index)return;
  displayedFinish=index;
  $('finish-name').value=finishes[index][0];
  swatches.forEach((btn,i)=>btn.setAttribute('aria-pressed',String(i===index)));
  showPoster();
}
function showChapter(index){
  if(stage===index)return;
  stage=index;sticky.dataset.active=index;
  const content=chapters[index];
  $('kicker').textContent=content.eyebrow;
  $('title').textContent=content.title;
  $('caption-title').textContent=content.caption;
  $('caption-body').textContent=content.body;
  $('chapter').textContent=String(index+1).padStart(2,'0');
  $('final-link').hidden=index!==6;
  $('advance').firstChild.textContent=index===6?'Back to top ':index===0?'Scroll to explore ':'Next chapter ';
  chapterButtons.forEach((btn,i)=>btn.toggleAttribute('aria-current',i===index));
  navLinks.forEach(link=>link.toggleAttribute('aria-current',Number(link.dataset.stage)===index));
  const heading=$('title').parentNode;heading.classList.remove('swap');
  requestAnimationFrame(()=>heading.classList.add('swap'));
  updateAnnotations(index);
  showPoster();
}
const specAnnotations={
  2:[
    ['crown','Digital Crown','Turn for volume. Press for playback and track navigation. Hold for Siri.'],
    ['mode','Noise Control','Switch between Active Noise Cancellation and Transparency mode.']
  ],
  5:[
    ['shell','Anodized aluminum',''],
    ['electronics','H1 & sensors',''],
    ['driver','40 mm driver',''],
    ['baffle','Acoustic baffle',''],
    ['cushion','Knit cushion','']
  ]
};
const drawing=[];
function updateAnnotations(index){
  if(index===announcementStage)return;
  announcementStage=index;
  drawing.length=0;$('annotations').replaceChildren();$('leaders').replaceChildren();
  for(const [key,label,description] of specAnnotations[index]??[]){
    const card=document.createElement('div'),strong=document.createElement('b');
    card.className='annotation';strong.textContent=label;card.append(strong);
    if(description)card.append(document.createTextNode(description));
    const make=tag=>document.createElementNS('http://www.w3.org/2000/svg',tag);
    const path=make('path'),dot=make('circle');dot.setAttribute('r',3);
    $('annotations').append(card);$('leaders').append(path,dot);
    drawing.push({key,card,path,dot});
  }
}
function drawAnnotations(alpha){
  if(!drawing.length)return;
  $('annotations').style.opacity=alpha;$('leaders').style.opacity=alpha;
  if(alpha<.002)return;
  drawing.forEach(({key,card,path,dot},index)=>{
    model.cups[1].anchors[key].getWorldPosition(projected);
    projected.project(camera);
    const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
    let cx,cy;
    if(stage===2){
      cx=mobile?index*width*.5+12:index?width*.75:width*.11;
      cy=mobile?height-172:height*(index?.56:.36);
    }else{
      const upper=index%2===1,w=card.offsetWidth;
      cx=clamp(x-w*.5,12,width-w-12);
      if(mobile){
        cx=width*(index%2)*.5+10;
        cy=index<2?height*.22:height*.70+Math.floor((index-2)/2)*35;
      }else{cy=height*(upper?.27:.69); }
    }
    const cw=card.offsetWidth,ch=card.offsetHeight;
    cx=clamp(cx,9,width-cw-9);cy=clamp(cy,8,height-ch-68);
    card.style.transform='translate('+cx+'px,'+cy+'px)';
    const ex=clamp(x,cx+8,cx+cw-8),ey=y<cy?cy:cy+ch;
    const elbow=ey+(y-ey)*.45;
    path.setAttribute('d','M '+x+' '+y+' L '+x+' '+elbow+' L '+ex+' '+ey);
    path.style.strokeDasharray=''+Math.max(1,Math.hypot(ex-x,ey-y)*1.2*alpha)+' 500';
    dot.setAttribute('cx',x);dot.setAttribute('cy',y);
  });
}


function drawPosterLabels(){
  if(model||!drawing.length)return;
  if(stage!==2){$('annotations').style.opacity=0;return;}
  $('annotations').style.opacity=1;
  $('leaders').style.opacity=0;
  drawing.forEach(({card},index)=>{
    const x=mobile?width*index*.5+9:index?width*.77:width*.10;
    const y=mobile?height-172:height*(index?.55:.37);
    card.style.transform='translate('+x+'px,'+y+'px)';
  });
}

function studioMap(){
  const studio=new T.Scene();
  studio.background=new T.Color('#737f93');
  const panels=[
    [-3,3,4,5,3,3.4,0xfff8ee],[4,1,3,1.5,5,2.8,0xd8ebff],
    [2,2,-4,4,3,3.7,0xe2f0ff],[-3,-1,-2,2,4,.8,0xa7bad6],
    [0,5,0,4,3,2.6,0xffffff],[0,-4,1,6,4,.62,0xc4d8ee]
  ];
  for(const [x,y,z,w,h,intensity,hex] of panels){
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(hex).multiplyScalar(intensity),side:T.DoubleSide}));
    m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);
  }
  const pmrem=new T.PMREMGenerator(renderer);
  const map=pmrem.fromScene(studio,.06,.1,40);
  pmrem.dispose();
  studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  return map.texture;
}

function initScene(){
  try{
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.13;renderer.outputColorSpace=T.SRGBColorSpace;
    viewport.append(renderer.domElement);
    scene=new T.Scene();scene.environment=studioMap();scene.environmentIntensity=.94;
    camera=new T.PerspectiveCamera(32,1,.025,35);
    key=new T.DirectionalLight('#fffbf5',2.35);rim=new T.DirectionalLight('#d3e6ff',1.8);
    scene.add(key,rim,new T.HemisphereLight('#e3edff','#7f8aa0',1.08));
    model=buildModel();scene.add(model.headphone);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,0,64,64,64);
    grad.addColorStop(0,'#30496670');grad.addColorStop(.48,'#45608025');grad.addColorStop(1,'#45608000');
    ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
    shadow=new T.Mesh(new T.PlaneGeometry(3.55,1.68),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.63}));
    shadow.position.set(0,-1.67,.02);shadow.rotation.x=-Math.PI/2;scene.add(shadow);
    renderer.domElement.addEventListener('webglcontextlost',event=>{
      event.preventDefault();showFallback();renderer=null;model=null;viewport.hidden=true;
    });
    renderer.domElement.addEventListener('webglcontextrestored',()=>window.location.reload());
  }catch(error){
    console.info('The WebGL renderer is unavailable.',error);renderer=null;model=null;showFallback();
  }
}

const finishesOnScroll=[2,0,1,2,3,4];
function resolveFinish(p){
  const finishProgress=clamp((p-.113)/.145*5,0,5);
  const from=finishesOnScroll[Math.floor(finishProgress)],to=finishesOnScroll[Math.ceil(finishProgress)];
  const ft=smooth(0,1,finishProgress%1);
  showFinish(selectedFinish>=0?selectedFinish:ft<.5?from:to);
  return [from,to,ft];
}
function animateModel(p,dt,[from,to,ft]){
  cameraPose(p);
  const [,,,tx,ty,distance,offset]=pose;
  model.materials.forEach((list,i)=>{
    color.copy(finishColors[selectedFinish>=0?selectedFinish:from][i]);
    if(selectedFinish<0)color.lerp(finishColors[to][i],ft);
    for(const material of list)material.color.lerp(color,dt);
  });
  const {explode,innerView}=moveModel(model,p,reduced.matches?0:pointerX,reduced.matches?0:pointerY);
  shadow.material.opacity=.54*(1-.78*Math.max(explode,innerView));
  shadow.scale.set(1+.052*Math.sin(p*8),1,1);
  const macro=smooth(.267,.308,p)*(1-smooth(.562,.605,p));
  const aspect=Math.min(1,width/height);
  const framing=mobile?Math.max(1,(.8/aspect)) : Math.max(1,.83/aspect);
  // Track the actual right-hand control cluster through the macro rather than a fixed pixel.
  model.headphone.updateMatrixWorld(true);
  const lock=smooth(.278,.308,p)*(1-smooth(.418,.451,p));
  model.cups[1].anchors.crown.getWorldPosition(sourcePoint);
  cameraTarget.set(lerp(tx,sourcePoint.x+.02,lock),lerp(ty,sourcePoint.y-.13,lock),0);
  const zoom=distance*lerp(framing*1.22,Math.max(1,framing*.88),macro);
  camera.position.copy(cameraTarget).add(new T.Vector3(0,zoom*.105,zoom));
  camera.lookAt(cameraTarget);
  camera.filmOffset=0;
  camera.clearViewOffset();
  camera.setViewOffset(width,height,0,height*(mobile?offset*.44:offset*.49),width,height);
  camera.updateMatrixWorld();
  key.position.set(-3.8+sin(p*8)*4.0,4.5,5.2+cos(p*7)*2.2);
  rim.position.set(4.4+cos(p*8)*2.1,1.8+sin(p*11)*2.7,-4.4);
  scene.environmentRotation.y=p*2.35;
  renderer.render(scene,camera);
  const labelOpacity=stage===2?smooth(.292,.32,p)*(1-smooth(.406,.441,p)):smooth(.75,.79,p)*(1-smooth(.847,.875,p));
  drawAnnotations(labelOpacity);
}
const {sin,cos}=Math;
function render(now){
  frame=0;
  const seconds=Math.min(.06,(now-(lastFrame||now-16))/1000);lastFrame=now;
  const reducedMotion=reduced.matches;
  const targetStage=breaks.findLastIndex((b,i)=>i<7&&targetProgress>=b);
  const p=reducedMotion?stops[targetStage]:targetProgress;
  progress=reducedMotion?p:lerp(progress,p,1-Math.exp(-seconds*10));
  if(Math.abs(progress-p)<.0001)progress=p;
  const index=breaks.findLastIndex((b,i)=>i<7&&progress>=b);
  showChapter(index);
  sticky.style.setProperty('--chapter-progress',targetProgress);
  const dt=1-Math.exp(-seconds*12);
  pointerX=lerp(pointerX,goalX,dt);
  pointerY=lerp(pointerY,goalY,dt);
  const activeFinish=resolveFinish(progress);
  if(model&&width&&height)animateModel(progress,dt,activeFinish);
  else drawPosterLabels();
  const settlingColors=model&&selectedFinish>=0&&model.materials.some((materials,i)=>materials.some(m=>Math.abs(m.color.r-finishColors[selectedFinish][i].r)>.0005||Math.abs(m.color.g-finishColors[selectedFinish][i].g)>.0005||Math.abs(m.color.b-finishColors[selectedFinish][i].b)>.0005));
  if(Math.abs(progress-p)>.0001||settlingColors||Math.abs(pointerX-goalX)+Math.abs(pointerY-goalY)>.002)wake();
}

function size(){
  width=viewport.clientWidth;height=viewport.clientHeight;
  mobile=width<=650;
  if(renderer&&width&&height){
    const ratio=Math.min(devicePixelRatio,mobile?1.35:1.8,Math.sqrt(2350000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height);
    camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  readScroll();
}
initScene();
if(model){
  model.materials.forEach((list,index)=>list.forEach(material=>material.color.copy(finishColors[2][index])));
}
showFinish(2);showChapter(0);
window.addEventListener('scroll',readScroll,{passive:true});
window.addEventListener('resize',size,{passive:true});
window.addEventListener('hashchange',()=>{
  const i=chapters.findIndex(c=>'#'+c.id===location.hash);if(i>=0)navigate(i,false);
});
sticky.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||reduced.matches)return;
  goalX=e.clientX/width*2-1;goalY=(e.clientY-viewport.getBoundingClientRect().top)/height*2-1;
  wake();
});
sticky.addEventListener('pointerleave',()=>{goalX=goalY=0;wake();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;wake();}});
reduced.addEventListener('change',wake);
size();
const initial=chapters.findIndex(c=>'#'+c.id===location.hash);
if(initial>0)requestAnimationFrame(()=>navigate(initial,false));
