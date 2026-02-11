// Function to open burger menu
function openMenu() {
    var x = document.getElementById("menu");
    if (x.className === "menu") {
        x.className += " responsive";
    } else {
        x.className = "menu";
    }
}

// Scroll tracking for animation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2
});

document.querySelectorAll('.fly-in').forEach(el => {
    observer.observe(el);
});

//API section
const API_BASE="https://codecyprus.org/th/api";

async function getAPI(endpoint) {
    const response = await fetch(`${API_BASE}/${endpoint}`);
    return await response.json();
}

//API functions
async function getTreasureHunts(){
    return await getAPI("list");
}

async function startSession(playerName, huntId){
    return await getAPI(`start?playerName=${playerName}&app=webapp&treasure-hunt-id=${huntId}`);
}

async function getQuestion(session){
    return await getAPI(`question?session=${session}`);
}

async function submitAnswer(session, answer){
    return await getAPI(`answer?session=${session}&answer=${answer}`);
}

async function skipQuestion(session){
    return await getAPI(`skip?session=${session}`);
}

async function getScore(session){
    return await getAPI(`score?session=${session}`);
}

async function getLeaderboard(session){
    return await getAPI(`leaderboard?session=${session}`);
}