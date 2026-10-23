import http from "node:http";
import crypto from "node:crypto";

const port=Number(process.env.PORT||4000);
const BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const sessions=new Map();
const profiles=new Map();
const workouts=new Map();

const json=(res,status,data)=>{
  res.writeHead(status,{
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    "access-control-allow-headers":"content-type, x-telegram-init-data, authorization",
    "access-control-allow-methods":"GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(data));
};
const body=async req=>{
  let s="";
  for await(const c of req)s+=c;
  return s?JSON.parse(s):{};
};

function telegramUser(initData){
  if(!initData)return null;
  const p=new URLSearchParams(initData);
  const raw=p.get("user");
  if(!raw)return null;
  try{
    const user=JSON.parse(raw);
    if(!BOT_TOKEN)return user;
    const hash=p.get("hash")||"";
    p.delete("hash");
    const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n");
    const secret=crypto.createHmac("sha256","WebAppData").update(BOT_TOKEN).digest();
    const expected=crypto.createHmac("sha256",secret).update(data).digest("hex");
    if(hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))return null;
    return user;
  }catch{return null}
}
function auth(req){
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  return sessions.get(token)||null;
}
function defaultProfile(user){
  return {
    telegramId:String(user.id),
    name:user.first_name||"Алекс",
    goal:"Сила и форма",
    level:"Средний",
    days:4,
    equipment:"Зал",
    weight:82,
    streak:0,
    completed:0,
    ready:87
  };
}
function nextMove(profile){
  const strength=profile.completed>=8?"+1 подход к ключевому упражнению":"базовая силовая сессия";
  return {
    title:profile.goal==="Снижение веса"?"Full body + кондиция":"Грудь + плечи",
    duration:profile.goal==="Выносливость"?42:48,
    type:profile.goal==="Выносливость"?"conditioning":"strength",
    recommendation:strength,
    reasons:["Сон 8ч 12м","Хорошее восстановление","Верх тела не нагружался 2 дня"]
  };
}
function userProfile(req){
  const session=auth(req);
  if(!session)return null;
  return profiles.get(session.user.id)||defaultProfile(session.user);
}

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
  try{
    if(req.method==="GET"&&req.url==="/health")return json(res,200,{ok:true,service:"torclix-fit-api",version:"0.3.0",storage:"memory"});
    if(req.method==="POST"&&req.url==="/api/auth/telegram"){
      const user=telegramUser(req.headers["x-telegram-init-data"]);
      if(!user&&BOT_TOKEN)return json(res,401,{ok:false,error:"Invalid Telegram initData"});
      const safe=user||{id:"demo",first_name:"Демо"};
      if(!profiles.has(safe.id))profiles.set(safe.id,defaultProfile(safe));
      const token=crypto.randomUUID();
      sessions.set(token,{user:safe,createdAt:Date.now()});
      return json(res,200,{ok:true,token,user:safe,profile:profiles.get(safe.id)});
    }
    if(req.url==="/api/profile"&&req.method==="GET"){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      return json(res,200,{ok:true,profile});
    }
    if(req.url==="/api/profile"&&req.method==="POST"){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      const b=await body(req);
      Object.assign(profile,{
        name:String(b.name||profile.name).slice(0,60),
        goal:String(b.goal||profile.goal),
        level:String(b.level||profile.level),
        days:Math.min(7,Math.max(1,Number(b.days||profile.days))),
        equipment:String(b.equipment||profile.equipment)
      });
      profiles.set(profile.telegramId,profile);
      return json(res,200,{ok:true,profile,nextMove:nextMove(profile)});
    }
    if(req.url==="/api/today"&&req.method==="GET"){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      return json(res,200,{ok:true,ready:profile.ready,nextMove:nextMove(profile),profile,generatedAt:new Date().toISOString()});
    }
    if(req.url==="/api/fitness-twin"&&req.method==="GET"){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      return json(res,200,{ok:true,strength:74+Math.min(12,profile.completed),endurance:68,recovery:81,mobility:62,consistency:Math.min(100,76+profile.completed)});
    }
    if(req.method==="POST"&&req.url==="/api/workouts/sessions"){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      const b=await body(req);
      const id=crypto.randomUUID();
      workouts.set(id,{id,userId:profile.telegramId,exercise:b.exercise||"Жим штанги лёжа",startedAt:new Date().toISOString(),status:"active",sets:[]});
      return json(res,201,{ok:true,session:workouts.get(id)});
    }
    const setMatch=req.url.match(/^\/api\/workouts\/sessions\/([^/]+)\/sets$/);
    if(req.method==="POST"&&setMatch){
      const profile=userProfile(req); if(!profile)return json(res,401,{ok:false,error:"Unauthorized"});
      const session=workouts.get(setMatch[1]);
      if(!session||session.userId!==profile.telegramId)return json(res,404,{ok:false,error:"Session not found"});
      const b=await body(req);
      const set={id:crypto.randomUUID(),weight:Number(b.weight||0),reps:Number(b.reps||0),rpe:Number(b.rpe||0),savedAt:new Date().toISOString()};
      session.sets.push(set);
      profile.completed+=1;
      profile.streak=Math.max(1,profile.streak+1);
      return json(res,201,{ok:true,set,profile,nextMove:nextMove(profile)});
    }
    return json(res,404,{ok:false,error:"Not found"});
  }catch(error){
    console.error(error);
    return json(res,500,{ok:false,error:"Internal server error"});
  }
});
server.listen(port,()=>console.log("TORCLIX FIT API listening on "+port));