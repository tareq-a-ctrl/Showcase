/* Adapt the established game messages to real Colyseus rooms. */
(()=>{
class SentinelRoomTransport{
 constructor(url){this.readyState=0;this.url=url.replace(/^ws/,'http').replace(/\/ws\/?$/,'');this.client=new window.SentinelColyseusClient(this.url);this.room=null;this.closed=false;this.open()}
 emit(data){this.onmessage?.({data:JSON.stringify(data)})}
 async open(){try{await this.list();if(this.closed)return;this.readyState=1;this.onopen?.();this.poll=setInterval(()=>{if(!document.hidden)this.list().catch(()=>{})},4000)}catch(e){this.emit({type:'error',message:e.message});this.onerror?.(e);this.close()}}
 async list(){const r=await fetch(this.url+'/api/rooms');if(!r.ok)throw Error('Server room list unavailable');const j=await r.json();if(!this.closed)this.emit({type:'rooms',rooms:j.rooms})}
 async send(raw){try{const msg=JSON.parse(raw);if(msg.type==='list')return await this.list();if(msg.type==='create'||msg.type==='join'){
   if(this.room){this.emit({type:'error',message:'You are already in a room. Choose Solo to leave first.'});return}
   const room=msg.type==='create'?await this.client.create('sentinel',{mode:msg.mode}):await this.client.joinById(msg.room);
   if(this.closed){await room.leave();return}this.room=room;room.onMessage('game',data=>this.emit(data));room.onLeave(()=>{if(!this.closed)this.close()});room.onError((code,message)=>this.emit({type:'error',message:message||String(code)}));room.send('game',{type:'hello'});return;
  }this.room?.send('game',msg)}catch(e){this.emit({type:'error',message:e.message||'Room request failed'})}}
 close(){if(this.closed)return;this.closed=true;this.readyState=3;clearInterval(this.poll);this.room?.leave();this.room=null;this.onclose?.()}
}
window.SentinelRoomTransport=SentinelRoomTransport;
})();
