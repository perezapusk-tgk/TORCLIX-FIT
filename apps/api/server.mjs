import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";
const {Pool}=pg;

const port=Number(process.env.PORT||4000);
const BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const DATABASE_URL=process.env.DATABASE_URL||"";
const pool=DATABASE_URL?new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}}):null;
const sessions=new Map();

const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-allow-headers":"content-type, x-telegram-init-data, authorization","access-control-allow-methods":"GET,POST,OPTIONS"});res.end(JSON.stringify(data));};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{};};

function telegramUser(initData){
 if(!initData)return null;
 const p=new URLSearchParams(initData),raw=p.get("user"); if(!raw)return null;
 try{
  const user=JSON.parse(raw);
  if(!BOT_TOKEN)return user;
  const hash=p.get("hash")||""; p.delete("hash");
  const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n");
  const secret=crypto.createHmac("sha256","WebAppData").update(BOT_TOKEN).digest();
  const expected=crypto.createHmac("sha256",secret).update(data).digest("hex");
  if(hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))return null;
  return user;
 }catch{return null}
}
function auth(req){const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");return sessions.get(token)||null;}
function defaultProfile(user){return {telegramId:String(user.id),name:user.first_name||"Алекс",goal:"Сила и форма",level:"Средний",days:4,equipment:"Зал",weight:82,streak:0,completed:0,ready:87};}
function nextMove(p){return {title:p.goal==="Снижение веса"?"Full body + кондиция":"Грудь + плечи",duration:p.goal==="Выносливость"?42:48,type:p.goal==="Выносливость"?"conditioning":"strength",recommendation:p.completed>=8?"+1 подход к ключевому упражнению":"базовая силовая сессия",reasons:["Сон 8ч 12м","Хорошее восстановление","Верх тела не нагружался 2 дня"]};}
async function dbProfile(user){
 if(!pool)return defaultProfile(user);
 const r=await pool.query("SELECT telegram_id AS \"telegramId\",name,goal,level,days,equipment,weight,streak,completed,ready FROM profiles WHERE telegram_id=$1",[String(user.id)]);
 if(r.rowCount)return r.rows[0];
 const p=defaultProfile(user);
 await pool.query("INSERT INTO users(telegram_id,first_name,username) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[p.telegramId,p.name,user.username||null]);
 await pool.query("INSERT INTO profiles(telegram_id,name,goal,level,days,equipment,weight,ready,streak,completed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[p.telegramId,p.name,p.goal,p.level,p.days,p.equipment,p.weight,p.ready,p.streak,p.completed]);
 return p;
}
async function saveProfile(p){
 if(!pool)return;
 await pool.query("UPDATE profiles SET name=$2,goal=$3,level=$4,days=$5,equipment=$6,weight=$7,ready=$8,streak=$9,completed=$10,updated_at=now() WHERE telegram_id=$1",[p.telegramId,p.name,p.goal,p.level,p.days,p.equipment,p.weight,p.ready,p.streak,p.completed]);
}
async function getUser(req){const s=auth(req);return s?dbProfile(s.user):null;}

const server=http.createServer(async(req,res)=>{
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}
 try{
  if(req.method==="GET"&&req.url==="/health"){
   let db="disabled"; if(pool){await pool.query("SELECT 1");db="connected";}
   return json(res,200,{ok:true,service:"torclix-fit-api",version:"0.4.0",storage:pool?"neon-postgres":"memory",database:db});
  }
  if(req.method==="POST"&&req.url==="/api/auth/telegram"){
   const user=telegramUser(req.headers["x-telegram-init-data"]);
   if(!user&&BOT_TOKEN)return json(res,401,{ok:false,error:"Invalid Telegram initData"});
   const safe=user||{id:"demo",first_name:"Демо"};
   const profile=await dbProfile(safe);
   const token=crypto.randomUUID(); sessions.set(token,{user:safe,createdAt:Date.now()});
   return json(res,200,{ok:true,token,user:safe,profile});
  }
  if(req.url==="/api/profile"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,profile:p});}
  if(req.url==="/api/profile"&&req.method==="POST"){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);
   Object.assign(p,{name:String(b.name||p.name).slice(0,60),goal:String(b.goal||p.goal),level:String(b.level||p.level),days:Math.min(7,Math.max(1,Number(b.days||p.days))),equipment:String(b.equipment||p.equipment)});
   await saveProfile(p);return json(res,200,{ok:true,profile:p,nextMove:nextMove(p)});
  }
  if(req.url==="/api/today"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,ready:p.ready,nextMove:nextMove(p),profile:p,generatedAt:new Date().toISOString()});}
  if(req.url==="/api/fitness-twin"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,strength:74+Math.min(12,p.completed),endurance:68,recovery:81,mobility:62,consistency:Math.min(100,76+p.completed)});}
  if(req.method==="POST"&&req.url==="/api/workouts/sessions"){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);const id=crypto.randomUUID();
   if(pool)await pool.query("INSERT INTO workout_sessions(id,telegram_id,exercise,status,started_at) VALUES($1,$2,$3,'active',now())",[id,p.telegramId,b.exercise||"Жим штанги лёжа"]);
   else sessions.set("workout:"+id,{id,userId:p.telegramId,exercise:b.exercise||"Жим штанги лёжа",sets:[]});
   return json(res,201,{ok:true,session:{id,exercise:b.exercise||"Жим штанги лёжа",status:"active"}});
  }
  const m=req.url.match(/^\/api\/workouts\/sessions\/([^/]+)\/sets$/);
  if(req.method==="POST"&&m){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);
   if(pool){
    const q=await pool.query("SELECT id FROM workout_sessions WHERE id=$1 AND telegram_id=$2",[m[1],p.telegramId]);if(!q.rowCount)return json(res,404,{ok:false,error:"Session not found"});
    const id=crypto.randomUUID();await pool.query("INSERT INTO workout_sets(id,session_id,weight,reps,rpe,saved_at) VALUES($1,$2,$3,$4,$5,now())",[id,m[1],Number(b.weight||0),Number(b.reps||0),Number(b.rpe||0)]);
   }else{const s=sessions.get("workout:"+m[1]);if(!s||s.userId!==p.telegramId)return json(res,404,{ok:false,error:"Session not found"});s.sets.push(b);}
   p.completed+=1;p.streak=Math.max(1,p.streak+1);await saveProfile(p);return json(res,201,{ok:true,profile:p,nextMove:nextMove(p)});
  }
  return json(res,404,{ok:false,error:"Not found"});
 }catch(error){console.error(error);return json(res,500,{ok:false,error:"Internal server error"});}
});
server.listen(port,()=>console.log("TORCLIX FIT API listening on "+port));