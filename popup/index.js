// Unicode version of base64 encoding - https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// Start recording
$("body").on("click", ".js-button-start", function() {
    chrome.runtime.sendMessage({"type":"start"});
    showPanel(".js-panel-recording");
    toggleAssertion(false);
});

// Stop recoding
$("body").on("click", ".js-button-stop", function() {
    chrome.runtime.sendMessage({"type":"stop"});
    showPanel(".js-panel-save-recording");
});

// Save recording
$("body").on("click", ".js-button-save", function() {
    // Save the test and then in callback do the reset
    chrome.storage.sync.get("douglas-url", function(data) {
      if (!chrome.runtime.error) {
        var serverUrl = data["douglas-url"];
        chrome.runtime.getBackgroundPage(function(bp) {
          var testname = $(".js-testname").val();
          var testsection = $(".js-testsection").val();

          // Save test on server
          jQuery.ajax({
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json' 
            },
            'type': 'POST',
            'url': serverUrl + "rest/v1/tests/",
            'data': JSON.stringify({ 
              name: testname,
              section: parseInt(testsection, 10),
              steps: b64EncodeUnicode(JSON.stringify(bp.recorder.steps))
            }),
            'dataType': 'json',
            'processData': false,
            'complete': function() {
              bp.recorder.reset();
              showPanel(".js-panel-record");
            }
          });
          
        }); 
      }  
    });
});

// Reset recording
$("body").on("click", ".js-button-reset", function() {
    chrome.runtime.getBackgroundPage(function(bp) {
          bp.recorder.reset();
          showPanel(".js-panel-record");
    }); 
});

// Enable assert-mode
$("body").on("click", ".js-button-assert", function() {
    chrome.runtime.sendMessage({"type":"assertStart"});
    toggleAssertion(true);
});

// Switch from assert-mode to record-mode
$("body").on("click", ".js-button-record", function() {
    chrome.runtime.sendMessage({"type":"assertStop"});
    toggleAssertion(false);
});

// Helper function to show the right screen in the extension
function showPanel(cssClass) {
  $(".js-panel").hide();
  $(cssClass).show();
}

// Helper function to highlight the correct toggle-button
function toggleAssertion(assertion) {
  if(assertion === true) {
    $(".js-button-record").removeAttr("disabled");
    $(".js-button-assert").attr("disabled", "true")
  } else {
    $(".js-button-record").attr("disabled", "true")
    $(".js-button-assert").removeAttr("disabled");
  }
}

// When we open the extenion popup
document.body.onload = function() {
  // Is an URL set
  chrome.storage.sync.get("douglas-url", function(data) {
    if (!chrome.runtime.error) {
      var serverUrl = data["douglas-url"]
      if(serverUrl != null && serverUrl != "") {
        getSections(serverUrl);
        // A douglas URL is already defined... switching to the
        // state defined in the recorder
        chrome.runtime.getBackgroundPage(function(bp) {

          // If we have an active recording
          if(bp.recorder.recording === true) {
            showPanel(".js-panel-recording");
            toggleAssertion(bp.recorder.assertMode);

            // When we have recorded steps but stopped the recording
          } else if (bp.recorder.steps.length > 0 && bp.recorder.recording === false) {
            showPanel(".js-panel-save-recording");

            // If no active recordings - let the user start one
          } else if (bp.recorder.recording === false) {
            showPanel(".js-panel-record")
          }
        });

      } else {
        showPanel(".js-panel-set-url")
      }
    }
  });
}

// Helper function to load the sections from the server
function getSections(url) {
  $.getJSON(url + "rest/v1/products/", function(data) {
    var options = "<label>Select section to save the test in:</label><select class='form-control js-testsection'>";
    data.forEach(function(product) {
      options += "<option disabled>" + product.name + "</option>";

      product.sections.forEach(function(section) {
        options += "<option value='" + section.id + "'> - " + section.name + "</option>";
      });
    });

    options += "</select>";
  
    $(".js-section-selector").html(options);
  });
}

// Set the URL the user have entered
$("body").on("click", ".js-set-url-button", function() {
  var url = $(".js-set-url-input").val();
  if(url.charAt(url.length - 1) !== "/") {
    url += "/";
  }
  chrome.storage.sync.set({ "douglas-url" : url }, function() {
    if (chrome.runtime.error) {
      console.log("Runtime error.");
    }
  });

  getSections(url);
  showPanel(".js-panel-record")
});

// In case the user wants to forget the URL
$("body").on("click", ".js-forget-server", function() {
  chrome.storage.sync.set({ "douglas-url" : "" }, function() {
    if (!chrome.runtime.error) {
        chrome.runtime.reload();
        window.close();
    }
  });
});