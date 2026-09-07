const admin=require("firebase-admin"),crypto=require("crypto");
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
const db=admin.firestore(),Field=admin.firestore.FieldValue;
const BOT=process.env.BOT_TOKEN,ADM=(process.env.ADMIN_IDS||"5980396006,5479488791").split(",").map(String),WEB=process.env.WEBAPP_URL||"";
const CHANNELS=[
{id:"proof",name:"USDT Hub Payment Proof",url:"https://t.me/usdt_hub_payment_proof",chat:"@usdt_hub_payment_proof"},
{id:"gram",name:"USDT Gram",url:"https://t.me/usdt_g_ram",chat:"@usdt_g_ram"},
{id:"phone",name:"Phone Teach",url:"https://t.me/phone_teach",chat:"@phone_teach"},
{id:"forex",name:"Forex Big",url:"https://t.me/forex_big",chat:"@forex_big"}];
const REW=[{v:.1,p:30},{v:.2,p:25},{v:.3,p:18},{v:.5,p:12},{v:.7,p:7},{v:1,p:4},{v:1.5,p:2.5},{v:2,p:1},{v:5,p:.5}];
function tgValid(init){const q=new URLSearchParams(init||"");const hash=q.get("hash");q.delete("hash");if(!hash)throw Error("Open this app from Telegram");const data=[...q.entries()].sort().map(([k,v])=>`${k}=${v}`).join("\n");const key=crypto.createHmac("sha256","WebAppData").update(BOT).digest();const h=crypto.createHmac("sha256",key).update(data).digest("hex");if(h!==hash)throw Error("Invalid Telegram session");const u=JSON.parse(q.get("user")||"{}");if(!u.id)throw Error("Telegram user missing");return u}
function pick(){let r=Math.random()*100;for(let i=0;i<REW.length;i++){r-=REW[i].p;if(r<=0)return i}return 0}
async function call(method,body){const r=await fetch(`https://api.telegram.org/bot${BOT}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});return r.json()}
async function member(uid,chat){const x=await call("getChatMember",{chat_id:chat,user_id:uid});return x.ok&&["member","administrator","creator"].includes(x.result?.status)}
async function userDoc(u){return db.collection("users").doc(String(u.id))}
async function getState(u){const ref=await userDoc(u),s=(await ref.get()).data()||{};return {telegramId:u.id,balance:s.balance||0,spins:s.spins||0,adsToday:s.adsToday||0,adProgress:s.adProgress||0,referrals:s.referrals||0,referralSpins:s.referralSpins||0,streak:s.streak||0,dailyDay:s.dailyDay||1,dailyClaimed:s.dailyClaimed||false,dailySpinReward:s.dailySpinReward||1,withdrawPending:s.withdrawPending||false,rank:s.rank||null,refLink:`https://t.me/${process.env.BOT_USERNAME||"BirrSpinBot"}?start=${s.refCode||u.id}`,tasks:CHANNELS.map(c=>({id:c.id,name:c.name,url:c.url,done:!!(s.tasks||{})[c.id]})),history:(await db.collection("transactions").where("uid","==",String(u.id)).orderBy("createdAt","desc").limit(20).get()).docs.map(d=>d.data())}}
module.exports=async(req,res)=>{try{if(req.method!=="POST")return res.status(405).json({error:"POST only"});const {action,data={},initData}=req.body||{};const u=tgValid(initData),ref=await userDoc(u),snap=await ref.get();let s=snap.data();if(!s){
 s={telegramId:u.id,username:u.username||"",firstName:u.first_name||"",balance:0,spins:3,totalSpins:0,
 adsToday:0,adProgress:0,adsDate:new Date().toISOString().slice(0,10),referrals:0,referralSpins:0,
 refCode:crypto.randomBytes(5).toString("hex"),createdAt:Field.serverTimestamp(),status:"NORMAL",tasks:{},
 streak:0,lastLoginDate:null,dailyDay:1,dailyClaimed:false,dailySpinReward:1,withdrawPending:false};
 await ref.set(s);
 if(s.referredBy){
   const parent=String(s.referredBy).replace(/[^0-9]/g,"");
   if(parent && parent!==String(u.id)){
     const pr=db.collection("users").doc(parent),ps=await pr.get();
     if(ps.exists){
       await pr.update({referrals:Field.increment(1),referralSpins:Field.increment(1),spins:Field.increment(1)});
       await db.collection("transactions").add({uid:parent,label:"👥 Referral Reward",amount:"+1 Spin",createdAt:Field.serverTimestamp()});
     }
   }
 }
}
const today=new Date().toISOString().slice(0,10);
if(s.adsDate!==today){
 s.adsDate=today;s.adsToday=0;s.adProgress=0;
 const last=s.lastLoginDate;
 let streak=s.streak||0,day=s.dailyDay||1;
 if(last){
   const d0=new Date(last+"T00:00:00Z"),d1=new Date(today+"T00:00:00Z");
   const diff=Math.round((d1-d0)/86400000);
   if(diff>1){streak=0;day=1}
 }
 await ref.update({adsDate:today,adsToday:0,adProgress:0,dailyClaimed:false,streak, dailyDay:day});
 s.dailyClaimed=false;s.streak=streak;s.dailyDay=day;
}
const settings=(await db.collection("settings").doc("app").get()).data()||{};if(settings.maintenance&&!(ADM.includes(String(u.id))))throw Error("🔧 Birr Spin is temporarily under maintenance. Please come back soon.");if(action==="init")return res.json(await getState(u));
if(action==="spin"){let rewardIndex=0,reward=0,free=s.totalSpins<3;if(free){reward=[20,30,30][s.totalSpins]}else{const cfg=settings.rewardWeights;if(Array.isArray(cfg)&&cfg.length===REW.length){let r=Math.random()*cfg.reduce((a,x)=>a+Number(x.p||0),0);for(let i=0;i<cfg.length;i++){r-=Number(cfg[i].p||0);if(r<=0){rewardIndex=i;break}}reward=Number(cfg[rewardIndex].v)}else{rewardIndex=pick();reward=REW[rewardIndex].v}}let tx=db.batch();tx.update(ref,{balance:admin.firestore.FieldValue.increment(reward),spins:Field.increment(-1),totalSpins:Field.increment(1)});let tr=db.collection("transactions").doc();tx.set(tr,{uid:String(u.id),label:free?`🎁 Free Spin #${s.totalSpins+1}`:"🎡 Spin Reward",amount:`+${reward.toFixed(2)} Birr`,createdAt:Field.serverTimestamp()});await tx.commit();return res.json({reward,rewardIndex,free,state:await getState(u)})}
if(action==="adComplete"){if((s.adsToday||0)>=50)throw Error("Daily ad limit reached");let p=(s.adProgress||0)+1,add=p>=5?1:0;await ref.update({adsToday:Field.increment(1),adProgress:p>=5?0:p,spins:Field.increment(add)});if(add)await db.collection("transactions").add({uid:String(u.id),label:"🎬 5 Ads Reward",amount:"+1 Spin",createdAt:Field.serverTimestamp()});return res.json({spinAdded:!!add,state:await getState(u)})}
if(action==="daily"){
 if(s.dailyClaimed)throw Error("Daily reward already claimed");
 const next=[1,1,1,2,2,3,5][((s.dailyDay||1)-1)%7];
 const nextDay=((s.dailyDay||1)%7)+1;
 await ref.update({spins:Field.increment(next),dailyClaimed:true,streak:Field.increment(1),dailyDay:nextDay,lastLoginDate:today,dailySpinReward:nextDay<=7?[1,1,1,2,2,3,5][nextDay-1]:1});
 await db.collection("transactions").add({uid:String(u.id),label:"📅 Daily Reward",amount:`+${next} Spin`,createdAt:Field.serverTimestamp()});
 return res.json({state:await getState(u)})
}
if(action==="verifyTask"){const t=CHANNELS.find(x=>x.id===data.taskId);if(!t)throw Error("Task not found");if((s.tasks||{})[t.id])throw Error("Task already completed");if(!(await member(u.id,t.chat)))throw Error("Please join the channel first");await ref.update({[`tasks.${t.id}`]:true,spins:Field.increment(1)});await db.collection("transactions").add({uid:String(u.id),label:"📢 Task Reward",amount:"+1 Spin",createdAt:Field.serverTimestamp()});return res.json({state:await getState(u)})}
if(action==="withdraw"){if(s.balance<100)throw Error("Minimum withdrawal is 100 Birr");if(s.withdrawPending)throw Error("Withdrawal already pending");if(!/^\+?\d{9,15}$/.test(String(data.phone).replace(/\s/g,"")))throw Error("Enter a valid Telebirr number");const w=db.collection("withdrawals").doc();const batch=db.batch();batch.set(w,{uid:String(u.id),username:u.username||"",firstName:u.first_name||"",phone:String(data.phone),amount:100,status:"PENDING",createdAt:Field.serverTimestamp()});batch.update(ref,{balance:Field.increment(-100),withdrawPending:true});batch.set(db.collection("transactions").doc(),{uid:String(u.id),label:"💰 Withdrawal",amount:"-100.00 Birr",createdAt:Field.serverTimestamp()});await batch.commit();const text=`💰 BIRR SPIN WITHDRAWAL\n\n👤 ${u.first_name||""} ${u.username?"@"+u.username:""}\n🆔 ${u.id}\n📱 Telebirr: ${data.phone}\n💵 Amount: 100 Birr\n🟡 PENDING`;const kb={inline_keyboard:[[{"text":"✅ DONE / PAID","callback_data":`paid:${w.id}`}]]};for(const id of ADM)await call("sendMessage",{chat_id:id,text,reply_markup:kb});await call("sendMessage",{chat_id:"@usdt_hub_payment_proof",text,reply_markup:kb});return res.json({state:await getState(u)})}
throw Error("Unknown action")}catch(e){res.status(400).json({error:e.message||"Server error"})}};