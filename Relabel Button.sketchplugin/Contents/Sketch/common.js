const sketch = require('sketch')
const UI = sketch.UI

// Derive the padding between the text layer and the background layers
function getButtonPadding(buttonRect, textLayer) {
  var textFrame = [textLayer frame];

  return {
    top: [textFrame y] - [buttonRect y],
    right: ([buttonRect x] + [buttonRect width]) - ([textFrame x] + [textFrame width]),
    bottom: ([buttonRect y] + [buttonRect height]) - ([textFrame y] + [textFrame height]),
    left: [textFrame x] - [buttonRect x]
  };
}

// Display an error alert and exit
function invalidSelection() {
  UI.alert('Select button', 'Select the button to modify. It must be a group or symbol containing at least one text layer.');
  throw(nil); // exit the plugin
}

