@import 'common.js'
// Relabel Button Right Aligned (cmd ctrl j)

/*
  Author: Ken Moore (with bits from Alexander Kudymov's Dynamic Button plugin)

  The Relabel Button plugin lets you easily change the label of any button 
  (a group containing a text layer and other visual elements). Just select the 
  group and press Cmd+J, type the new label into the prompt, and the button is 
  resized to fit the new text with prior padding preserved.   
*/

var relabelButtonRightAligned = function(context) {
  var doc = context.document;
  var selection = context.selection

  // Begin validation of selection
  // Ensure there's only one layer selected
  if ([selection count] != 1) {
    invalidSelection();
  }

  var sel = [selection objectAtIndex:0];
  var buttonRect = [[sel absoluteRect] copy];

  // if the symbol is a group...
  if (sel instanceof MSLayerGroup) {
	  var layers = [sel layers];

	  // Ensure there are at least 2 layers in the group (text and one other layer at minimum)
	  if ([layers count] < 2) {
	    invalidSelection();
	  }

	  // Loop through child layers to identify the text layer
	  var textLayer = nil;
	  for (var i = 0; i < [layers count]; i++) {
	    var layer = [layers objectAtIndex:i];
	    if (layer instanceof MSTextLayer) {
	      textLayer = layer;
	      break;
	    }
	  }

	  // Ensure at least one text layer exists
	  if (!textLayer) {
	    invalidSelection();
	  }


	  // Extract current padding based on buttonRect and textLayer
	  var buttonPadding = getButtonPadding(buttonRect, textLayer);

    // Prompt user for input of new button text
    UI.getInputFromUser(
      "New button label",
      {
        initialValue: textLayer,
      },
      (err, text) => {
        if (err) {
          // most likely the user canceled the input
          return
        }
        if (text) {
          // If the text layer is fixed width, make it auto
          if ([textLayer textBehaviour] == 1) {
            [textLayer setTextBehaviour:0];
          }
          // If the text layer is not left aligned, make it so
          if ([textLayer textAlignment] != 1) {   // 0 = left, 1 = right, 2 = center, 3 = justified.
            [textLayer setTextAlignment: 1];
          }
          // Set the text layer to the new text
          [textLayer setStringValue: text];
          [textLayer adjustFrameToFit];
          // Resize the button based on the original padding
          setButtonPaddingRightAligned(buttonRect, textLayer, layers, buttonPadding);
          sel.resizeToFitChildrenWithOption(0); // resize the group field
        }
      }
    )
  } else if (sel instanceof MSSymbolInstance) {
  	var symbolMaster = sel.symbolMaster();
  	var children = symbolMaster.children();
  	var layerIDs = {};
  	var masterButtonDimensions;

  	for (var j = 0; j < [children count]; j++) {
  		var layer = children[j];
  		if ([layer class] == MSTextLayer) {
// AS OF SKETCH 44 THIS IS OBSOLETE
// TODO: FIND OUT HOW TO DETERMINE IF RESIZING PROPERTIES ARE SET PROPERLY
// AND FIX OR WARN IF NOT  			
  			// change layer resizing type to "Resize Object"
//  			if (layer.resizingType() != 2) {
//  				layer.resizingType = 2;
//  				doc.displayMessage("Relabel Button has updated the 'Resizing' option of the Master Symbol Text Layer to work correctly.");
//  			}

  			// set overrides, or add an override if doesn't exist
			ObjectId = layer.objectID().toString();
		  	var existingOverrides = sel.overrides()
		  	if (existingOverrides == null) {
		  		// no overrides exist, add one
				sel.overrides = {ObjectId : "overrideText"};
		  		existingOverrides = sel.overrides()
		  	}

		  	// get the existing overrides and create a mutable copy
		  	var mutableOverrides = NSMutableDictionary.dictionaryWithDictionary(existingOverrides)
		  	mutableOverrides.setObject_forKey(NSMutableDictionary.dictionaryWithDictionary(existingOverrides.objectForKey(0)),0)

  			// Prompt user for input of new button text
  			var priorText
  			if (existingOverrides.objectForKey(ObjectId)) {
  				priorText = existingOverrides.objectForKey(ObjectId);
  			} else {
  				// if no overrides originally, prior text is the string value of the master
  				priorText = [layer stringValue];
  			}
        UI.getInputFromUser(
          "New button label",
          {
            initialValue: textLayer,
          },
          (err, newText) => {
            if (err) {
              // most likely the user canceled the input
              return
            }
            if (newText) {
              var textFrame = [layer frame];
              var masterText = [layer stringValue];
              var masterTextWidth = [textFrame width];

              // set the text of the master to the prior text just to measure its width
              var priorTextWidth
              if (priorText == "") {
                // if set text to blank then all styling is lost
                priorTextWidth = 0
              } else {
                [layer setStringValue: priorText];
                priorTextWidth = [textFrame width];	  				
              }

              // get the width of the new text
              [layer setStringValue: newText];
              var newTextWidth = [textFrame width];

              // restore the text field's master text
              [layer setStringValue: masterText];

              // resize the instance
              var deltaWidth = newTextWidth - priorTextWidth;
              var selFrame = [sel frame]
              selFrame.setWidth(selFrame.width() + deltaWidth);
              selFrame.setX(selFrame.x() - deltaWidth);

              // update the mutable dictionary
              mutableOverrides.setObject_forKey(newText, ObjectId)

              // apply the overrides to the symbol instance
              sel.overrides = mutableOverrides;

              // deselect and reselect so the override text gets updated in the inspector
              // sel.setIsSelected(false);
              // sel.setIsSelected(true);			
            }
          }
        )
  		}
  	}
  } else {
  	// selection is not a symbol or group
    invalidSelection();
  }
}

// Set the new padding (resizes layers that surround the text and repositions any 
// layers to the right of the text layer's left edge)
function setButtonPaddingRightAligned(buttonRect, textLayer, layers, padding) {
  // determine how much the background is changing
  var textFrame = [textLayer frame];
  var newWidth = padding.left + [textFrame width] + padding.right;
  var deltaWidth = newWidth - [buttonRect width];

  // loop through the layers and resize or reposition all (except textLayer)
  for (var i = 0; i < [layers count]; i++) {
    var layer = [layers objectAtIndex:i];
    if (layer != textLayer) {
      var layerFrame = [layer frame];
      var textFrameRight = [textFrame x] + [textFrame width];

      if ([layerFrame x] <= textFrameRight && [layerFrame x] + [layerFrame width] >= textFrameRight) {
        // if the layer spans the x coordinate of the *right edge* of the text layer, assume it's
        // a background layer and resize its width accordingly
        layerFrame.setWidth(layerFrame.width() + deltaWidth);
        layerFrame.setX(layerFrame.x() - deltaWidth);
      }
      else if ([layerFrame x] + [layerFrame width]  < textFrameRight) {
        // if the layer is entirely to the left of the text layer's right edge, just reposition it
        layerFrame.setX(layerFrame.x() - deltaWidth);
      }
    }
  }
}


