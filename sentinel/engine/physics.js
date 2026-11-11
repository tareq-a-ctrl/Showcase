(()=>{
class SentinelDebrisPhysics{
 constructor(R){this.R=R;this.world=new R.World({x:0,y:-33,z:0});this.world.timestep=1/60;this.accum=0;this.bodies=new Set();this.ground=this.world.createCollider(R.ColliderDesc.cuboid(100000,.5,100000).setTranslation(0,-3,0));this.city=[]}
 syncCity(shapes){for(const c of this.city)this.world.removeCollider(c,true);this.city=[];for(const s of shapes){const h=(s.y1-s.y0)/2;if(h>0)this.city.push(this.world.createCollider(this.R.ColliderDesc.cuboid(s.rx,h,s.rz).setTranslation(s.x,s.y0+h,s.z)))}}
 spawn(p){const R=this.R,body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...p.pos).setLinvel(...p.vel).setAngvel({x:p.spin,y:p.spin*.6,z:p.spin*.3}).setCcdEnabled(true));this.world.createCollider(R.ColliderDesc.cuboid(p.size,p.size*.65,p.size).setRestitution(.42).setFriction(.65),body);this.bodies.add(body);return body}
 remove(body){if(this.bodies.delete(body))this.world.removeRigidBody(body)}
 clear(){for(const b of [...this.bodies])this.remove(b)}
 step(dt){this.accum=Math.min(.1,this.accum+dt);let n=0;while(this.accum>=1/60&&n++<6){this.world.step();this.accum-=1/60}}
 dispose(){this.world.free()}
}
window.SentinelDebrisPhysics=SentinelDebrisPhysics;
})();
