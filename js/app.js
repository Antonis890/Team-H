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

//SCREEN FUNCTIONS

//Show specific sections
function showSection(sectionId){
    //hide all
    const sections = document.querySelectorAll(".app-section");
    for (let i = 0; i < sections.length; i++) {
        sections[i].classList.remove("active");
    }

    //show section
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
    document.getElementById("errorMessage").innerContent = message;
    showSection("error-section")
}

//Show feedback message
function showFeedback(message, isSuccess){
    const feedback = document.getElementById("feedback");
    if (!feedback){
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
}