const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ======================
//  CONFIG QUIZ
// ======================

// Durée d'une question (en secondes)
const QUESTION_DURATION = 60; // ex : 60 ou 90

// Durée d'une pause entre blocs (en secondes)
const PAUSE_DURATION = 300; // 5 minutes

// Pauses toutes les 5 questions
const QUESTIONS_PER_BLOCK = 5;

// ======================
//  QUESTIONS
// ======================
// type: "mcq" (QCM) ou "open" (réponse ouverte)
// Pour mcq => ajouter "options: [...]"
// Tu remplaceras ce tableau par tes 40 questions.

const questions = [
  {
    type: "mcq",
    text: "Quelle est la capitale de la France ?",
    options: ["Lyon", "Marseille", "Paris", "Nice"]
  },
  {
    type: "open",
    text: "Cite un cocktail à base de gin."
  },
  {
    type: "mcq",
    text: "Combien y a-t-il de minutes dans 2 heures ?",
    options: ["90", "100", "110", "120"]
  },
  {
    type: "open",
    text: "Dans quelle ville se trouve la Tour Eiffel ?"
  },
  {
    type: "mcq",
    text: "Quel est l’alcool principal du mojito ?",
    options: ["Vodka", "Rhum", "Gin", "Tequila"]
  },

  // ➕ ICI tu mets tes autres questions :
  // { type: "open", text: "Ta question ouverte..." },
  // { type: "mcq", text: "Ta question QCM...", options: ["A", "B", "C", "D"] },
];

// ======================
//  ÉTAT DU JEU
// ======================

let gameState = {
  started: false,
  phase: "waiting", // "waiting" | "question" | "pause" | "finished"
  currentIndex: 0,  // index de la question actuelle
  remaining: 0,     // secondes restantes
  players: {}       // socketId -> { name }
};

let timer = null;

// ======================
//  FONCTIONS
// ======================

function buildPublicState() {
  const totalQuestions = questions.length;
  const idx = gameState.currentIndex;
  const q = questions[idx] || null;
  const phase = gameState.phase;

  let questionForClients = null;

  if (phase === "question" && q) {
    questionForClients = {
      type: q.type,
      text: q.text,
      options: q.type === "mcq" ? q.options : null
    };
  }

  const blockNumber = Math.floor(idx / QUESTIONS_PER_BLOCK) + 1;
  const inBlockNumber = (idx % QUESTIONS_PER_BLOCK) + 1;

  return {
    started: gameState.started,
    phase,
    remaining: gameState.remaining,
    currentIndex: idx,
    totalQuestions,
    question: questionForClients,
    blockNumber,
    inBlockNumber,
    playersCount: Object.keys(gameState.players).length
  };
}

function broadcastState() {
  io.emit("state", buildPublicState());
}

function startQuestion(index) {
  gameState.phase = "question";
  gameState.currentIndex = index;
  gameState.remaining = QUESTION_DURATION;
  broadcastState();
}

function startPause() {
  gameState.phase = "pause";
  gameState.remaining = PAUSE_DURATION;
  broadcastState();
}

function startGame() {
  if (!questions.length) {
    console.log("Aucune question configurée.");
    return;
  }
  if (gameState.started) return;

  gameState.started = true;
  gameState.phase = "question";
  gameState.currentIndex = 0;
  gameState.remaining = QUESTION_DURATION;
  broadcastState();

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
}

function tick() {
  if (!gameState.started) return;
  if (gameState.phase === "finished" || gameState.phase === "waiting") return;

  gameState.remaining -= 1;
  if (gameState.remaining < 0) gameState.remaining = 0;

  broadcastState();

  if (gameState.remaining > 0) return;

  // Quand le timer arrive à 0 :
  if (gameState.phase === "question") {
    const idx = gameState.currentIndex;
    const total = questions.length;
    const isLastQuestion = idx >= total - 1;
    const isEndOfBlock =
      ((idx + 1) % QUESTIONS_PER_BLOCK === 0) && !isLastQuestion;

    if (isLastQuestion) {
      gameState.phase = "finished";
      gameState.started = false;
      broadcastState();
      clearInterval(timer);
      timer = null;
      return;
    }

    if (isEndOfBlock) {
      // Pause après ce bloc de 5 questions
      startPause();
    } else {
      // Question suivante
      startQuestion(idx + 1);
    }
  } else if (gameState.phase === "pause") {
    // Fin de la pause → question suivante
    const nextIndex = gameState.currentIndex + 1;
    if (nextIndex >= questions.length) {
      gameState.phase = "finished";
      gameState.started = false;
      broadcastState();
      clearInterval(timer);
      timer = null;
      return;
    }
    startQuestion(nextIndex);
  }
}

// ======================
//  WEBSOCKETS
// ======================

io.on("connection", (socket) => {
  console.log("Nouvelle connexion:", socket.id);

  // Envoi de l'état actuel quand quelqu'un arrive
  socket.emit("state", buildPublicState());

  // Joueur qui rejoint
  socket.on("joinPlayer", (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    gameState.players[socket.id] = { name: trimmed };
    console.log(`Joueur connecté : ${trimmed}`);
    broadcastState();
  });

  // L'animateur (host) démarre le quiz
  socket.on("hostStart", () => {
    console.log("Host démarre le quiz");
    startGame();
  });

  // Réponse d'un joueur
  socket.on("answer", ({ questionIndex, answer }) => {
    const playerName = gameState.players[socket.id]?.name || socket.id;
    console.log(`Réponse de ${playerName} à Q${questionIndex + 1}:`, answer);
    // Ici tu peux plus tard ajouter un système de points si tu veux
  });

  // Déconnexion d'un joueur
  socket.on("disconnect", () => {
    if (gameState.players[socket.id]) {
      console.log("Joueur déconnecté:", gameState.players[socket.id].name);
      delete gameState.players[socket.id];
      broadcastState();
    }
  });
});

// ======================
//  LANCEMENT SERVEUR
// ======================

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé sur http://localhost:" + PORT);
});