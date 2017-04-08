
// Init recorder
var recorder = new Recorder();

// Define defaults
function Recorder(){
  this.recording = false;
  this.assertMode = false;
  this.steps = [];
}


Recorder.prototype.record = function(message){
  // If recording an assertion
  if(message.action === "ActionClick" && this.assertMode === true) {
    var assertion = message
    assertion.action = "ActionAssertContainsText"
    this.steps.push(assertion);
    alert("Assertion recorded - asserts that the clicked element contains the text: " + assertion.value);
    return
  }

  // If recording type events
  if(message.action === "ActionType") {
    var lastStep = this.steps[this.steps.length - 1];
    if(lastStep.action === "ActionType" && lastStep.path === message.path) {
      // Delete the last step so that we can replace it with a never one
      this.steps.pop();
    }
  }

  this.steps.push(message);
};

// Receive message from the foreground file
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (recorder.recording === false && message.type !== "start") return;

  if(message.type === "start") {
    recorder.start();
  } else if(message.type === "stop") {
    recorder.stop();
  } else if(message.type === "assertStart") {
    recorder.toggleAssertMode(true);
  } else if(message.type === "assertStop") {
    recorder.toggleAssertMode(false);
  } else {
    recorder.record(message);
  }
});

// Helper to switch between assertmode
Recorder.prototype.toggleAssertMode = function(state) {
  this.assertMode = state;
}

// Start recording
Recorder.prototype.start = function(){

  this.recording = true;
  this.steps = [];

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // Set browser icon to active
    chrome.browserAction.setIcon({ path: 'images/icon-blue.png' });

    // Record the initial URL step
    this.steps.push({
      "action": "ActionUrl",
      "value": tabs[0].url
    })
  });
  
};

// Stop recording
Recorder.prototype.stop = function(){
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // Set browser icon to inactive
    chrome.browserAction.setIcon({ path: 'images/icon-black.png' });
  });
  this.recording = false;
  this.assertMode = false;
};

// Reset internal values
Recorder.prototype.reset = function(){
  this.stop()
  this.steps = [];
};