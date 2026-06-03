const API="https://audio-tspd.onrender.com/tts";
const logBox=document.getElementById("log");
const category=document.getElementById("category");
const questionsDiv=document.getElementById("questions");
const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");
const audioPlayer=document.getElementById("audio");

let questions=[];
let videoBlob=null;

function log(m){
 const d=document.createElement("div");
 d.textContent=new Date().toLocaleTimeString()+" : "+m;
 logBox.appendChild(d);
 logBox.scrollTop=logBox.scrollHeight;
}

async function loadCategories(){
 log("Loading categories...");
 const r=await fetch("https://opentdb.com/api_category.php");
 const j=await r.json();
 j.trivia_categories.forEach(c=>{
   category.innerHTML+=`<option value="${c.id}">${c.name}</option>`;
 });
 log("Categories loaded");
}
loadCategories();

document.getElementById("loadBtn").onclick=async()=>{
 const count=document.getElementById("count").value;
 log("Loading quiz...");
 const r=await fetch(`https://opentdb.com/api.php?amount=${count}&category=${category.value}`);
 const j=await r.json();
 questions=j.results;
 questionsDiv.innerHTML="";
 questions.forEach((q,i)=>{
   const t=document.createElement("textarea");
   t.id="q"+i;
   t.value=decode(q.question);
   questionsDiv.appendChild(t);
 });
 log(questions.length+" questions loaded");
};

function decode(s){
 const t=document.createElement("textarea");
 t.innerHTML=s;
 return t.value;
}

document.getElementById("audioBtn").onclick=async()=>{
 try{
  let text="";
  questions.forEach((q,i)=>{
   text+="Question "+(i+1)+". "+document.getElementById("q"+i).value+". ";
  });

  log("Requesting TTS...");
  const r=await fetch(API,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({text})
  });

  const j=await r.json();
  const bytes=Uint8Array.from(atob(j.audio),c=>c.charCodeAt(0));
  const blob=new Blob([bytes],{type:"audio/mp3"});
  audioPlayer.src=URL.createObjectURL(blob);
  log("Audio generated");
 }catch(e){
  log("Audio error: "+e.message);
 }
};

function drawSlide(text,n,total){
 ctx.fillStyle="white";
 ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle="black";
 ctx.font="60px Arial";
 ctx.fillText(`Question ${n}/${total}`,80,100);
 ctx.font="90px Arial";
 wrap(text,120,260,1600,110);
 ctx.fillRect(150,950,1500,30);
 ctx.fillStyle="green";
 ctx.fillRect(150,950,(n/total)*1500,30);
}

function wrap(text,x,y,maxW,lineH){
 const words=text.split(" ");
 let line="";
 for(let w of words){
  const test=line+w+" ";
  if(ctx.measureText(test).width>maxW){
   ctx.fillText(line,x,y);
   y+=lineH;
   line=w+" ";
  }else line=test;
 }
 ctx.fillText(line,x,y);
}

document.getElementById("videoBtn").onclick=async()=>{
 if(!audioPlayer.src){ log("Generate audio first"); return; }

 const videoStream=canvas.captureStream(30);
 const ac=new AudioContext();
 const a=new Audio(audioPlayer.src);
 const src=ac.createMediaElementSource(a);
 const dest=ac.createMediaStreamDestination();
 src.connect(dest);
 src.connect(ac.destination);

 const stream=new MediaStream([
  ...videoStream.getVideoTracks(),
  ...dest.stream.getAudioTracks()
 ]);

 const rec=new MediaRecorder(stream);
 const chunks=[];
 rec.ondataavailable=e=>chunks.push(e.data);

 rec.start();
 log("Recording started");

 a.play();

 const per=Math.max(3,(a.duration||questions.length*4)/Math.max(1,questions.length));

 for(let i=0;i<questions.length;i++){
   drawSlide(document.getElementById("q"+i).value,i+1,questions.length);
   log("Rendering question "+(i+1));
   await new Promise(r=>setTimeout(r,per*1000));
 }

 a.onended=()=>rec.stop();

 rec.onstop=()=>{
  videoBlob=new Blob(chunks,{type:"video/webm"});
  log("Video ready");
 };

};

document.getElementById("downloadBtn").onclick=()=>{
 if(!videoBlob){log("No video available");return;}
 const a=document.createElement("a");
 a.href=URL.createObjectURL(videoBlob);
 a.download="quiz_video.webm";
 a.click();
 log("Download started");
};
