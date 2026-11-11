import RAPIER from '@dimforge/rapier3d-compat';
import {Client} from '@colyseus/sdk';
window.SentinelRapier=RAPIER;
window.SentinelPhysicsReady=RAPIER.init().then(()=>RAPIER).catch(e=>{console.warn('Rapier unavailable; using legacy collision fallback',e);return null});
window.SentinelColyseusClient=Client;
