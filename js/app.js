//API SECTION
const API_LINK="https://codecyprus.org/th/api";
const APP_NAME = "webapp";

//STORE APP DATA
const appData = {
    session: null,
    playerName: null,
    currentHunt: null,
    score: 0,
    isPlaying: false
};

//API FUNCTIONS

//Call the API
async function callAPI(endpoint) {
    try {
        const url = API_LINK + "/" + endpoint;
        const response = await fetch(url);
        const data = await response.json();

        //Check for errors
        if (data.status === "ERROR") {
            throw new Error(data.errorMessages);
        }
        return data;
    } catch (error) {
        console.error("API Error: ", error);
        throw error;
    }
}

//Get all available treasure hunts
async function getTreasureHunts(){
    const url = "list"
    return await callAPI(url);
}

//Start a game session
async function startSession(playerName, huntId){
    const url = "start?player=" + playerName + "&app=" + APP_NAME + "&treasure-hunt-id=" + huntId;
    return await callAPI(url);
}

//Hunt selection
async function loadTreasureHunts(){
    const playerName = document.getElementById("playerNameInput").value.trim();
    if (!playerName){
       showFeedback("Please enter your name", false);
       return;
    }
    appData.playerName = playerName;
    showLoading(true);
    try {
        const data = await getTreasureHunts();
        const hunts = data.treasureHunts || data;
        displayHuntList(hunts);
        document.getElementById("huntSelection").classList.remove("hidden");
    } catch (error) {
        showError("Could not load treasure hunts");
    } finally {
        showLoading(false);
    }
}

function displayHuntList(hunts){
    const huntList = document.getElementById("huntList");
    huntList.innerHTML = "";
    if(!hunts || hunts.length === 0){
        huntList.innerHTML = "<p>No treasure hunts available</p>";
        return;
    }
    for (let i = 0; i < hunts.length; i++) {
        const hunt = hunts[i];
        const huntCard = document.createElement("div");
        huntCard.className = "hunt-card";
        huntCard.innerHTML =
        "<h4>" + (hunt.name || hunt.description) + "</h4>" +
        "<p>" + (hunt.description || "") + "</p>" +
        "<button class='app-btn app-btn-primary' onclick='selectHunt(\"" + hunt.uuid + "\", \"" + hunt.name + "\")'>Start Hunt</button>";
        huntList.appendChild(huntCard);
    }
}

async function selectHunt(huntId, huntName){
    showLoading(true);
    try {
        const data = await startSession(appData.playerName, huntId);
        if (data.session){
            appData.session = data.session;
            appData.currentHunt = {id:huntId, name: huntName};
            appData.isPlaying = true;
            updateSessionInfo();
        } else {
            throw new Error("Could not start session");
        }
    } catch (error) {
        showError("Could not start hunt: " + error.message);
    } finally {
        showLoading(false);
    }
}

//SCREEN FUNCTIONS

//Show specific sections
function showSection(sectionId){
    //hide all
    const sections = document.querySelectorAll(".app-section");
    for (let i = 0; i < sections.length; i++) {
        sections[i].classList.remove("active");
    }

    //show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection){
        targetSection.classList.add("active");
    }
}

//Show or hide loading spinner
function showLoading(show){
    const overlay = document.getElementById("loadingOverlay");
    if (show){
        overlay.classList.remove("hidden");
    } else{
        overlay.classList.add("hidden");
    }
}

//Show an error message
function showError(message){
    document.getElementById("errorMessage").textContent = message;
    showSection("error-section");
}

//Show feedback message
function showFeedback(message, isSuccess){
    const feedback = document.getElementById("feedback");
    if (!feedback) {
        return;
    }
    feedback.textContent = message;

    //Remove old classes
    feedback.classList.remove("success");
    feedback.classList.remove("error");

    //Add new class
    if (isSuccess){
        feedback.classList.add("success");
    } else {
        feedback.classList.add("error");
    }
    feedback.classList.remove("hidden");
    setTimeout(function(){
        feedback.classList.add("hidden");
    }, 3000);
}

//Update session info in the header
function updateSessionInfo(){
    const sessionInfo = document.getElementById("sessionInfo");
    const playerNameInfo = document.getElementById("playerName");
    const scoreInfo = document.getElementById("currentScore");

    if (appData.session) {
        sessionInfo.classList.remove("hidden");
        playerNameInfo.textContent = appData.playerName;
        scoreInfo.textContent = "Score: " + appData.score;
    } else {
        sessionInfo.classList.add("hidden");
    }
}

//Get the next question
async function getQuestion(session){
    const url = "question?session=" + session
    return await callAPI(url);
}

//Submit answer
async function submitAnswer(session, answer){
    const url = "answer?session=" + session + "&answer=" + answer;
    return await callAPI(url);
}

//Skip question
async function skipQuestion(session){
    const url = "skip?session=" + session;
    return await callAPI(url);
}

//Get current score
async function getScore(session){
    const url = "score?session=" + session;
    return await callAPI(url);
}

//Get leaderboard
async function getLeaderboard(session){
    const url = "leaderboard?session=" + session;
    return await callAPI(url);
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded");
    document.getElementById("loadHuntBtn").addEventListener("click", loadTreasureHunts);
    showSection("welcome-section");
})
window.selectHunt = selectHunt;

