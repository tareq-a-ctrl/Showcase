import { Room } from '@colyseus/core';
import { Schema,defineTypes } from '@colyseus/schema';
import RAPIER from '@dimforge/rapier3d-compat';
export const physicsReady=RAPIER.init();
const QUICK=new Set(['Hello pilots!','Ready to fly!','Nice flight!','Good game!','Meet at the island!','Need backup!']);
class ArenaState extends Schema{constructor(){super();this.mode='coop';this.owner=''}}
defineTypes(ArenaState,{mode:'string',owner:'string'});
export class SentinelArena extends Room{
 maxClients=8;
 async onCreate(options){await physicsReady;this.setState(new ArenaState());this.state.mode=options.mode==='chaos'?'chaos':'coop';this.pilots=new Map();this.shapes=new Map();this.world=new RAPIER.World({x:0,y:0,z:0});this.world.timestep=.05;this.setMetadata({mode:this.state.mode});this.onMessage('game',(client,msg)=>this.receive(client,msg));this.setSimulationInterval(()=>this.tick(),50)}
 onJoin(client){const used=new Set([...this.pilots.values()].map(p=>p.slot));let slot=0;while(used.has(slot))slot++;const a=slot*Math.PI/4;const home=[Math.round(Math.cos(a)*1800),0,Math.round(Math.sin(a)*1800)];
  const p={id:client.sessionId,name:'Pilot-'+client.sessionId.slice(0,6).toUpperCase(),slot,home,position:[home[0],4,home[2]],cityPosition:[home[0],25,home[2]-400],phase:'ready',hp:100,cityHp:1000,kills:0,cityTags:0,cityLayout:{},lastShot:0,lastInput:Date.now(),protectedUntil:Date.now()+4000};
  p.pilotCollider=this.world.createCollider(RAPIER.ColliderDesc.ball(22).setTranslation(...p.position));p.cityCollider=this.world.createCollider(RAPIER.ColliderDesc.ball(110).setTranslation(...p.cityPosition));this.shapes.set(p.pilotCollider.handle,{p,kind:'pilot'});this.shapes.set(p.cityCollider.handle,{p,kind:'city'});this.pilots.set(p.id,p);if(!this.state.owner)this.state.owner=p.id;this.broadcast('game',{type:'pilot',...this.publicPilot(p)},{except:client});this.changed();}
 send(c,m){c.send('game',m)}
 publicPilot(p){return {id:p.id,name:p.name,phase:p.phase,position:p.position,map:0,hp:p.hp}}
 snapshot(){return {type:'room_state',room:this.roomId,owner:this.state.owner,mode:this.state.mode,robotIsland:this.state.mode!=='chaos',cities:[...this.pilots.values()].map(p=>({id:p.id,name:p.name,home:p.home,slot:p.slot,position:p.cityPosition,hp:p.cityHp,maxHp:1000,layout:p.cityLayout,pilotHp:p.hp,kills:p.kills,cityTags:p.cityTags}))}}
 changed(){this.broadcast('game',this.snapshot())}
 receive(c,m){const p=this.pilots.get(c.sessionId);if(!p||!m||typeof m!=='object')return;
  const now=Date.now();if(now-(p.rateAt||0)>1000){p.rateAt=now;p.rate=0}if((p.rate=(p.rate||0)+1)>18)return;
  if(m.type==='hello'){this.send(c,{type:'joined',room:this.roomId,roomName:'Moon Station '+this.roomId,playerId:p.id,home:p.home,owner:this.state.owner,mode:this.state.mode});this.send(c,{type:'players',players:[...this.pilots.values()].filter(o=>o!==p).map(o=>this.publicPilot(o))});this.send(c,this.snapshot())}
  else if(m.type==='configure'){if(p.id!==this.state.owner)return this.send(c,{type:'error',message:'Only the room owner can change the mode.'});if(!['coop','chaos'].includes(m.mode))return;this.state.mode=m.mode;this.setMetadata({mode:m.mode});this.changed()}
  else if(m.type==='city'){if(!m.layout||typeof m.layout!=='object')return;for(const k of ['housing','parks','schools','clinics','factories','defense'])p.cityLayout[k]=Number.isInteger(m.layout[k])?Math.max(0,Math.min(25,m.layout[k])):0;this.changed()}
  else if(m.type==='pilot')this.move(c,p,m,now);
  else if(m.type==='chat'){if(QUICK.has(m.text))this.broadcast('game',{type:'chat',id:p.id,name:p.name,text:m.text},{except:c});else this.send(c,{type:'error',message:'Use the quick-chat buttons.'})}
  else if(m.type==='fire')this.fire(c,p,m,now);
 }
 move(c,p,m,now){if(!Array.isArray(m.position)||m.position.length!==3||!m.position.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100000))return;
  const phases=['ready','loading','loaded','launch','flight','hunt','paused','burst','results'];let phase=phases.includes(m.phase)?m.phase:'ready';let pos=m.position.slice();
  if(p.hp<=0){if(['ready','loading','loaded','launch'].includes(phase)){p.hp=100;p.protectedUntil=now+4000;this.changed()}else phase='results'}
  if(phase==='ready'||phase==='loading'||phase==='loaded')pos=[p.home[0],4,p.home[2]];
  else if(['flight','hunt','launch'].includes(phase)){const elapsed=Math.min(.6,Math.max(.05,(now-p.lastInput)/1000)),d=pos.map((v,i)=>v-p.position[i]),length=Math.hypot(...d),max=320*elapsed+20;if(length>max){pos=p.position.map((v,i)=>v+d[i]/length*max);this.send(c,{type:'correction',position:pos})}}
  else pos=p.position.slice();
  if(['flight','hunt'].includes(phase)&&!['flight','hunt','paused'].includes(p.phase))p.protectedUntil=now+4000;
  p.phase=phase;p.position=pos;p.lastInput=now;p.pilotCollider.setTranslation({x:pos[0],y:pos[1],z:pos[2]});this.broadcast('game',{type:'pilot',...this.publicPilot(p)},{except:c});
 }
 fire(c,p,m,now){if(this.state.mode!=='chaos')return this.send(c,{type:'error',message:'Pulse fire is available in PvP Chaos only.'});if(!['flight','hunt'].includes(p.phase)||p.hp<=0||now-p.lastInput>1500||now-p.lastShot<450)return;
  const d=m.direction;if(!Array.isArray(d)||d.length!==3||!d.every(v=>typeof v==='number'&&Number.isFinite(v)))return;const len=Math.hypot(...d);if(len<.5||len>1.5)return;p.lastShot=now;const dir=d.map(v=>v/len);this.world.step();
  const ray=new RAPIER.Ray({x:p.position[0],y:p.position[1],z:p.position[2]},{x:dir[0],y:dir[1],z:dir[2]});
  const hit=this.world.castRay(ray,3000,true,undefined,undefined,undefined,undefined,col=>{const t=this.shapes.get(col.handle);return t&&t.p!==p&&(t.kind==='city'?t.p.cityHp>0:t.p.hp>0&&['flight','hunt'].includes(t.p.phase)&&now>=t.p.protectedUntil)});
  const distance=hit?hit.timeOfImpact:3000;const event={type:'pulse',id:p.id,origin:p.position.slice(),end:p.position.map((v,i)=>v+dir[i]*distance),hit:null};
  if(hit){const {p:other,kind}=this.shapes.get(hit.collider.handle);const key=kind==='city'?'cityHp':'hp';other[key]=Math.max(0,other[key]-(kind==='city'?100:25));Object.assign(event,{hit:kind,victim:other.id,hp:other[key]});if(!other[key]){if(kind==='city'){p.cityTags++;other.repairAt=now+30000}else{p.kills++;other.phase='results';const target=this.clients.find(c=>c.sessionId===other.id);if(target)this.send(target,{type:'eliminated',attacker:p.name})}}this.changed()}
  this.broadcast('game',event);
 }
 tick(){const now=Date.now();this.world.step();for(const p of this.pilots.values()){if(!p.cityHp&&now>=p.repairAt){p.cityHp=1000;this.changed()}}}
 onLeave(client){const p=this.pilots.get(client.sessionId);if(!p)return;for(const col of [p.pilotCollider,p.cityCollider]){this.shapes.delete(col.handle);this.world.removeCollider(col,true)}this.pilots.delete(p.id);if(this.state.owner===p.id)this.state.owner=[...this.pilots.keys()].sort()[0]||'';this.broadcast('game',{type:'left',id:p.id});this.changed()}
 onDispose(){this.world.free()}
}
