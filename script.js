const API = "https://audio-tspd.onrender.com/tts";
const logBox = document.getElementById("log");
const category = document.getElementById("category");
const questionsDiv = document.getElementById("questions");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audioPlayer = document.getElementById("audio");

let quizData = []; // Options aur Answer ke sath data store karne ke liye
let audioUrls = []; // Har question ke audio URL ka array
let videoBlob = null;

function log(m) {
  const d = document.createElement("div");
  d.textContent = new Date().toLocaleTimeString() + " : " + m;
  logBox.appendChild(d);
  logBox.scrollTop = logBox.scrollHeight;
}

// 1. Categories load karna
async function loadCategories() {
  log("Loading categories...");
  try {
    const r = await fetch("https://opentdb.com/api_category.php");
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

// HTML Entities decode karne ke liye function
function decode(s) {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

// Helper function: Options ko shuffle karne ke liye
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 2. Load Quiz with 4 Options + Answer
document.getElementById("loadBtn").onclick = async () => {
  const count = document.getElementById("count").value;
  log("Loading quiz with options...");
  try {
    // type=multiple specify kiya taaki hamesha 4 options milein
    const r = await fetch(`https://opentdb.com/api.php?amount=${count}&category=${category.value}&type=multiple`);
    const j = await r.json();
    
    if(!j.results || j.results.length === 0) {
      log("No questions found. Try another category.");
      return;
    }

    quizData = j.results.map(q => {
      let incorrect = q.incorrect_answers.map(opt => decode(opt));
      let correct = decode(q.correct_answer);
      // Correct answer ko incorrect ke sath mila kar shuffle karna
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

// UI par Editable Forms render karna
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

// User agar UI me kuch badlao kare toh use sync karna
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

// 3. Generate Separate Audio per Question
document.getElementById("audioBtn").onclick = async () => {
  if (quizData.length === 0) { log("Load questions first!"); return; }
  syncDataFromUI();
  audioUrls = [];
  log("Requesting TTS separately for each question to avoid mixing...");

  for (let i = 0; i < quizData.length; i++) {
    try {
      log(`Generating audio for Q${i+1}/${quizData.length}...`);
      const q = quizData[i];
      // Pura script text create karna voiceover ke liye
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
    // Pehla audio preview ke liye player me set kar dete hain
    audioPlayer.src = audioUrls[0];
    log("All individual audio tracks generated successfully!");
  }
};

// 4. YouTube Professional Slide Template Renderer (1920x1080)
function drawSlideTemplate(qObj, n, total, state, timerProgress = 0, showAns = false) {
  // Rich Blue-Black YouTube Gradient Background
  let bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#1e3a8a");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top Title Bar Card
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillRect(50, 40, 1820, 100);
  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 40px Arial";
  ctx.fillText(`QUIZ TIME • Question ${n}/${total}`, 90, 105);

  // Modern White Question Box Container
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(100, 220, 1720, 240, 20);
  ctx.fill();

  // Question Text Wrapping
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 48px Arial";
  wrap(qObj.question, 140, 310, 1640, 65);

  // 4 Options Layout Position Vectors
  const positions = [
    { x: 100, y: 520 }, { x: 980, y: 520 },
    { x: 100, y: 700 }, { x: 980, y: 700 }
  ];
  const labels = ["A", "B", "C", "D"];

  qObj.options.forEach((opt, idx) => {
    let pos = positions[idx];
    let isCorrect = opt.trim().toLowerCase() === qObj.answer.trim().toLowerCase();

    if (showAns && isCorrect) {
      ctx.fillStyle = "#10b981"; // Green for Correct
      ctx.strokeStyle = "#22c55e";
    } else {
      ctx.fillStyle = "#ffffff"; // Standard option box
      ctx.strokeStyle = "#cbd5e1";
    }

    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, 840, 140, 15);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();

    // Option Label bullet
    ctx.fillStyle = (showAns && isCorrect) ? "#ffffff" : "#2563eb";
    ctx.font = "bold 42px Arial";
    ctx.fillText(`${labels[idx]}:`, pos.x + 40, pos.y + 85);

    // Option text string
    ctx.fillStyle = (showAns && isCorrect) ? "#ffffff" : "#334155";
    ctx.font = "500 38px Arial";
    
    // Truncate option text if too long
    let optTxt = opt;
    if(ctx.measureText(optTxt).width > 650) {
        optTxt = optTxt.substring(0, 30) + "...";
    }
    ctx.fillText(optTxt, pos.x + 110, pos.y + 85);
  });

  // Circular Canvas Timer ring
  if (!showAns && state === "timer") {
    let cx = canvas.width / 2;
    let cy = 940;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 65, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * timerProgress));
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#ef4444"; // Red countdown
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    let secondsLeft = Math.ceil(5 - (timerProgress * 5));
    ctx.fillText(secondsLeft, cx, cy + 15);
    ctx.textAlign = "left"; // reset
  }

  // Answer Display Alert Box at bottom
  if (showAns) {
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 46px Arial";
    ctx.fillText(`✓ Correct Answer: ${qObj.answer}`, 100, 960);
  }

  // Bottom Bottom Global Progress Bar
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(100, 1030, 1720, 16);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(100, 1030, (1720 / total) * n, 16);
}

// Custom Wrap Engine
function wrap(text, x, y, maxW, lineH) {
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

// 5. Generate Sync Video Process
document.getElementById("videoBtn").onclick = async () => {
  if (audioUrls.length === 0) { log("Generate audio first!"); return; }
  syncDataFromUI();

  const videoStream = canvas.captureStream(30);
  const ac = new AudioContext();
  const dest = ac.createMediaStreamDestination();

  // Combine Canvas and Web Audio Node streams
  const stream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

