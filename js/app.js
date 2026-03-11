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

//Skip question
function skipQuestion(session){
    // Check if question can be skipped
    if (appData.currentQuestion && !appData.currentQuestion.canBeSkipped) {
        showFeedback("This question cannot be skipped", false);
        return Promise.reject("Cannot skip");
    }

    const url = "skip?session=" + session;

    return callAPI(url)
        .then(function(data) {
            handleSkipResponse(data);
            return data;
        })
        .catch(function(error) {
            showFeedback("Error skipping question: " + error.message, false);
            throw error;
        });
}

function getScore(session){
    let url = "score?session=" + session;
    return callAPI(url);
}

function getLeaderboard(session){
    let url = "leaderboard?session=" + session;
    return callAPI(url);
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
            appData.myLocation.latitude = position.coords.latitude;
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
            showError("Could not load treasure hunts");
        })
        .finally(function(){
            showLoading(false);
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

            showSection("question-section");
            return getQuestion(appData.session);
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
                appData.score = data.curentScore;
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
    const questionContainer = document.getElementById("questionContainer");
    const questionSection = document.getElementById("question-section");
    //question indicator
    document.getElementById("questionIndex").textContent = "Question" + (questionData.currentQuestionIndex + 1) + "of" + questionData.numOfQuestions;

    // Update question text
    document.getElementById("questionType").textContent = questionData.questionType || "TEXT";

    //skip warning
    const skipInfo = document.getElementById("skipInfo");
    if (questionData.canbeSkipped) {
        skipInfo.textContent = "Skip penalty:" + questionData.skipScore + "pts";
        skipInfo.classList.remove("hidden");
    } else {
        skipInfo.classList.add("hidden");
    }
}
    //location warning
    // Update question info
    document.getElementById("questionIndex").textContent =
        `Question ${questionData.currentQuestionIndex + 1} of ${questionData.numOfQuestions}`;

    // Display question type
    document.getElementById("questionType").textContent =
        "Type: " + questionData.questionType;


    const skipBtn = document.getElementById("skipQuestionBtn");
    if (skipBtn) {
        skipBtn.disabled = false;

        skipBtn.onclick = function() {
            if (!questionData.canBeSkipped) {
                showFeedback("This question cannot be skipped", false);
                return;
            }
            skipQuestion(appData.session)
                .catch(err => {
                    showFeedback("Error skipping question: " + err.message, false);
                });
        };
    }

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
    if (questionData.requiresLocation) {
        locationInfo.textContent = "📍 This question requires you to be at a specific location";
        locationInfo.classList.remove("hidden");
    } else {
        locationInfo.classList.add("hidden");
    }

    // Create answer input based on question type
    createAnswerInput(questionData.questionType);

    // Show the question section
    questionSection.classList.remove("hidden");
    questionContainer.classList.remove("hidden");
}

// Handle skip response
function handleSkipResponse(data) {
    // Update score by fetching from API
    getScore(appData.session).then(scoreData => {
        appData.score = scoreData.score || 0;
        updateSessionInfo();
    });

    showFeedback("⏭️ Question skipped!", false);

    // Check if treasure hunt is completed after skipping
    if (data.completed) {
        showFeedback("Treasure hunt completed!", true);
        setTimeout(() => {
            showSection("results-section");
            getLeaderboard(appData.session);
        }, 2000);
    } else {
        // Load next question
        setTimeout(() => {
            getQuestion(appData.session);
        }, 1500);
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

//ANSWER SUBMISSION
function submitAnswer(session, answer){
    // update location if needed
    tryUpdateLocation();

    // Check if the answer is empty or only spaces
    if (!answer || answer.toString().trim() === "") {
        showFeedback("Please enter your answer", false);
        return Promise.reject("Empty answer");
    }
    // Trim the answer
    answer = answer.toString().trim();

    let url = "answer?session=" + session + "&answer=" + encodeURIComponent(answer);
    if(appData.myLocation.latitude && appData.myLocation.longitude){
        url += "&latitude=" + appData.myLocation.latitude + "&longitude=" + appData.myLocation.longitude;
    }
    showLoading(true);

    // Send the API request
    return callAPI(url)
        .then(function(data){
            // Show feedback based on correctness
            if (data.correct !== undefined) {
                if (data.correct) {

                    showFeedback("✅ Correct!", true);

                    getScore(session).then(function(scoreData){
                        appData.score = scoreData.score || 0;
                        updateSessionInfo();
                    });


                } else {

                    showFeedback("❌ Incorrect. " + (data.message || "Try again!"), false);

                }
            }
            // If game is completed
            if (data.completed || data.status === "FINISHED"){
                showFeedback("Treasure Hunt completed!", true);
                showLoading(false);
                showSection("results-section");
                getLeaderboard(session);
                return;
            }

            // Load next question
            getQuestion(session);

        })
        .then(function() {
            // Hide the loader after uploading the next question
            showLoading(false);
        })
        .catch(function(error){
            showFeedback("Error submitting answer: " + error.message, false);
            showLoading(false);
            throw error;
        });
}

function handleSubmitAnswer() {

    // Get the answer input element
    const answerInput = document.getElementById("answerInput");
    if (!answerInput) {
        showFeedback("Answer input not found", false);
        return;
    }

    // Get the value based on input type
    let answer = answerInput.value;

    // For select elements, check if a valid option was selected
    if (answerInput.tagName === 'SELECT' && (!answer || answer === "")) {
        showFeedback("Please select an answer", false);
        return;
    }

    // Disable the submit button temporarily to prevent double submission
    const submitBtn = document.getElementById("submitAnswerBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
    }

    // Submit the answer
    submitAnswer(appData.session, answer)
        .catch(function(error) {
            console.error("Submit error:", error);
        })
        .finally(function() {
            // Re-enable the submit button
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        });
}

//FINISH


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
    document.getElementById("playAgainBtn").addEventListener("click", resetApp);
    document.getElementById("returnHomeBtn").addEventListener("click", resetApp);
    document.getElementById("submitAnswerBtn").addEventListener("click", handleSubmitAnswer);
    showSection("welcome-section");
})

window.selectHunt = selectHunt;

