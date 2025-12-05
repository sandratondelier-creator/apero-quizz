// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir les fichiers du dossier /public
app.use(express.static("public"));

// =======================
// CONFIG GÉNÉRALE
// =======================

const QUESTION_DURATION = 40; // durée d'une question en secondes

// Pauses spéciales :
const PAUSE_AFTER_10 = 5 * 60;   // 5 minutes après la question 10
const PAUSE_AFTER_20 = 15 * 60;  // 15 minutes après la question 20
const PAUSE_AFTER_30 = 5 * 60;   // 5 minutes après la question 30

// Normalisation (pour comparer les réponses sans accents / majuscules)
function normalize(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// =======================
// QUESTIONS – SÉRIES & TV
// =======================

const questions = [
  // I. QUIZZ HOT & SÉRIES TV
  {
    type: "open",
    text: "Dans quelle série un personnage tente maladroitement de séduire tout le monde au bureau, souvent avec des résultats hilarants ?",
    correctAnswer: "the office"
  },
  {
    type: "open",
    text: "Dans quelle série un politicien obtient autant de pouvoir par le cul que par les urnes ?",
    correctAnswer: "house of cards"
  },
  {
    type: "open",
    text: "Dans quelle série une impératrice utilise un citron comme méthode de contraception ?",
    correctAnswer: "the great"
  },
  {
    type: "open",
    text: "Dans quelle série le couple Ross et Rachel a-t-il accumulé plus de malentendus et de disputes que de vrais moments romantiques ?",
    correctAnswer: "friends"
  },
  {
    type: "open",
    text: "Dans Game of Thrones, quel personnage surprend dans la scène la plus gênante son fils en plein ébat avec la reine ?",
    correctAnswer: "bran"
  },

  // II. DEVINE LA SÉRIE AVEC UNE SEULE RÉPLIQUE CULTE
  {
    type: "open",
    text: "De quelle série vient ce cri de guerre un peu chelou : « Bazinga ! » ?",
    correctAnswer: "big bang theory"
  },
  {
    type: "open",
    text: "Dans quelle série les costumes sont impeccables et la famille plus dangereuse que la mafia italienne : « La famille, c’est sacré. » ?",
    correctAnswer: "peaky blinders"
  },
  {
    type: "open",
    text: "De quelle série vient cette phrase qui annonce galères, neige et beaucoup trop de morts : « Winter is coming » ?",
    correctAnswer: "game of thrones"
  },
  {
    type: "open",
    text: "Dans quelle série française un chevalier répond « c’est pas faux » avec une assurance totale ?",
    correctAnswer: "kaamelott"
  },
  {
    type: "open",
    text: "De quelle série vient la phrase utilisée quand on s’apprête clairement à faire une énorme connerie : « Défi accepté » ?",
    correctAnswer: "how i met your mother"
  },

  // III. STRANGER THINGS
  {
    type: "open",
    text: "Dans quelle ville apparemment tranquille mais maudite se déroulent les catastrophes de Stranger Things ?",
    correctAnswer: "hawkins"
  },
  {
    type: "open",
    text: "Comment s’appelle la mascotte officielle de l’Envers, spécialiste en disparition d’habitants, dans Stranger Things ?",
    correctAnswer: "demogorgon"
  },
  {
    type: "open",
    text: "De quel club de l’école les enfants de Stranger Things sont-ils membres ?",
    correctAnswer: "audiovisuel"
  },
  {
    type: "open",
    text: "Quel est le vrai prénom de la fillette la plus badass du monde, connue sous le nom de 11 (Eleven) ?",
    correctAnswer: "jane"
  },
  {
    type: "open",
    text: "Quel est le prénom du personnage le plus loyal, au sourire à trois dents et à la casquette vissée sur la tête ?",
    correctAnswer: "dustin"
  },

  // IV. SÉRIES MÉDICALES
  {
    type: "open",
    text: "Dans Dr House, à quel petit cachet le médecin le plus insolent de la télé devient-il complètement dépendant à cause de sa jambe ?",
    correctAnswer: "vicodin"
  },
  {
    type: "open",
    text: "Dans quelle série tu peux te fiancer, divorcer, tomber dans le coma et perdre ton meilleur ami sur une seule garde de nuit ?",
    correctAnswer: "grey"
  },
  {
    type: "open",
    text: "Quelle série dérivée de Grey’s Anatomy suit les aventures d’Addison Montgomery ?",
    correctAnswer: "private practice"
  },
  {
    type: "open",
    text: "Par quel surnom le héros de la série médicale Scrubs est-il connu ?",
    correctAnswer: "j.d"
  },
  {
    type: "open",
    text: "Dans quelle série un médecin légiste devient-il un tueur en série ?",
    correctAnswer: "dexter"
  },

  // V. SITCOMS
  {
    type: "open",
    text: "Dans Friends, quel est le métier de Chandler Bing (celui que ses amis n’arrivent jamais à retenir) ?",
    correctAnswer: "statistique"
  },
  {
    type: "open",
    text: "Dans The Big Bang Theory, comment s’appelle la voisine et amie des scientifiques, serveuse et actrice en devenir ?",
    correctAnswer: "penny"
  },
  {
    type: "open",
    text: "Dans How I Met Your Mother, quel objet emblématique représente les souvenirs amoureux de Ted et Robin ?",
    correctAnswer: "cor bleu"
  },
  {
    type: "open",
    text: "Dans Le Prince de Bel-Air, dans quelle ville Will emménage-t-il chez son oncle et sa tante ?",
    correctAnswer: "los angeles"
  },
  {
    type: "open",
    text: "Dans Brooklyn Nine-Nine, quel est le nom du capitaine du commissariat du 99e district ?",
    correctAnswer: "holt"
  },

  // VI. SPÉCIAL NETFLIX
  {
    type: "open",
    text: "Quelle série lancée en 2013 est le premier show produit par Netflix ?",
    correctAnswer: "house of cards"
  },
  {
    type: "open",
    text: "Quelle série Netflix a vu l’arrivée de Gillian Anderson et Olivia Colman dans son casting en 2020 ?",
    correctAnswer: "the crown"
  },
  {
    type: "open",
    text: "Quelle série TV Netflix montre les dérives possibles des nouvelles technologies dans notre quotidien ?",
    correctAnswer: "black mirror"
  },
  {
    type: "open",
    text: "Quel grand réalisateur de cinéma a signé plusieurs épisodes de la série Mercredi, autour de la famille Addams ?",
    correctAnswer: "tim burton"
  },
  {
    type: "open",
    text: "Quelle série Netflix est l’adaptation d’une saga littéraire polonaise sur un chasseur solitaire de monstres mutants ?",
    correctAnswer: "witcher"
  },

  // VII. MUSIQUES – TROUVE LA SÉRIE
  {
    type: "open",
    text: "Dans quelle série entend-on la musique : « I’m Always Here » de Jimi Jamison ?",
    correctAnswer: "alerte a malibu"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on la musique : « Red Right Hand » de Nick Cave & The Bad Seeds ?",
    correctAnswer: "peaky blinders"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on le thème : « Magnum » (Higgins Gentlemen) ?",
    correctAnswer: "magnum"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on « Pas le temps » de Faf La Rage ?",
    correctAnswer: "prison break"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on « Way Back Then » de Jung Jaeil ?",
    correctAnswer: "squid game"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on « How to Save a Life » de The Fray ?",
    correctAnswer: "grey"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on le générique « Generic New School » de DJ Maze ?",
    correctAnswer: "dr house"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on « The Eyes of the Ranger » ?",
    correctAnswer: "walker texas ranger"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on le « Main Title » de Ramin Djawadi ?",
    correctAnswer: "game of thrones"
  },
  {
    type: "open",
    text: "Dans quelle série entend-on « Outro » de M83 comme générique ?",
    correctAnswer: "versailles"
  }
];

const TOTAL_QUESTIONS = questions.length;

// =======================
// ÉTAT DU JEU & JOUEURS
// =======================

// joueurs : clé = prénom normalisé, valeur = { name, score }
let players = {};

// mapping socket.id -> clé du joueur (prénom normalisé)
let socketToPlayerKey = {};

let gameState = {
  started: false,
  phase: "waiting", // waiting | question | pause | finished
  currentIndex: -1,
  blockNumber: 0,
  remaining: 0
};

let answersGiven = {};          // { [questionIndex]: { [playerKey]: true } }
let firstCorrectResponder = {}; // { [questionIndex]: playerKey }
let timer = null;

// =======================
// FONCTIONS UTILITAIRES
// =======================

function getCurrentQuestion() {
  if (gameState.currentIndex < 0 || gameState.currentIndex >= questions.length) {
    return null;
  }
  return questions[gameState.currentIndex];
}

function updateBlockNumber() {
  if (gameState.currentIndex < 0) {
    gameState.blockNumber = 0;
  } else {
    gameState.blockNumber = Math.floor(gameState.currentIndex / 5) + 1;
  }
}

function buildPublicState() {
  const q = getCurrentQuestion();

  let questionForClients = null;
  if (gameState.phase === "question" && q) {
    questionForClients = {
      type: q.type,
      text: q.text,
      options: q.type === "mcq" ? q.options : null
    };
  }

  const leaderboard = Object.values(players)
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  return {
    started: gameState.started,
    phase: gameState.phase,
    currentIndex: gameState.currentIndex,
    blockNumber: gameState.blockNumber,
    remaining: gameState.remaining,
    totalQuestions: TOTAL_QUESTIONS,
    question: questionForClients,
    playersCount: Object.keys(players).length,
    leaderboard
  };
}

function broadcastState() {
  io.emit("state", buildPublicState());
}

function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  clearTimer();
  timer = setInterval(() => {
    if (!gameState.started) return;
    if (gameState.remaining > 0) {
      gameState.remaining -= 1;
      broadcastState();
      return;
    }
    nextStep();
  }, 1000);
}

function startGame() {
  if (!questions.length) return;

  console.log("▶️ Démarrage du quiz");
  gameState.started = true;
  gameState.phase = "question";
  gameState.currentIndex = 0;
  updateBlockNumber();
  gameState.remaining = QUESTION_DURATION;

  answersGiven = {};
  firstCorrectResponder = {};
  startTimer();
  broadcastState();
}

function stopGame() {
  console.log("⛔ Quiz stoppé");
  gameState.started = false;
  gameState.phase = "finished";
  gameState.remaining = 0;
  clearTimer();
  broadcastState();
}

// =======================
// LOGIQUE DE FLUX
// =======================

function nextStep() {
  if (!gameState.started) return;

  // sortie de pause → question suivante
  if (gameState.phase === "pause") {
    const nextIndex = gameState.currentIndex + 1;

    if (nextIndex >= questions.length) {
      stopGame();
      return;
    }

    gameState.currentIndex = nextIndex;
    gameState.phase = "question";
    updateBlockNumber();
    gameState.remaining = QUESTION_DURATION;
    startTimer();
    broadcastState();
    return;
  }

  // passage question → ?
  if (gameState.phase === "question") {
    const nextIndex = gameState.currentIndex + 1;

    if (nextIndex >= questions.length) {
      stopGame();
      return;
    }

    // Pauses spéciales
    if (nextIndex === 10) {
      gameState.phase = "pause";
      gameState.remaining = PAUSE_AFTER_10;
      startTimer();
      broadcastState();
      return;
    }

    if (nextIndex === 20) {
      gameState.phase = "pause";
      gameState.remaining = PAUSE_AFTER_20;
      startTimer();
      broadcastState();
      return;
    }

    if (nextIndex === 30) {
      gameState.phase = "pause";
      gameState.remaining = PAUSE_AFTER_30;
      startTimer();
      broadcastState();
      return;
    }

    // Sinon → question suivante
    gameState.currentIndex = nextIndex;
    gameState.phase = "question";
    updateBlockNumber();
    gameState.remaining = QUESTION_DURATION;
    startTimer();
    broadcastState();
  }
}

// =======================
// SOCKETS
// =======================

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  // envoie l'état au nouveau venu
  socket.emit("state", buildPublicState());

  // Joueur rejoint
  socket.on("joinPlayer", (nameRaw) => {
    const name = (nameRaw || "").toString().trim() || "Joueur";
    const key = normalize(name);

    // crée le joueur si besoin
    if (!players[key]) {
      players[key] = { name, score: 0 };
      console.log("Nouveau joueur :", name);
    } else {
      console.log("Reconnexion du joueur :", name);
    }

    socketToPlayerKey[socket.id] = key;
    broadcastState();
  });

  // Réponse d'un joueur
  socket.on("answer", ({ questionIndex, answer }) => {
    const key = socketToPlayerKey[socket.id];
    if (!key || !players[key]) return;
    const player = players[key];

    if (typeof questionIndex !== "number") return;
    if (questionIndex < 0 || questionIndex >= questions.length) return;

    if (!answersGiven[questionIndex]) {
      answersGiven[questionIndex] = {};
    }
    if (answersGiven[questionIndex][key]) {
      return; // a déjà répondu
    }
    answersGiven[questionIndex][key] = true;

    const q = questions[questionIndex];
    if (!q) return;

    let isCorrect = false;

    if (q.type === "mcq") {
      isCorrect = (typeof answer === "number" && q.correctIndex === answer);
    } else if (q.type === "open") {
      const expected = normalize(q.correctAnswer || "");
      const userAnswer = normalize(answer || "");
      isCorrect = expected && userAnswer.includes(expected);
    }

    if (isCorrect) {
      if (!firstCorrectResponder[questionIndex]) {
        firstCorrectResponder[questionIndex] = key;
        player.score += 2; // premier
        console.log(`${player.name} est le PREMIER à répondre juste à Q${questionIndex + 1} (+2 pts)`);
      } else {
        player.score += 1;
        console.log(`${player.name} a répondu JUSTE à Q${questionIndex + 1} (+1 pt)`);
      }
    } else {
      console.log(`${player.name} a répondu faux à Q${questionIndex + 1}`);
    }

    broadcastState();
  });

  // Host démarre
  socket.on("hostStart", () => {
    if (gameState.started) return;
    gameState = {
      started: false,
      phase: "waiting",
      currentIndex: -1,
      blockNumber: 0,
      remaining: 0
    };
    answersGiven = {};
    firstCorrectResponder = {};
    startGame();
  });

  // Host stoppe
  socket.on("hostStop", () => {
    stopGame();
  });

  socket.on("disconnect", () => {
    // ON NE SUPPRIME PLUS LES JOUEURS (leurs scores restent)
    delete socketToPlayerKey[socket.id];
    console.log("Socket déconnecté :", socket.id);
  });
});

// =======================
// LANCEMENT SERVEUR
// =======================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé sur http://localhost:" + PORT);
});
