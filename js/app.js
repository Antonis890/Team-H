document.addEventListener("DOMContentLoaded", function() {
    // Leaderboard modal events
    document.getElementById("leaderboardBtn").addEventListener("click", function() {
        if (appData.session) {
            getLeaderboard(appData.session, "leaderboard");
        }
        document.getElementById("leaderboardContainer").classList.remove("hidden");
    });

    document.getElementById("closeLeaderboardBtn").addEventListener("click", function() {
        document.getElementById("leaderboardContainer").classList.add("hidden");
    });

    // Close modal when clicking outside
    document.getElementById("leaderboardContainer").addEventListener("click", function(event) {
        if (event.target === this) {
            this.classList.add("hidden");
        }
    });
});


//API SECTION
const API_LINK="https://codecyprus.org/th/api";
const APP_NAME = "webapp";
const LOCATION_COOLDOWN = 30000; //30 seconds, used to refresh location

//STORE APP DATA
const appData = {
    session: null,
    playerName: null,
    currentHunt: null,
    currentQuestion: null,
    myLocation: { latitude: null, longitude: null },
    score: 0,
    isPlaying: false
};

let lastLocationUpdate = 0;
let qrScanner = null;

//API FUNCTIONS

//Call the API
function callAPI(endpoint) {
    return fetch(API_LINK + "/" + endpoint)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.status === "ERROR"){
                throw new Error(data.errorMessages);
            }
            return data;
        });
}

//Get all available treasure hunts
function getTreasureHunts(){
    let url = "list";
    return callAPI(url);
}

//Start a game session
function startSession(playerName, huntId){
    let url = "start?player=" + encodeURIComponent(playerName) + "&app=" + APP_NAME + "&treasure-hunt-id=" + huntId;
    return callAPI(url);
}

//Get the next question
function getQuestion(session){
    let url = "question?session=" + session;
    return callAPI(url)
}

function submitAnswer(session, answer){
    let url = "answer?session=" + session + "&answer=" + encodeURIComponent(answer);
    if (appData.myLocation.latitude && appData.myLocation.longitude) {
        url += "&location=" + appData.myLocation.latitude + "&location=" + appData.myLocation.longitude;
    }
    return callAPI(url);
}

function skipQuestion(session){
    let url = "skip?session=" + session;
    return callAPI(url);
}

function getScore(session){
    let url = "score?session=" + session;
    return callAPI(url);
}

//New functions
function getLeaderboard(session, containerId = "leaderboard"){
    let url = "leaderboard?session=" + session + "&sorted&limit=5000";
    return callAPI(url)
        .then(function(data) {
            displayLeaderboard(data, containerId);
            return data;
        })
        .catch(function(error) {
            showFeedback("Could not load leaderboard: " + error.message, false);
        });
}



function displayLeaderboard(data, containerId = "leaderboard") {
    const leaderboardList = document.getElementById(containerId);
    if (!leaderboardList) {
        console.error("Leaderboard element not found: " + containerId);
        return;
    }

    leaderboardList.innerHTML = "";

    if (!data.leaderboard || data.leaderboard.length === 0) {
        leaderboardList.innerHTML = "<p>No players yet</p>";
        return;
    }

    for (let i = 0; i < data.leaderboard.length; i++) {
        const entry = data.leaderboard[i];
        const rank = i + 1;

        const row = document.createElement("div");
        row.className = "leaderboard-row";

        row.innerHTML =
            "<span class='leaderboard-rank'>#" + rank + "</span>" +
            "<span class='leaderboard-name'>" + entry.player + "</span>" +
            "<span class='leaderboard-score'>" + entry.score + " pts</span>";

        leaderboardList.appendChild(row);
    }
}

//GEOLOCATION
//Called once when the hunt starts
function requestLocationPermission(){
    if (!navigator.geolocation) {
        showFeedback("Geolocation is not supported on this device",false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(position) {
            appData.myLocation.latitude = position.coords.latitude;
            appData.myLocation.longitude = position.coords.longitude;
            lastLocationUpdate = Date.now();
            console.log("Location granted:", appData.myLocation);
            },
        function (error){
            console.log("Location error:",error);
            showFeedback("Location access denied, some questions may not work correctly",false);
        }
    );
}

//Refresh location every 30 seconds
function tryUpdateLocation(){
    if (!navigator.geolocation) {
        return;
    }
    let now = Date.now();
    if (now - lastLocationUpdate < LOCATION_COOLDOWN) {
        console.log("Location cooldown active, using stored coordinates");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(position) {
            appData.myLocation.latitude = position.coords.latitude;    //needs fix today!!!!
            appData.myLocation.longitude = position.coords.longitude;
            lastLocationUpdate = Date.now();
            showLocationStatus("Location updated", true);
            },
        function(){
            showLocationStatus("Location unavailable",false);
        }
    );
}

function showLocationStatus(message,isSuccess){
    const locationText = document.getElementById("locationText");
    const locationIcon = document.getElementById("locationIcon");
    if (locationText) {
        locationText.textContent = message;
    }
    if (locationIcon) {
        locationIcon.textContent = isSuccess ? "📍" : "❌";
    }
}

//HUNT SELECTION
function loadTreasureHunts(){
    const playerName = document.getElementById("playerNameInput").value.trim();
    if (!playerName) {
       showFeedback("Please enter your name", false);
       return;
    }
    appData.playerName = playerName;
    showLoading(true);

    getTreasureHunts()
        .then(function(data){
            displayHuntList(data.treasureHunts);
            document.getElementById("huntSelection").classList.remove("hidden");
        })
        .catch(function(){
            showFeedback("Could not load treasure hunts", false);
        })
        .finally(function(){
            showLoading(false);
            getLeaderboard(appData.session, "resultsLeaderboard");
        });
}

function displayHuntList(hunts){
    const huntList = document.getElementById("huntList");
    huntList.innerHTML = "";
    if (!hunts || hunts.length === 0) {
        huntList.innerHTML = "<p>No treasure hunts available</p>";
        return;
    }
    for (let i = 0; i < hunts.length; i++) {
        const hunt = hunts[i];
        const huntCard = document.createElement("div");
        huntCard.className = "hunt-card";
        huntCard.innerHTML =
            "<div class='hunt-card-content'>" +
            "<h4 class='hunt-title'>" + (hunt.name || "Treasure Hunt") + "</h4>" +
            "<p class='hunt-description'>" + (hunt.description || "No description available") + "</p>" +
            "</div>" +
            "<button class='app-btn app-btn-primary hunt-btn'" +
            " onclick='selectHunt(\"" + hunt.uuid + "\", \"" + hunt.name + "\")'>Start Hunt</button>";
        huntList.appendChild(huntCard);
    }
}

function selectHunt(huntId, huntName){
    showLoading(true);

    startSession(appData.playerName, huntId)
        .then(function(data){
            if (!data.session) {
                throw new Error("Could not start session");
            }
            appData.session = data.session;
            appData.currentHunt = { id: huntId, name: huntName};
            appData.isPlaying = true;
            updateSessionInfo();

            const locationStatus = document.getElementById("locationStatus");
            if (locationStatus) {
                locationStatus.classList.remove("hidden");
            }
            showLocationStatus("Waiting for location...", false);
            requestLocationPermission();

            return loadNextQuestion();
        })
        .catch(function(error){
            showError("Could not start hunt: " + error.message);
        })
        .finally(function(){
            showLoading(false);
        });
}

//QUESTIONS
   function loadNextQuestion(){
    showLoading(true);

    return getQuestion(appData.session)
        .then(function(data) {
            showLoading(false);
            if (data.completed) {
                finishHunt();
                return;
            }
            appData.currentQuestion = data;
            if (data.currentScore !== undefined) {
                appData.score = data.currentScore;
                updateSessionInfo();
            }
            displayQuestion(data);
            showSection("question-section");
        })
       .catch(function(error) {
           showLoading(false);
           showError("Could not start hunt: " + error.message);
       });

}
//Display question in the UI
function displayQuestion(questionData) {
    const questionDiv = document.getElementById("questionText");
    questionDiv.innerHTML = questionData.questionText || "No question text";
    const links = questionDiv.querySelectorAll("a");
    for (let i = 0; i < links.length; i++) {
        links[i].setAttribute("target", "_blank");
    }

    //title
    document.getElementById("questionTitle").textContent = (questionData.questionType || "TEXT") + "Question";

    //question indicator
    document.getElementById("questionIndex").textContent = "Question" + (questionData.currentQuestionIndex + 1) + "of" + questionData.numOfQuestions;

    // Update question text
    document.getElementById("questionType").textContent = questionData.questionType || "TEXT";

    //skip warning
    const skipInfo = document.getElementById("skipInfo");
    if (questionData.canBeSkipped) {
        skipInfo.textContent = "Skip penalty:" + questionData.skipScore + "pts";
        skipInfo.classList.remove("hidden");
    } else {
        skipInfo.classList.add("hidden");
    }

    //location warning
    const locationInfo = document.getElementById("locationInfo");
    if (questionData.requiresLocation) {
        locationInfo.textContent = "📍 This question checks that you are in the right place, make sure the location is enabled";
        locationInfo.classList.remove("hidden");
    } else {
        locationInfo.classList.add("hidden");
    }
    //answer input
    createAnswerInput(questionData);
    //skip button
    const skipBtn = document.getElementById("skipQuestionBtn");
    if (questionData.canBeSkipped === false){
        skipBtn.disabled = true;
        skipBtn.textContent = "Cannot skip";
    } else {
        skipBtn.disabled = false;
        skipBtn.textContent = "Skip Question";
    }
    const feedback = document.getElementById("feedback");
    if (feedback) {
        feedback.classList.add("hidden");
    }
    document.getElementById("questionContainer").classList.remove("hidden");
}

function createAnswerInput(questionData) {
    const container = document.getElementById("answerInputContainer");
    const questionType = (questionData.questionType || "TEXT").toUpperCase();
    container.innerHTML ="";
    window.selectedAnswer = null;

    switch (questionType) {

        case "BOOLEAN":
            container.innerHTML = "<div class='answer-options'>" + "<button class ='option-btn'onclick='selectAnswer(this,\"True\")'>True</button>"
                + "<button class = 'option-btn' onclick='selectAnswer(this,\"false\")'>False</button>"
                + "</div>";
            break;

        case "MCQ":
            const letters = ["A", "B", "C", "D"];
            let html = "<div class='answer-options mcq-options'>";
            for (let i = 0; i < 4; i++) {
                html += "<button class ='option-btn' onclick='selectAnswer(this,\"" + letters[i] + "\")'>" + letters[i] + "</button>";
            }
            html += "</div>";
            container.innerHTML = html;
            break;

        case "NUMERIC":
            container.innerHTML = "<input type='text' inputmode='decimal' id='answerInput' class='app-input' placeholder='Type a number'>";
            break;

        case "INTEGER":
            container.innerHTML = "<input type='text' inputmode='numeric' id='answerInput' class='app-input' placeholder='Type a whole number'>";
            break;

        case "TEXT":
        default:
            container.innerHTML = "<input type='text' id='answerInput' class='app-input' placeholder='Type your answer'>";
            break;
    }
}
function selectAnswer(button,answer){
    const buttons = document.querySelectorAll(".option-btn");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("selected");
    }
    button.classList.add("selected");
    window.selectedAnswer = answer;
}

//ANSWER SUBMISSION
function handleSubmitAnswer() {
    let answer = window.selectedAnswer;
    if (!answer) {
        const answerInput = document.getElementById("answerInput");
        if (answerInput) {
            answer = answerInput.value.trim();
        }
    }
    if (!answer) {
        showFeedback("Please provide an answer", false);
        return;
    }

    //refresh location every 30 seconds
    tryUpdateLocation();

    showLoading(true);

    submitAnswer(appData.session, answer)
        .then(function (result) {
            showLoading(false);

            let isCorrect = false;
            if (result.correct === true) {
                isCorrect = true;
            }
            if (isCorrect) {
                appData.score += result.scoreAdjustment;
                showFeedback("Correct!+" + result.scoreAdjustment + "points", true);

            } else {
                appData.score += result.scoreAdjustment;
                showFeedback("Wrong Answer.+" + result.scoreAdjustment + "points", false);
            }
            updateSessionInfo();
            window.selectedAnswer = null;

            if (result.completed) {
                finishHunt();
                return;
            }
            // 2 seconds for the user to read feedback
            setTimeout(function () {
                loadNextQuestion();
            }, 2000);
        })
        .catch(function () {
            showLoading(false);
            showFeedback("Could not submit answer", false);
        });
}
function handleSkipQuestion() {
    if (!appData.currentQuestion || !appData.currentQuestion.canBeSkipped) {
        showFeedback("This Question cannot be Skipped", false);
        return;
    }
    if (!confirm("Skip this question?You may lose points.")) {
        return;
    }
    showLoading(true);
    skipQuestion(appData.session)
        .then(function (result) {
            showLoading(false);
            appData.score += result.scoreAdjustment || 0;
            updateSessionInfo();
            showFeedback("Question Skipped." + (result.scoreAdjustment || 0) + "points", false);

            if (result.completed) {
                finishHunt();
                return;
            }
            setTimeout(function () {
                loadNextQuestion();
            }, 1500);
        })
        .catch(function () {
            showLoading(false);
            showFeedback("Could not skip question", false);
        });

}
//FINISH & LEADERBOARD



//RESET
function resetApp(){
    lastLocationUpdate = 0;
    appData.session = null;
    appData.currentHunt= null;
    appData.currentQuestion = null;
    appData.score = 0;
    appData.isPlaying = false;
    appData.myLocation.latitude = null;
    appData.myLocation.longitude = null;
    window.selectedAnswer = null;

    document.getElementById("playerNameInput").value = "";
    document.getElementById("huntSelection").classList.add("hidden");
    updateSessionInfo();
    showSection("welcome-section");
}

//HELPER FUNCTIONS

//Show specific sections
function showSection(sectionId){
    //hide all
    const sections = document.querySelectorAll(".app-section");
    for (let i = 0; i < sections.length; i++) {
        sections[i].classList.remove("active");
    }
    //show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add("active");
    }
}

//Show or hide loading spinner
function showLoading(show){
    const overlay = document.getElementById("loadingOverlay");
    if (show) {
        overlay.classList.remove("hidden");
    } else {
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
    feedback.classList.remove("success", "error", "hidden");
    //Add new class
    if (isSuccess) {
        feedback.classList.add("success");
    } else {
        feedback.classList.add("error");
    }
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

//INIT
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loadHuntBtn").addEventListener("click", loadTreasureHunts);
    document.getElementById("submitAnswerBtn").addEventListener("click", handleSubmitAnswer);
    document.getElementById("skipQuestionBtn").addEventListener("click", handleSkipQuestion);
    document.getElementById("playAgainBtn").addEventListener("click", resetApp);
    document.getElementById("returnHomeBtn").addEventListener("click", resetApp);
    showSection("welcome-section");
})

window.selectHunt = selectHunt;
window.selectAnswer = selectAnswer;

