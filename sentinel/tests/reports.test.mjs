import {installReports} from '../server/reports.mjs';
import assert from 'node:assert/strict';
let handler,calls=0,reply={success:'true'},clock=0;
installReports({post:(p,m,h)=>handler=h},{json:()=>null},{recipient:'test@example.com',now:()=>clock,send:async()=>{calls++;return {ok:true,json:async()=>reply}}});
async function request(body,ip='1',origin){let result;const req={body,protocol:'https',get:k=>({'host':'game.test','origin':origin,'x-forwarded-for':ip}[k]),socket:{}};const res={code:200,status(n){this.code=n;return this},json(data){result={code:this.code,...data};return result}};await handler(req,res);return result}
assert.equal((await request({})).code,400);assert.equal(calls,0);
const valid={category:'bug',description:'The ship spins too quickly'};
assert.equal((await request(valid,'1','https://evil.test')).code,403);
assert.equal((await request(valid)).status,'accepted');assert.equal((await request(valid)).code,429);
reply={success:'false',message:'This form needs Activation'};assert.equal((await request(valid,'2')).status,'pending_activation');
reply={success:'false',message:'Rejected'};assert.equal((await request(valid,'3')).code,502);
reply={success:'true'};assert.equal((await request(valid,'3')).status,'accepted');
clock=600001;assert.equal((await request(valid)).code,200);
assert.equal((await request({...valid,website:'spam'},'4')).code,400);
console.log('Report validation, origin, throttle, activation, refusal and retry tests passed');
