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
// Store current question data
let currentQuestionData = null;

// Format question type for display
function formatQuestionType(type) {
    switch(type) {
        case "BOOLEAN": return "True/False";
        case "INTEGER": return "Whole Number";
        case "NUMERIC": return "Decimal Number";
        case "MCQ": return "Multiple Choice (A, B, C, D)";
        case "TEXT": return "Text Answer";
        default: return type;
    }
}

//API FUNCTIONS

//Call the API
async function callAPI(endpoint) {
    try {
        const url = API_LINK + "/" + endpoint;
        const response = await fetch(url);
        const data = await response.json();

        console.log("API RESPONSE:", data);

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
        huntCard.innerHTML = `
    <div class="hunt-card-content">
        <h4 class="hunt-title">${hunt.name || "Treasure Hunt"}</h4>
        <p class="hunt-description">${hunt.description || "No description available"}</p>
    </div>
    <button class="app-btn app-btn-primary hunt-btn"
        onclick='selectHunt("${hunt.uuid}", "${hunt.name}")'>
        Start Hunt
    </button>`;
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
            showSection("question-section");
            await getQuestion(appData.session);
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

// Create appropriate answer input based on question type
function createAnswerInput(questionType) {
    const container = document.getElementById("answerInputContainer");
    let html = "";

    switch(questionType) {
        case "BOOLEAN":
            html = `
                <select id="answerInput" class="app-input">
                    <option value="">Select answer...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>`;
            break;

        case "MCQ":
            html = `
                <select id="answerInput" class="app-input">
                    <option value="">Select answer...</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                </select>`;
            break;

        case "INTEGER":
        case "NUMERIC":
            html = `<input type="number" id="answerInput" class="app-input"
                        step="${questionType === "INTEGER" ? 1 : "any"}"
                        placeholder="Enter your answer">`;
            break;

        case "TEXT":
        default:
            html = `<input type="text" id="answerInput" class="app-input"
                        placeholder="Enter your answer">`;
    }

    container.innerHTML = html;
}

// Display leaderboard
async function displayLeaderboard() {

}

//Display question in the UI
function displayQuestion(questionData) {
    const questionContainer = document.getElementById("questionContainer");
    const questionSection = document.getElementById("question-section");

    // Update question text
    document.getElementById("questionText").innerHTML = questionData.questionText || "No question text";

    // Update question info
    document.getElementById("questionIndex").textContent =
        `Question ${questionData.currentQuestionIndex + 1} of ${questionData.numOfQuestions}`;

    // Display question type
    document.getElementById("questionType").textContent =
        `Type: ${formatQuestionType(questionData.questionType)}`;

    // Show if question can be skipped
    const skipInfo = document.getElementById("skipInfo");
    if (questionData.canBeSkipped) {
        skipInfo.textContent = `Skip penalty: ${questionData.skipScore} points`;
        skipInfo.classList.remove("hidden");
    } else {
        skipInfo.classList.add("hidden");
    }

    // Show location requirement
    const locationInfo = document.getElementById("locationInfo");
    if (questionData['requires-location']) {
        locationInfo.textContent = "📍 This question requires you to be at a specific location";
        locationInfo.classList.remove("hidden");
        enableLocationTracking();
    } else {
        locationInfo.classList.add("hidden");
    }

    // Create answer input based on question type
    createAnswerInput(questionData.questionType);

    // Show the question section
    questionSection.classList.remove("hidden");
    questionContainer.classList.remove("hidden");
}

//Get the next question
async function getQuestion(session){
    const url = "question?session=" + session
    const data = await callAPI(url);

    // Check if the game is finished
    if (data.status === "FINISHED" || data.completed) {
        showFeedback("Treasure hunt completed!", true);
        showSection("leaderboard-section");
        await displayLeaderboard();
        return null;
    }
    currentQuestionData = data;
    displayQuestion(data);
    return data;
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

