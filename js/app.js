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