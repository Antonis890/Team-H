//CONSTANTS
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
};

//INITIALISATIONS
//this is the variable that holds the interval updating the location
//stores the ID for setInterval, used to clear it later on with clearInterval after the hunt is completed
let locationIntervalId = null;

// QR scanner initialization
let qrScanner = null;
let qrCameras=[]; //stores all available cameras in an array
let  qrCameraIndex= 0; //used to select previous/next camera buttons




//API FUNCTIONS

//call the API
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

//get all available treasure hunts
function getTreasureHunts(){
    let url = "list";
    return callAPI(url);
}

//start a game session
function startSession(playerName, huntId){
    let url = "start?player=" + encodeURIComponent(playerName) + "&app=" + APP_NAME + "&treasure-hunt-id=" + huntId;
    return callAPI(url);
}

//get the next question
function getQuestion(session){
    let url = "question?session=" + session;
    return callAPI(url)
}

//submit an answer with current coordinates
function submitAnswer(session, answer){
    let url = "answer?session=" + session + "&answer=" + encodeURIComponent(answer);
    if (appData.myLocation.latitude && appData.myLocation.longitude) {
        url += "&latitude=" + appData.myLocation.latitude + "&longitude=" + appData.myLocation.longitude;
    }
    return callAPI(url);
}

//skip the current question
function skipQuestion(session){
    let url = "skip?session=" + session;
    return callAPI(url);
}

//get the current score of the session
function getScore(session){
    let url = "score?session=" + session;
    return callAPI(url);
}

//get leaderboard
function getLeaderboard(session){
    let url = "leaderboard?session=" + session + "&sorted&limit=1000";
    return callAPI(url)
}

//sends the player's current coordinates
function sendLocationUpdate(){
    if (!appData.session || !appData.myLocation.latitude || !appData.myLocation.longitude) {
        return;
    }
    let url = "location?session=" + appData.session + "&latitude=" + appData.myLocation.latitude + "&longitude=" + appData.myLocation.longitude;
    return callAPI(url)
        .catch(function() {});
}

//COOKIE FUNCTIONS
//set a cookie with a name, value and expiration date
function setCookie(cName, cValue, exDays) {
    const date = new Date();
    date.setTime(date.getTime() + (exDays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + date.toUTCString();
    document.cookie = cName + "=" + cValue + ";" + expires + ";path=/";
}

//get a cooke value by name
function getCookie(cName){
    let name = cName + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//delete a cookie by setting expiration date to -1 days
function deleteCookie(cName){
    setCookie(cName, "", -1);
}

//save session data to cookies
function saveSessionCookies(){
    setCookie("session", appData.session, 1/12);
    setCookie("playerName", appData.playerName, 1/12);
    setCookie("score", appData.score, 1/12);
    setCookie("huntName", appData.currentHunt ? appData.currentHunt.name : "", 1/12);
}

//clear all session cookies
function clearSessionCookies(){
    deleteCookie("session");
    deleteCookie("playerName");
    deleteCookie("score");
    deleteCookie("huntName");
}

//check for saved session
function checkSavedSession(){
    let savedSession = getCookie("session");
    let savedName = getCookie("playerName");
    let savedScore = getCookie("score");
    let savedHunt = getCookie("huntName");

    if (savedSession && savedName){
        let resume = confirm("Welcome back, " + savedName + "!\n" + "You have an unfinished game" + "\n" +
        "Score: " + savedScore + " points\n" + "Would you like to resume where you left off?");
        if (resume) {
            appData.session = savedSession;
            appData.playerName = savedName;
            appData.score = Number(savedScore);
            appData.currentHunt = {name:savedHunt};
            updateSessionInfo();
            requestLocationPermission();
            startLocationTracking();
            loadNextQuestion();
        } else {
            clearSessionCookies();
        }
    }
}

//GEOLOCATION
//called once when the hunt starts to request permission and holds the player's initial positions
function requestLocationPermission(){
    if (!navigator.geolocation) {
        showFeedback("Geolocation is not supported on this device",false);
        return;
    }
    showLocationStatus("Getting your location...", false);
    navigator.geolocation.getCurrentPosition(
        function(position) {
            appData.myLocation.latitude = position.coords.latitude;
            appData.myLocation.longitude = position.coords.longitude;
            showLocationStatus("Location acquired.", true);
            },
        function (){
            showLocationStatus("Location access denied.", false);
        }
    );
}

//refresh the stored coordinates
//will be called by setInterval every 30 seconds
function updateLocation(){
    if (!navigator.geolocation) {
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(position) {
            appData.myLocation.latitude = position.coords.latitude;
            appData.myLocation.longitude = position.coords.longitude;
            console.log("Location updated: " + appData.myLocation.latitude + "," + appData.myLocation.longitude);
            sendLocationUpdate();
            showLocationUpdate();
            },
        function(){
            showLocationStatus("Location unavailable",false);
        }
    );
}

//start sending location every 30 seconds
function startLocationTracking(){
    locationIntervalId = setInterval(updateLocation, LOCATION_COOLDOWN)
}

//stop collecting location updates
//called when the hunt is completed
function stopLocationTracking(){
    if (locationIntervalId != null) {
        clearInterval(locationIntervalId);
        locationIntervalId = null;
    }
    //hide the status bar
    let statusBar = document.getElementById("locationStatus");
    if (statusBar) {
        statusBar.classList.add("hidden");
    }
}

//this function refreshes coordinates silently, used before submitting
function refreshCoordinates(){
    if(!navigator.geolocation){
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(position) {
            appData.myLocation.latitude = position.coords.latitude;
            appData.myLocation.longitude = position.coords.longitude;
        },
        function(){}
    );
}

//QR CODE SCANNER
//open the qr scanner modal when the button is pressed
function openQrScanner(){
    let modal = document.getElementById("qr-modal");
    if (!modal) {
        return;
    }

    // show the modal
    modal.classList.remove("hidden");

    //only create one scanner at a time
    if (qrScanner !== null) {
        return;
    }

    //scanner options
    let opts ={
        continuous: true,
        video: document.getElementById("qr-preview"),
        mirror: true,
        captureImage: false,
        backgroundScan: false,
        refractoryPeriod: 5000,
        scanPeriod: 1
    };

    qrScanner = new Instascan.Scanner(opts);

    // when the QR is scanned, if it's a url close the modal and show confirmation message
    qrScanner.addListener("scan", function(content){
        if (content.indexOf("http://") === 0|| content.indexOf("https://") ===0) {
            //url is detected so close the modal and show a confirmation message
            closeQRScanner();
            if (confirm("QR code contains a link:\n" + content + "\nOpen in new tab?")) {
                window.open(content,"_blank");
            }
        } else {
            //text is detected so place it directly in the answer input and close the modal
            let answerInput = document.getElementById("answerInput");
            if (answerInput) {
                answerInput.value = content;
            }
            closeQRScanner();
        }
    });
    // get the available cameras and start the scanner
    Instascan.Camera.getCameras()
        .then(function(cameras){
            if (cameras.length>0) {
                qrCameras = cameras;
                qrCameraIndex = 0;
                qrCameraIndex = cameras.length > 1 ? 1 : 0;

                qrScanner.start(qrCameras[qrCameraIndex]);
                //set initial button states depending on number of cameras
                updateCameraButtons();
            } else {
                // if no camera is found show in the modal
                document.getElementById("qr-message").textContent = "No cameras found on this device."
                document.getElementById("qr-message").classList.remove("hidden");
                document.getElementById("qr-preview").classList.add("hidden");
                qrScanner = null;

            }
        })
        .catch(function(error){
            // if there is a camera error show it in the modal
            console.log(error);
            document.getElementById("qr-message").textContent = "Camera unavailable";
            document.getElementById("qr-message").classList.remove("hidden");
            document.getElementById("qr-preview").classList.add("hidden");
            qrScanner = null;
        });

}

// stop the camera and close the qr modal
function closeQRScanner(){
    let modal = document.getElementById("qr-modal");
    if (modal){
        modal.classList.add("hidden");
    }
    if(qrScanner !== null){
        qrScanner.stop();
        qrScanner = null;
    }
    //reset state for next time the modal is open
    qrCameras = [];
    qrCameraIndex = 0;
    document.getElementById("qr-message").classList.add("hidden");
    document.getElementById("qr-preview").classList.remove("hidden");
}

//cycle through the cameras using buttons
function switchCamera(direction){
    if (qrCameras.length <= 1||qrScanner === null){
        return;
    }
    qrCameraIndex = qrCameraIndex + direction;
    qrScanner.start(qrCameras[qrCameraIndex]);
    updateCameraButtons();

}

//enable or disable camera buttons based on current camera index
function updateCameraButtons(){
    let prevBtn = document.getElementById("qr-prev-camera");
    let nextBtn = document.getElementById("qr-next-camera");
    if (!prevBtn || !nextBtn) {
        return;
    }
    prevBtn.disabled = (qrCameraIndex === 0);
    nextBtn.disabled = (qrCameraIndex === qrCameras.length-1);
}

//HUNT SELECTION
//validate player name and get hunt list
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
            showLoading(false);
        })
        .catch(function(){
            showFeedback("Could not load treasure hunts", false);
            showLoading(false);
        });
}

//create the list of available hunts
function displayHuntList(hunts){
    let huntList = document.getElementById("huntList");
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

//start a session for the hunt - asks for cookies consent
function selectHunt(huntId, huntName){
    let consent = getCookie("consent"); //ask for cookie consent before saving anything
    if (!consent) {
        let accepted = confirm("This app uses cookies to save your in game progress,\n" + "Do you accept?");
        if (accepted) {
            setCookie("consent", "true", 1);
        }
    }

    showLoading(true);

    startSession(appData.playerName, huntId)
        .then(function(data){
            if (!data.session) {
                throw new Error("Could not start session");
            }
            appData.session = data.session;
            appData.currentHunt = { id: huntId, name: huntName};
            updateSessionInfo();

            if (getCookie("consent")) {
                saveSessionCookies();
            }
            //request location permission and start the location tracking
            requestLocationPermission();
            startLocationTracking();
            showLoading(false);
            return loadNextQuestion();
        })
        .catch(function(error){
            showLoading(false);
            showError("Could not start hunt: " + error.message);
        });
}

//QUESTIONS
//fetch next question
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
            displayQuestion(data);
            showSection("question-section");
        })
       .catch(function(error) {
           showLoading(false);
           showError("Could not start hunt: " + error.message);
       });
}

//display question in the UI
function displayQuestion(questionData) {
    let questionDiv = document.getElementById("questionText");
    questionDiv.innerHTML = questionData.questionText || "No question text";
    let links = questionDiv.querySelectorAll("a");
    for (let i = 0; i < links.length; i++) {
        links[i].setAttribute("target", "_blank");
    }

    //title
    document.getElementById("questionTitle").textContent = "Question";

    //question indicator
    document.getElementById("questionIndex").textContent = "Question " + (questionData.currentQuestionIndex + 1) + " of " + questionData.numOfQuestions;

    // Update question text
    document.getElementById("questionType").textContent = questionData.questionType || "TEXT";

    //skip penalty
    let skipInfo = document.getElementById("skipInfo");
    if (questionData.canBeSkipped) {
        skipInfo.textContent = "Skip penalty: " + questionData.skipScore + " pts";
        skipInfo.classList.remove("hidden");
    } else {
        skipInfo.classList.add("hidden");
    }

    //answer input
    createAnswerInput(questionData);

    //disable the skip button if the question can not be skipped
    let skipBtn = document.getElementById("skipQuestionBtn");
    if (questionData.canBeSkipped === false){
        skipBtn.disabled = true;
        skipBtn.textContent = "Cannot skip";
    } else {
        skipBtn.disabled = false;
        skipBtn.textContent = "Skip Question";
    }

    //show QR scanner button
    let qrIcon = document.getElementById("qr-icon");
    if (qrIcon) {
        qrIcon.classList.remove("hidden");
    }

    //reset the feedback from any previous question
    let feedback = document.getElementById("feedback");
    if (feedback) {
        feedback.classList.add("hidden");
    }
    document.getElementById("questionContainer").classList.remove("hidden");
}

//build the answer input based on question type
function createAnswerInput(questionData) {
    let container = document.getElementById("answerInputContainer");
    let questionType = (questionData.questionType || "TEXT").toUpperCase();
    container.innerHTML = "";
    window.selectedAnswer = null;

    switch (questionType) {

        case "BOOLEAN":
            container.innerHTML = "<div class='answer-options'>" + "<button class ='option-btn'onclick='selectAnswer(this,\"True\")'>True</button>"
                + "<button class = 'option-btn' onclick='selectAnswer(this,\"False\")'>False</button>"
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

//mark the selected button and store the value
function selectAnswer(button, answer){
    let buttons = document.querySelectorAll(".option-btn");
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
        let answerInput = document.getElementById("answerInput");
        if (answerInput) {
            answer = answerInput.value.trim();
        }
    }
    if (!answer) {
        showFeedback("Please provide an answer", false);
        return;
    }

    //use stored coordinates before submitting
    refreshCoordinates();

    //if the question requires location, show a message
    if (appData.currentQuestion && appData.currentQuestion.requiresLocation) {
        showLocationUpdate();
    }

    showLoading(true);

    submitAnswer(appData.session, answer)
        .then(function (result) {
            showLoading(false);

            if (result.correct === true) {
                showFeedback(result.message || "Correct!", true);
            } else {
                showFeedback(result.message || "Wrong answer.", false);
            }
            window.selectedAnswer = null;

            if (result.completed) {
                finishHunt();
                return;
            }

            //get the score
            getScore(appData.session)
                .then(function(scoreData) {
                    appData.score = scoreData.score;
                    updateSessionInfo();
                    if (getCookie("consent")) {
                        saveSessionCookies();
                    }
                })
                .catch(function(){
                    //if API fails use local calculation
                    appData.score += result.scoreAdjustment;
                    updateSessionInfo();
                });
            // 2 seconds for the user to read feedback
            setTimeout(function () {
                loadNextQuestion();
            }, 2000);
        })
        .catch(function () {
            showLoading(false);
            showFeedback("Could not submit answer. Please try again.", false);
        });
}

function handleSkipQuestion() {
    if (!appData.currentQuestion || !appData.currentQuestion.canBeSkipped) {
        showFeedback("This Question cannot be Skipped", false);
        return;
    }
    if (!confirm("Skip this question? You may lose points.")) {
        return;
    }
    showLoading(true);
    skipQuestion(appData.session)
        .then(function (result) {
            showLoading(false);
            showFeedback("Question skipped.", false);

            //get score after skip
            getScore(appData.session)
                .then(function(scoreData) {
                    appData.score = scoreData.score;
                    updateSessionInfo();
                    if (getCookie("consent")) {
                        saveSessionCookies();
                    }
                })
                .catch(function () {
                    //if API fails use local calculation
                    appData.score += result.scoreAdjustment || 0;
                    updateSessionInfo();
                });

            if (result.completed) {
                finishHunt();
                return;
            }
            setTimeout(function () {
                loadNextQuestion();
            }, 2000);
        })
        .catch(function () {
            showLoading(false);
            showFeedback("Could not skip question", false);
        });

}
//FINISH HUNT
function finishHunt() {
    //stop location tracking
    stopLocationTracking();
    //clear cookies
    clearSessionCookies();
    //Get display for final leaderboard
    showLoading(true);
    getLeaderboard(appData.session)
        .then(function(data){
            displayLeaderboard(data, "resultsLeaderboard");
            showLoading(false);
            showSection("results-section");
        })
        .catch(function () {
            showLoading(false);
            showSection("results-section");
        });
}

//LEADERBOARD
function displayLeaderboard(data, containerId) {
    let leaderboardList = document.getElementById(containerId);
    if (!leaderboardList) {
        return;
    }

    leaderboardList.innerHTML = "";

    if (!data.leaderboard || data.leaderboard.length === 0) {
        leaderboardList.innerHTML = "<p>No players yet</p>";
        return;
    }

    for (let i = 0; i < data.leaderboard.length; i++) {
        let entry = data.leaderboard[i];
        let rank = i + 1;

        let row = document.createElement("div");
        row.className = "leaderboard-row";

        row.innerHTML =
            "<span class='leaderboard-rank'>#" + rank + "</span>" +
            "<span class='leaderboard-name'>" + entry.player + "</span>" +
            "<span class='leaderboard-score'>" + entry.score + " pts</span>";
        leaderboardList.appendChild(row);
    }
}

//LEADERBOARD MODAL
document.addEventListener("DOMContentLoaded", function() {
    // leaderboard modal events
    document.getElementById("leaderboardBtn").addEventListener("click", function() {
        if (appData.session) {
            getScore(appData.session)
                .then(function(scoreData) {
                    appData.score = scoreData.score;
                    updateSessionInfo();
                })
            getLeaderboard(appData.session)
                .then(function(data) {
                    displayLeaderboard(data, "leaderboard");
                })
                .catch(function () {
                    console.log("Could not load leaderboard.");
                });
        }
        document.getElementById("leaderboardContainer").classList.remove("hidden");
    });

    //add a close button
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

//RESET
function resetApp(){
    stopLocationTracking();
    closeQRScanner();
    appData.session = null;
    appData.currentHunt= null;
    appData.currentQuestion = null;
    appData.score = 0;
    appData.myLocation.latitude = null;
    appData.myLocation.longitude = null;
    window.selectedAnswer = null;

    document.getElementById("playerNameInput").value = "";
    document.getElementById("huntSelection").classList.add("hidden");
    updateSessionInfo();
    showSection("welcome-section");
}

//HELPER FUNCTIONS

//shows the current stat of location
function showLocationStatus(message, isSuccess) {
    let statusBar = document.getElementById("locationStatus");
    let statusText = document.getElementById("locationText");
    let statusIcon = document.getElementById("locationIcon");

    if (!statusBar || !statusText || !statusIcon) {
        return;
    }
    statusText.textContent = message;
    statusIcon.textContent = isSuccess ? "📍" : "❌";
    statusBar.classList.remove("hidden");
}

//notification that fades after 4 seconds
function showLocationUpdate() {
    let locationUpdate = document.getElementById("locationUpdate");
    if (!locationUpdate) {
        return;
    }
    //remove any existing fade timer
    if (showLocationUpdate.fadeTimer) {
        clearTimeout(showLocationUpdate.fadeTimer);
    }
    locationUpdate.classList.remove("hidden", "fading");
    showLocationUpdate.fadeTimer = setTimeout(function () {
        locationUpdate.classList.add("fading");
        //hide after css transition of 0.4 seconds complete
        setTimeout(function () {
            locationUpdate.classList.add("hidden");
            locationUpdate.classList.remove("fading");
        }, 400);
    }, 4000);
}

//show specific sections
function showSection(sectionId){
    //hide all
    let sections = document.querySelectorAll(".app-section");
    for (let i = 0; i < sections.length; i++) {
        sections[i].classList.remove("active");
    }
    //show the target section
    let targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add("active");
    }
}

//Show or hide loading spinner
function showLoading(show){
    let overlay = document.getElementById("loadingOverlay");
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
    }, 2000);
}

//share the player's final score on Twitter
function shareOnTwitter() {
    let score = appData.score;
    let huntName = appData.currentHunt ? appData.currentHunt.name : "Code Cyprus Treasure Hunt";
    let text = "I just scored " + score + " points on the " + huntName +
        "! 🏆 Play the Code Cyprus Treasure Hunt at: " + window.location.origin + "/app.html";
    let url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
}

//update session info in the header
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
    document.getElementById("qr-icon").addEventListener("click", openQrScanner);
    document.getElementById("shareTwitterBtn").addEventListener("click", shareOnTwitter);

    //qr modal buttons
    document.getElementById("qr-close-btn").addEventListener("click", closeQRScanner);
    document.getElementById("qr-prev-camera").addEventListener("click",function(){
        switchCamera(-1);
    });
    document.getElementById("qr-next-camera").addEventListener("click",function(){
        switchCamera(1);
    });
    showSection("welcome-section");
    checkSavedSession();
});
window.selectHunt = selectHunt;
window.selectAnswer = selectAnswer;

