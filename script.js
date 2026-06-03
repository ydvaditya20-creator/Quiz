const API = "https://audio-tspd.onrender.com/tts"    q.options[0] = document.getElementById(`opt_${i}_0`).value;

// Global Configuration aur Variables
const logBox = document.getElementById("log");
const category = document.getElementById("category");
const questionsDiv = document.getElementById("questions");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audioPlayer = document.getElementById("audio");

let quizData = []; // Options aur Answer ke sath full quiz data store karne ke liye
let audioUrls = []; // Har question ke individual audio blob URL ka array
let videoBlob = null;

// Console Style Status Logger
function log(m) {
  const d = document.createElement("div");
  d.textContent = new Date().toLocaleTimeString() + " : " + m;
  logBox.appendChild(d);
  logBox.scrollTop = logBox.scrollHeight;
}

// 1. Categories Dropdown Menu Load Karna
async function loadCategories() {
  log("Loading categories...");
  try {
    const r = await fetch("https://opentdb.com");
    const j = await r.json();
    category.innerHTML = "";
    j.trivia_categories.forEach(c => {
      category.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    log("Categories loaded");
  } catch (e) {
    log("Category error: " + e.message);
  }
}
loadCategories();

// HTML Entities (जैसे &quot;, &#039;) ko normal text me badalne ke liye
function decode(s) {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

// Options ko random order me mix karne ke liye helper function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 2. OpenTDB API se Questions load karna aur 4 Options set karna
document.getElementById("loadBtn").onclick = async () => {
  const count = document.getElementById("count").value;
  log("Loading quiz with options...");
  try {
    // type=multiple specify kiya hai taaki hamesha 4 options milein
    const r = await fetch(`https://opentdb.com{count}&category=${category.value}&type=multiple`);
    const j = await r.json();
    
    if(!j.results || j.results.length === 0) {
      log("No questions found. Try another category.");
      return;
    }

    quizData = j.results.map(q => {
      let incorrect = q.incorrect_answers.map(opt => decode(opt));
      let correct = decode(q.correct_answer);
      
      // Correct answer ko baki 3 options ke sath mila kar mix karna
      let allOptions = [...incorrect, correct];
      shuffleArray(allOptions);

      return {
        question: decode(q.question),
        options: allOptions,
        answer: correct
      };
    });

    renderQuizEditor();
    log(quizData.length + " questions with options loaded.");
  } catch (e) {
    log("Load error: " + e.message);
  }
};

// Screen par editable inputs/textareas banana
function renderQuizEditor() {
  questionsDiv.innerHTML = "";
  quizData.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.style.background = "#ffffff";
    card.style.padding = "15px";
    card.style.marginBottom = "15px";
    card.style.borderRadius = "8px";
    card.style.border = "1px solid #e2e8f0";

    card.innerHTML = `
      <div style="margin-bottom:8px;"><strong>Q${i+1}:</strong> <textarea id="q_${i}" style="width:100%; height:50px;">${q.question}</textarea></div>
      <div class="options-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:8px;">
        <div>A: <input type="text" id="opt_${i}_0" value="${q.options[0]}" style="width:85%;"></div>
        <div>B: <input type="text" id="opt_${i}_1" value="${q.options[1]}" style="width:85%;"></div>
        <div>C: <input type="text" id="opt_${i}_2" value="${q.options[2]}" style="width:85%;"></div>
        <div>D: <input type="text" id="opt_${i}_3" value="${q.options[3]}" style="width:85%;"></div>
      </div>
      <div><strong>Correct Answer:</strong> <input type="text" id="ans_${i}" value="${q.answer}" style="width:50%; border-color:#10b981;"></div>
    `;
    questionsDiv.appendChild(card);
  });
}

// User agar screen par text change kare toh generate karne se pehle data sync karna
function syncDataFromUI() {
  quizData.forEach((q, i) => {
    q.question = document.getElementById(`q_${i}`).value;
    q.options[0] = document.getElementById(`opt_${i}_0`).value;
    q.options[1] = document.getElementById(`opt_${i}_1`).value;
    q.options[2] = document.getElementById(`opt_${i}_2`).value;
    q.options[3] = document.getElementById(`opt_${i}_3`).value;
    q.answer = document.getElementById(`ans_${i}`).value;
  });
}
// 1. Har ek Question ka alag se Individual Audio generate karna (Per-Question Request)
document.getElementById("audioBtn").onclick = async () => {
  if (quizData.length === 0) { log("Load questions first!"); return; }
  syncDataFromUI(); // Part 1 ka function call karke updated text read karega
  audioUrls = [];
  log("Requesting TTS separately for each question to avoid mixing...");

  for (let i = 0; i < quizData.length; i++) {
    try {
      log(`Generating audio for Q${i+1}/${quizData.length}...`);
      const q = quizData[i];
      
      // Full voiceover text script structuring
      let textToSpeak = `Question number ${i+1}. ${q.question}. Option A. ${q.options[0]}. Option B. ${q.options[1]}. Option C. ${q.options[2]}. Option D. ${q.options[3]}. Think about the answer!`;
      
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak })
      });

      const j = await r.json();
      const bytes = Uint8Array.from(atob(j.audio), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/mp3" });
      audioUrls.push(URL.createObjectURL(blob));
    } catch (e) {
      log(`Audio error on Q${i+1}: ` + e.message);
    }
  }
  
  if(audioUrls.length > 0) {
    audioPlayer.src = audioUrls[0]; // Player me pehla question set kiya preview ke liye
    log("All individual audio tracks generated successfully!");
  }
};

// 2. YouTube Premium Layout Renderer Engine (1920x1080 Dimensions)
function drawSlideTemplate(qObj, n, total, state, timerProgress = 0, showAns = false) {
  // Eye Catching Blue-Black YouTube Gradient Background
  let bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#1e3a8a");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative Top Header Title Card
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillRect(50, 40, 1820, 100);
  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 40px Arial";
  ctx.fillText(`QUIZ TIME • Question ${n}/${total}`, 90, 105);

  // Modern White Question Surface Container
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(100, 220, 1720, 240, 20);
  ctx.fill();

  // Question Typography Wrapper
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 48px Arial";
  wrapText(qObj.question, 140, 310, 1640, 65);

  // 4 Grid Options Quadrant Coordinate Setup
  const positions = [
    { x: 100, y: 520 }, { x: 980, y: 520 },
    { x: 100, y: 700 }, { x: 980, y: 700 }
  ];
  const labels = ["A", "B", "C", "D"];

  qObj.options.forEach((opt, idx) => {
    let pos = positions[idx];
    let isCorrect = opt.trim().toLowerCase() === qObj.answer.trim().toLowerCase();

    // Jab Answer dikhana ho tab sirf correct option ko Green high-contrast rang dena
    if (showAns && isCorrect) {
      ctx.fillStyle = "#10b981"; 
      ctx.strokeStyle = "#22c55e";
    } else {
      ctx.fillStyle = "#ffffff"; 
      ctx.strokeStyle = "#cbd5e1";
    }

    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, 840, 140, 15);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();

    // Option Alphabet Bullet
    ctx.fillStyle = (showAns && isCorrect) ? "#ffffff" : "#2563eb";
    ctx.font = "bold 42px Arial";
    ctx.fillText(`${labels[idx]}:`, pos.x + 40, pos.y + 85);

    // Main text limits protection (Truncate logic if text too wide)
    ctx.fillStyle = (showAns && isCorrect) ? "#ffffff" : "#334155";
    ctx.font = "500 38px Arial";
    let optTxt = opt;
    if(ctx.measureText(optTxt).width > 650) {
        optTxt = optTxt.substring(0, 30) + "...";
    }
    ctx.fillText(optTxt, pos.x + 110, pos.y + 85);
  });

  // Circular Canvas Countdown Timer Ring Animation
  if (!showAns && state === "timer") {
    let cx = canvas.width / 2;
    let cy = 940;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    // Dynamic Arc sweep
    ctx.beginPath();
    ctx.arc(cx, cy, 65, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * timerProgress));
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#ef4444"; 
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    let secondsLeft = Math.ceil(5 - (timerProgress * 5));
    ctx.fillText(secondsLeft, cx, cy + 15);
    ctx.textAlign = "left"; 
  }

  // Green Bottom Correct Banner Alert
  if (showAns) {
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 46px Arial";
    ctx.fillText(`✓ Correct Answer: ${qObj.answer}`, 100, 960);
  }

  // Global Video Progress Bar at footer area
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(100, 1030, 1720, 16);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(100, 1030, (1720 / total) * n, 16);
}

// Smart Text Wrapper Engine
function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  for (let w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = w + " ";
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

// 3. Audio Context Injection Loop System & Dynamic Media Recording Pipeline
document.getElementById("videoBtn").onclick = async () => {
  if (audioUrls.length === 0) { log("Generate audio first!"); return; }
  syncDataFromUI(); // ensure fresh layout data integrity

  const videoStream = canvas.captureStream(30);
  const ac = new AudioContext();
  const dest = ac.createMediaStreamDestination();

  // Canvas tracks aur Audio Context nodes ko aapas me bundle karna
  const stream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
  const chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);

  rec.start();
  log("Recording started with Perfect Audio-Video Sync...");

  // Strictly Sequence Loop: Ek step complete hone par hi agla badhega
  for (let i = 0; i < quizData.length; i++) {
    log(`Rendering Slide for Question ${i+1}`);
    let currentQ = quizData[i];
    let currentAudioUrl = audioUrls[i];

    // Har question ke liye naya temporary HTML Audio node aur pipeline build karna
    const a = new Audio(currentAudioUrl);
    const src = ac.createMediaElementSource(a);
    src.connect(dest);
    src.connect(ac.destination);

    // Phase A: Slide draw hogi aur TTS bolna shuru karegi
    drawSlideTemplate(currentQ, i + 1, quizData.length, "read", 0, false);
    
    // System Promise tab tak unlock nahi hogi jab tak real audio execution end nahi hota
    await new Promise((resolve) => {
      a.play();
      a.onended = () => {
        src.disconnect(); // Clean nodes to prevent memory leak
        resolve();
      };
    });

    // Phase B: 5 Second Dynamic Ring Countdown Timer Block
    let timerStart = Date.now();
    let duration = 5000; 
    while (Date.now() - timerStart < duration) {
      let elapsed = Date.now() - timerStart;
      let progress = elapsed / duration;
      drawSlideTemplate(currentQ, i + 1, quizData.length, "timer", progress, false);
      await new Promise(r => setTimeout(r, 33)); // Fixed frame frequency controller (30 fps)
    }

    // Phase C: Highlight Winner Green card (2.5 Seconds buffer state)
    drawSlideTemplate(currentQ, i + 1, quizData.length, "answer", 0, true);
    await new Promise(r => setTimeout(r, 2500));
  }

  // Loop band hone par recorder safely freeze karna
  rec.stop();

  rec.onstop = () => {
    videoBlob = new Blob(chunks, { type: "video/webm" });
    log("Video creation complete! Ready for download.");
  };
};

// 4. Download Trigger Mechanism
document.getElementById("downloadBtn").onclick = () => {
  if (!videoBlob) { log("No video available"); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(videoBlob);
  a.download = `quiz_pro_video_${Date.now()}.webm`;
  a.click();
  log("Download started");
};


