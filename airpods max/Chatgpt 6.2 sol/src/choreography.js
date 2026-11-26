import {MathUtils} from 'three';
const {lerp}=MathUtils;
const smooth=(a,b,p)=>MathUtils.smoothstep(p,a,b);
const front=[-.46,.02,-.04,0,.06,5.95,.17];
const shots=[
  [.00,...front], [.115,-.22,-.035,.008,0,.04,5.9,.17],
  [.18,-.68,.03,-.06,0,.11,5.55,.13], [.245,-.55,.035,.02,0,.10,5.60,.14],
  // Yaw, pitch, roll, target X/Y, lens distance, and vertical frame offset.
  [.267,-.73,.11,-.10,.40,.29,4.9,.09], [.306,-1.14,.26,.09,.43,.35,2.65,.035],
  [.372,-1.05,.28,.10,.51,.35,2.42,.04], [.421,-.91,.19,-.05,.43,.47,2.69,.06],
  [.46,-.29,.22,-.12,.05,1.26,2.75,.12], [.498,.16,.23,.02,0,1.28,2.64,.11],
  [.548,1.09,-.05,.06,.41,-.50,2.42,.14], [.578,1.29,.015,.02,.36,-.47,3.45,.15],
  [.62,.10,.025,0,0,-.17,6.1,.14], [.683,.03,.045,0,0,-.21,6.25,.14],
  [.718,.64,.04,0,0,-.11,6.1,.14], [.753,2.58,-.10,0,-.14,-.30,5.5,.12],
  [.798,2.43,-.10,0,.76,-.36,5.30,.12], [.842,2.40,-.09,0,.69,-.34,5.30,.12],
  [.88,1.39,.05,-.03,.04,.01,5.81,.14], [.916,.47,.10,.03,0,.02,6.35,.13],
  [.96,.16,.02,0,0,.02,5.88,.14], [1,.09,0,0,0,.04,5.75,.14]
];
export const pose=new Float32Array(7);
export function cameraPose(p){
  let i=1;while(i<shots.length-1 && p>shots[i][0])i++;
  const a=shots[i-1],b=shots[i],t=smooth(a[0],b[0],p);
  for(let j=0;j<pose.length;j++)pose[j]=lerp(a[j+1],b[j+1],t);
}

export function moveModel(model,p,pointerX=0,pointerY=0){
  const [yaw,pitch,roll]=pose;
  const detach=smooth(.588,.641,p)*(1-smooth(.675,.715,p));
  const explode=smooth(.733,.785,p)*(1-smooth(.852,.88,p));
  const pack=smooth(.887,.956,p), seating=smooth(.913,.975,p);
  const innerView=smooth(.518,.551,p)*(1-smooth(.712,.751,p));
  const extension=smooth(.125,.17,p)*(1-smooth(.208,.252,p))*.105;

  model.headphone.rotation.set(pitch+pointerY*.045,yaw+pointerX*.095,roll);
  model.headphone.position.y=-.14*seating;
  model.arms.forEach((arm,i)=>{
    const side=i===0?-1:1;
    arm.position.y=.113-extension+.045*pack;
    arm.position.x=side*(1.30-.117*pack);
    arm.rotation.z=-side*.72*pack;
    arm.scale.y=1+.79*pack;
  });
  model.cups.forEach((cup,i)=>{
    const s=i===0?-1:1, r=i===1?1:0;
    cup.pivot.position.set(s*(1.248-.33*pack)+(1-r)*2.7*explode,.055-extension,-(1-r)*.92*explode);
    cup.pivot.scale.setScalar(1-(1-r)*.92*explode);
    const cupYaw=lerp(lerp(1.63,.60,innerView),1.39,explode*r);
    cup.pivot.rotation.y=s*lerp(cupYaw,3.13,pack);
    cup.pivot.rotation.z=-s*lerp(.31,.095,pack)+s*detach*.055;
    cup.pivot.rotation.x=.075*innerView;
    cup.shell.position.z=-.62*explode*r;
    cup.electronics.position.z=-.14+.24*explode*r;
    cup.driver.position.z=-.065+1.0*explode*r;
    cup.baffle.position.z=.025+1.75*explode*r;
    cup.cushion.position.z=.60*detach+2.54*explode*r;
    cup.cushion.position.x=s*.68*detach;
    cup.cushion.position.y=-.23*detach;
    cup.cushion.rotation.z=s*.15*detach;
    cup.electronics.visible=explode>.006&&r===1;cup.driver.visible=explode>.006&&r===1;
    cup.baffle.visible=detach>.003||explode>.003;
    cup.crown.rotation.y=p*37;
  });
  model.smartCase.visible=p>.89;
  model.smartCase.position.set(0,-.72-1.70*(1-seating),.015);
  model.flap.rotation.x=1.75*smooth(.882,.91,p)*(1-smooth(.946,.997,p));
  model.flap.rotation.z=.065*(1-seating);
  return {explode,innerView};
}
