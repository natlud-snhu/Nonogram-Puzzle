var GAME_CANVAS = document.getElementById("gameArea");
var CTX = GAME_CANVAS.getContext("2d");
CTX.font = "20px arial";
var display_offset = [60, 60];
var click_offset = [1 - display_offset[0], 1 - display_offset[1]]; //x and y offset for clicking
var time_clock;
var grid_size = [5,5];
var box_size = 50;
var field;
var display_popup = false;
var hint_roulette = false;

function updateClock() {
    var currentTime = new Date().getTime(); currentTime = new Date(currentTime - time_clock);
    var minutes = currentTime.getMinutes();
    var seconds;
    if (minutes > 99) { //max time limit reached
        minutes = "99";
        seconds = "99";
    } else {
        seconds = String(currentTime.getSeconds() % 60);
        seconds = "0".repeat(2 - seconds.length) + seconds; //pad timer with zeros
        minutes = String(minutes);
        minutes = "0".repeat(2 - minutes.length) + minutes; //pad timer with zeros
    }
    
    document.getElementById("timer").innerText = minutes + ":" + seconds; //display timer
}
var time_clock_interval;

class Box {
    constructor(x, y) {
        this.x = x; //x position on the canvas
        this.y = y; //y position on the canvas
        this.activated = false; //player has activated the box
        this.disabled = false; //player has disabled the box
    }
    activate() {
        if (this.disabled) {
            this.disabled = false;
        } else if (this.activated) { 
            this.activated = false;
        } else {
            this.activated = true;
        }
    }
    disable() {
        if (this.activated) {
            this.activated = false;
        } else if (this.disabled) {
            this.disabled = false;
        } else {
            this.disabled = true;
        }
    }
}
class colorPalette {
    constructor(emptyColor, activatedColor, disabledColor) {
        this.emptyColor = emptyColor;
        this.activatedColor = activatedColor;
        this.disabledColor = disabledColor;
    }
}
class GameField {
    constructor(gridSize=[5,5],boxSize=50,colors=null,boxArray=null,correctAnswers="random") {
        this.gridSize = gridSize; //size of boxArray [columns, rows]
        this.boxSize = boxSize; //size of boxes in pixels
        if (boxArray === null) {
            // build boxArray
            boxArray = Array.from(Array(gridSize[0]), () => new Array(gridSize[1]));
            for (let i = 0; i < gridSize[0]; i++) {
                for (let n = 0; n < gridSize[1]; n++) {
                  boxArray[i][n] = new Box(i * boxSize, n * boxSize);
              }
            }
        }
        if (colors === null) {
            this.colors = new colorPalette('#737373','#007300','#730000');
        }
        this.boxArray = boxArray;
        if (correctAnswers == "random") {
            correctAnswers = Array.from(Array(gridSize[0]), () => new Array(gridSize[1]));
            for (let i = 0; i < gridSize[0]; i++) {
                for (let n = 0; n < gridSize[1]; n++) {
                    correctAnswers[i][n] = Math.round(Math.random()); //random bit
              }
            }
        }
        this.correctAnswers = correctAnswers;
        this.guides = null;
        this.hasWon = false;
    }
    checkCompletion() { //returns true if game completed
        for (let i = 0; i < this.gridSize[0]; i++) {
            for (let n = 0; n < this.gridSize[1]; n++) {
                if (this.correctAnswers[n][i]) { //checks if answer bit is flipped
                    if (!this.boxArray[i][n].activated) { //if any boxes aren't activated that should be, game isn't complete.
                        return false;
                    }
                } else {
                    if (this.boxArray[i][n].activated) { //if any boxes that are activated that shouldn't be, game isn't completed.
                        return false;
                    }
                }
            }
        }
        this.hasWon = true;
        return true;
    }
    draw() {
        CTX.clearRect(0,0,GAME_CANVAS.width, GAME_CANVAS.height);
        for (let i = 0; i < this.gridSize[0]; i++) {
            for (let n = 0; n < this.gridSize[1]; n++) {
                var currentBox = this.boxArray[i][n];
                //draw different colors for different activation states
                if (currentBox.activated) {
                    CTX.fillStyle = this.colors.activatedColor;
                } else if (currentBox.disabled) {
                    CTX.fillStyle = this.colors.disabledColor;
                } else {
                    CTX.fillStyle = this.colors.emptyColor;
                }
                CTX.fillRect(currentBox.x + display_offset[0],currentBox.y + display_offset[0],this.boxSize - 1,this.boxSize - 1);
          }
        }
        if (!(this.guides === null)) { //only draw if guides have been initialized
            CTX.fillStyle = "white"; 
            CTX.textAlign = "center";
            //display leftGuides
            var yPos = display_offset[1] + (this.boxSize * 0.6) ;
            for (let i = 0; i < this.guides[1].length; i++) {
                var xPos = display_offset[0] - (this.boxSize * 0.2);
                for (let n = 0; n < this.guides[1][i].length; n++) {
                    CTX.fillText(String(this.guides[1][i][n]), xPos, yPos);
                    xPos -= (this.boxSize * 0.4);
                }
                yPos += this.boxSize;
            }
            //display topGuides
            var xPos = display_offset[0] + (this.boxSize * 0.5);
            for (let i = 0; i < this.guides[0].length; i++) {
                var yPos = display_offset[1] - (this.boxSize * 0.1);
                for (let n = 0; n < this.guides[0][i].length; n++) {
                    CTX.fillText(String(this.guides[0][i][n]), xPos, yPos);
                    yPos -= (this.boxSize * 0.4);
                }
                xPos += this.boxSize;
            }

        }
    }
    generateGuides() {
        var topGuides = Array.from(Array(this.gridSize[1]), () => []);
        var leftGuides = Array.from(Array(this.gridSize[1]), () => []);
        //get topGuides
        for (let i = 0; i < this.gridSize[0]; i++) {
            var chainCounter = 0;
            for (let n = 0; n < this.gridSize[1] + 1; n++) {
                if (n == this.gridSize[1]) { //add final tally to guides
                    if(chainCounter > 0 || topGuides[i].length === 0) {
                        topGuides[i].push(chainCounter);
                    }
                    topGuides[i].reverse(); //flips guides for displaying on screen
                } else {
                    if (this.correctAnswers[n][i]) { //checks if answer bit is flipped
                        chainCounter += 1;
                    } else {
                        if (chainCounter > 0) { //when chain of answers is broken, add the current counter to the guides to follow nonogram game logic
                            topGuides[i].push(chainCounter);
                        }
                        chainCounter = 0;
                    }
                }
            }
        }
        //get leftGuides
        for (let i = 0; i < this.gridSize[0]; i++) {
            var chainCounter = 0;
            for (let n = 0; n < this.gridSize[1] + 1; n++) {
                if (n == this.gridSize[1]) { //add final tally to guides
                    if(chainCounter > 0 || leftGuides[i].length === 0) {
                        leftGuides[i].push(chainCounter);
                    }
                    leftGuides[i].reverse(); //flips guides for displaying on screen
                } else {
                    if (this.correctAnswers[i][n]) { //checks if answer bit is flipped
                        chainCounter += 1;
                    } else {
                        if (chainCounter > 0) { //when chain of answers is broken, add the current counter to the guides to follow nonogram game logic
                            leftGuides[i].push(chainCounter);
                        }
                        chainCounter = 0;
                    }
                }
            }
        }
        
        this.guides = [topGuides, leftGuides];
    }
}

function leftClick(e) {
    if (field.hasWon) { //prevent disturbing the field after victory
        return true;
    }

    var elementPosition = this.getBoundingClientRect();
    var xPosition = (e.clientX + click_offset[0]) - elementPosition["left"];
    var yPosition = (e.clientY + click_offset[1]) - elementPosition["top"];
    //check if click is out of bounds
    if (xPosition < 0 || xPosition > field.boxSize * field.gridSize[0]) {
        return false;
    }
    if (yPosition < 0 || yPosition > field.boxSize * field.gridSize[1]) {
        return false;
    }    
    var currentClicked = [Math.trunc(xPosition / field.boxSize), Math.trunc(yPosition / field.boxSize)];
    if (currentClicked[0] > field.gridSize[0] - 1 || currentClicked[1] > field.gridSize[1] - 1) { //click out of bounds
        return false;
    }
    var sfx = new Audio("sfx/click.mp3");
    sfx.play();
    field.boxArray[currentClicked[0]][currentClicked[1]].activate();
    field.draw();
    if (field.checkCompletion()) { //game complete
        clearInterval(time_clock_interval); //stops timer
        document.getElementById("results").innerText = "You win!";
    }
}
function rightClick(e) {
    if (display_popup) {//displaying controls so disallow interaction
        return false;
    }
    var elementPosition = GAME_CANVAS.getBoundingClientRect();
    var xPosition = (e.clientX + click_offset[0]) - elementPosition["left"];
    var yPosition = (e.clientY + click_offset[1]) - elementPosition["top"];
    //check if click is out of bounds
    if (xPosition < 0 || xPosition > field.boxSize * field.gridSize[0]) {
        return false;
    }
    if (yPosition < 0 || yPosition > field.boxSize * field.gridSize[1]) {
        return false;
    }
    if (field.hasWon) { //prevent disturbing the field after victory
        return true;
    }
    var currentClicked = [Math.trunc(xPosition / field.boxSize), Math.trunc(yPosition / field.boxSize)];
    if (currentClicked[0] > field.gridSize[0] - 1 || currentClicked[1] > field.gridSize[1] - 1) { //click out of bounds
        return false;
    }
    var sfx = new Audio("sfx/click.mp3");
    sfx.play();
    field.boxArray[currentClicked[0]][currentClicked[1]].disable();
    field.draw();
    if (field.checkCompletion()) {//game complete
        clearInterval(time_clock_interval); //stops timer
        document.getElementById("results").innerText = "You win!";
        
    }
    return true;  
}

// start of user interactible functions

function intializeGame() {
    field = new GameField(grid_size, box_size);
    field.generateGuides();
    if (hint_roulette) {//gives player hints upon game load
        var randomX = Math.trunc(Math.random() * field.gridSize[0]); //random x cord
        var randomY = Math.trunc(Math.random() * field.gridSize[1]); //random y cord
        for (let i = 0; i < field.gridSize[0]; i++) {
            if (field.correctAnswers[randomY][i]) {
                field.boxArray[i][randomY].activate();
            } else {
                field.boxArray[i][randomY].disable();
            }
        }
        for (let i = 0; i < field.gridSize[0]; i++) {
            if (!(i === randomY)) { //don't double activate or disable tiles
                if (field.correctAnswers[i][randomX]) {
                    field.boxArray[randomX][i].activate();
                } else {
                    field.boxArray[randomX][i].disable();
                }
            }
        }
    }
    field.draw();
    document.getElementById("timer").innerText = "00:00";
    clearInterval(time_clock_interval);
    document.getElementById("results").innerText = "";//clear result text
    time_clock = new Date().getTime();
    time_clock_interval = setInterval(updateClock,1000);
}
function displayPopup(popupName) {
    var popup = document.getElementById(popupName + "-container");
    popup.style.display = "block";
    displayField = document.getElementById("nonogram-container");
    displayField.style.display = "none";
    var body = document.getElementById("body");
    body.style.backgroundColor = "#0F2F2F";
    display_popup = true;
}
function hidePopup(popupName) {
    var popup = document.getElementById(popupName + "-container");
    popup.style.display = "none";
    displayField = document.getElementById("nonogram-container");
    displayField.style.display = "block";
    var body = document.getElementById("body");
    body.style.backgroundColor = "#050505";
    display_popup = false;
}
function disableTimer() {
    var checkbox = document.getElementById("disableTimer");
    if (checkbox.checked) {//disable timer
        clearInterval(time_clock_interval); //disable time clock interval
        document.getElementById("timer").style.display = "none"; //clear timer text
    } else {//enable timer
        if (!(field.checkCompletion())){ //only enable timer if game isn't complete
            time_clock_interval = setInterval(updateClock, 1000);
        }
        document.getElementById("timer").style.display = "block";
    }
}
function changeGridSize() {
    var newGridSize = document.getElementById("gridSize").value.replace('”', '').replace('”', '').split("x"); //value of the drop down menu as an array
    newGridSize = [Number(newGridSize[0]), Number(newGridSize[1])] //cast newGridSize to number array
    grid_size = newGridSize;
    var gridSizeAverage = (grid_size[0] + grid_size[1])/ 2;
    box_size = 250 / gridSizeAverage;
    //click_offset = [1 - (20 + (8 * grid_size[0])), 1 - (20 + (8 * grid_size[1]))];
    CTX.font = String(100 / gridSizeAverage) + "px arial";
    //create new Game field
    intializeGame();
    //resize HTML elements
    var nonogramContainer = document.getElementById("nonogram-container");
    nonogramContainer.style.width = String(grid_size[0] * 80) + "px";
    nonogramContainer.style.height = String(375 + (grid_size[1] * 25)) + "px";
    GAME_CANVAS.style.width = String(110 + (grid_size[0] * box_size)) + "px";
    GAME_CANVAS.style.height = String(60 + (grid_size[1] * box_size)) + "px";
}
function toggleHintRoulette() {
    var checkbox = document.getElementById("hintCheckBox");
    if (checkbox.checked) {//enable hints
        hint_roulette = true;
    } else {
        hint_roulette = false;
    }
    intializeGame(); //restart game with new settings
}


//end of User interactible functions

document.oncontextmenu = function (e) { // right click functionality
    if (rightClick(e)) {
        return false;
    }
};
GAME_CANVAS.addEventListener("click", leftClick, false);
intializeGame();