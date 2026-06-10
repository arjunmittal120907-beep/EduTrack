const GEMINI_API_KEY = "AQ.Ab8RN6IlJVcxVirxYHfL0FPhIrhIXOAirI9lmQHZqphu5oPlsA";
let subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;

function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  const date = document.getElementById('exam-date').value;

  if (!name || !date) {
    alert('Please enter both subject name and exam date!');
    return;
  }

  const subject = {
    id: Date.now(),
    name: name,
    examDate: date,
    topics: [],
    important: false
  };

  subjects.push(subject);

  document.getElementById('subject-name').value = '';
  document.getElementById('exam-date').value = '';

  renderSubjects();
}

function daysLeft(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(dateStr);
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
}

function getBadge(days) {
  if (days <= 5)  return ['badge-danger',  '🔴 Urgent'];
  if (days <= 10) return ['badge-warning', '🟡 Soon'];
  return ['badge-success', '🟢 On Track'];
}

function getProgress(subject) {
  if (subject.topics.length === 0) return 0;
  const done = subject.topics.filter(t => t.done).length;
  return Math.round((done / subject.topics.length) * 100);
}

function addTopic(subjectId) {
  const input = document.getElementById('topic-input-' + subjectId);
  const val = input.value.trim();
  if (!val) return;

  const subject = subjects.find(s => s.id === subjectId);
  subject.topics.push({ id: Date.now(), name: val, done: false });
  input.value = '';

  renderSubjects();
}
function toggleImportant(subjectId) {
  const subject = subjects.find(s => s.id === subjectId);
  subject.important = !subject.important;
  renderSubjects();
}
function toggleTopic(subjectId, topicId) {
  const subject = subjects.find(s => s.id === subjectId);
  const topic = subject.topics.find(t => t.id === topicId);

  topic.done = !topic.done;

  renderSubjects();
}

function deleteTopic(subjectId, topicId) {
  const subject = subjects.find(s => s.id === subjectId);
  subject.topics = subject.topics.filter(t => t.id !== topicId);
  renderSubjects();
}

function deleteSubject(subjectId) {
  subjects = subjects.filter(s => s.id !== subjectId);
  renderSubjects();
}

function renderSubjects() {
  localStorage.setItem('subjects', JSON.stringify(subjects));
  const list = document.getElementById('subject-list');

  if (subjects.length === 0) {
    list.innerHTML =
      '<p style="text-align:center; color:#aaa; margin-top:40px;">No subjects yet. Add one above!</p>';
    return;
  }

  list.innerHTML = subjects.map(s => {
    const days = daysLeft(s.examDate);
    const [badgeClass, badgeText] = getBadge(days);
    const progress = getProgress(s);
    const done = s.topics.filter(t => t.done).length;

    return `
      <div class="subject-card">

        <div class="subject-header">
          <div>
            <div class="subject-name">${s.name}</div>
            <div class="countdown">
              📅 Exam in ${days} day${days !== 1 ? 's' : ''}
            </div>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <button class="delete-btn"
              onclick="toggleImportant(${s.id})">
              ${s.important ? '⭐' : '☆'}
            </button>

            <span class="badge ${badgeClass}">
              ${badgeText}
            </span>

            <button class="delete-btn"
              onclick="deleteSubject(${s.id})">
              🗑️
            </button>
          </div>
        </div>

        <div class="progress-wrap">
          <div class="progress-label">
            <span>${progress}% complete</span>
            <span>${done}/${s.topics.length} topics</span>
          </div>

          <div class="progress-bar">
            <div class="progress-fill"
                 style="width:${progress}%">
            </div>
          </div>
        </div>

        <div class="topics">

          ${s.topics.map(t => `
            <div class="topic-row">

              <input
                type="checkbox"
                ${t.done ? 'checked' : ''}
                onchange="toggleTopic(${s.id}, ${t.id})"
              />

              <span class="topic-name ${t.done ? 'done' : ''}">
    ${t.name}
</span>

${t.done ? `
<button onclick="startQuiz('${t.name}')">
    🧠 Quiz
</button>
` : ''}

              <button
                class="delete-btn"
                onclick="deleteTopic(${s.id}, ${t.id})">
                ✕
              </button>

            </div>
          `).join('')}

          <div class="add-topic-row">
            <input
              type="text"
              id="topic-input-${s.id}"
              placeholder="Add a topic..."
            />

            <button onclick="addTopic(${s.id})">
              Add
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}


renderSubjects();
async function generateQuiz(topicName) {

    const prompt = `
Generate 5 MCQs on ${topicName}.

Do NOT use LaTeX, markdown, $, **, or special formatting.
Questions and options must be plain text.

Return JSON only.

[
 {
   "question":"...",
   "options":["A","B","C","D"],
   "answer":"A"
 }
]
`;

    try {

        const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        console.log(JSON.stringify(data, null, 2));

        if (!response.ok) {
    console.error(data);
    alert(data.error?.message || "Gemini API Error");
    return [];
}

        let text =
            data.candidates[0].content.parts[0].text;

        text = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        return JSON.parse(text);

    } catch (err) {

        console.error(err);

        alert("Quiz generation failed.");

        return [];
    }
}
async function startQuiz(topicName){

    quizQuestions = await generateQuiz(topicName);

    if (!quizQuestions || quizQuestions.length === 0) {
        return;
    }

    currentQuizIndex = 0;
    quizScore = 0;

    document.getElementById("quizResult").innerHTML = "";
    document.getElementById("nextQuestionBtn").style.display = "block";

    document.getElementById("quizModal").style.display = "flex";

    showQuestion();
}
function showQuestion(){

    const q =
      quizQuestions[currentQuizIndex];

    document.getElementById(
      "quizQuestion"
    ).innerHTML = q.question;

    const options =
      document.getElementById(
        "quizOptions"
      );

    options.innerHTML = "";

    q.options.forEach(option=>{

        const btn =
          document.createElement("button");

        btn.textContent = option;

        btn.onclick = ()=>{

            if(option === q.answer){
                quizScore++;
            }

            document
              .querySelectorAll("#quizOptions button")
              .forEach(b=>b.disabled=true);

        };

        options.appendChild(btn);
    });
}
function nextQuestion() {

    currentQuizIndex++;

    if(currentQuizIndex < quizQuestions.length){

        showQuestion();

    } else {

    document.getElementById("quizQuestion").innerHTML = "";
    document.getElementById("quizOptions").innerHTML = "";

    document.getElementById("quizResult").innerHTML =
    `<h2>Final Score: ${quizScore}/${quizQuestions.length}</h2>`;

document.getElementById("closeQuizBtn").style.display = "block";

    document.getElementById("nextQuestionBtn").style.display = "none";
}
  }
  function closeQuiz() {
    document.getElementById("quizModal").style.display = "none";

    document.getElementById("quizQuestion").innerHTML = "";
    document.getElementById("quizOptions").innerHTML = "";
    document.getElementById("quizResult").innerHTML = "";

    document.getElementById("closeQuizBtn").style.display = "none";
}
