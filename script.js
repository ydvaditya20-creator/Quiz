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


