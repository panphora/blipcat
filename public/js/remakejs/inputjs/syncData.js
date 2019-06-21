import { getDataAndDataSourceElemFromNodeAndAncestors, setValueForKeyName } from "../outputjs";
import { camelCaseToDash } from '../hummingbird/lib/string';
import { forEachMatchingElem } from '../hummingbird/lib/dom';
import { callWatchFunctionsOnElem } from './watchHelpers';

let afterSyncCallbacks = [];
export function afterSync (cb) {
  afterSyncCallbacks.push(cb);
}

export function syncDataBetweenElements ({sourceElement, targetElement, shouldTriggerSave}) {

  let elementsDataWasSyncedInto = [];

  // 1. Assemble an object from the source element and its ancestors (L or O)
    // Why look in ancestors for data? because you want to be able to click an edit button anywhere on the page in order to edit the global/root data
  let fullDataObject = getDataAndDataSourceElemFromNodeAndAncestors(sourceElement);

  // 2. Loop through the keys of the assembled object
  Object.keys(fullDataObject).forEach((camelCaseKeyName) => { // e.g. bundleName

    let originalValue = fullDataObject[camelCaseKeyName].value;
    let dataSourceElem = fullDataObject[camelCaseKeyName].dataSourceElem;
    let dashCaseKeyName = camelCaseToDash(camelCaseKeyName);

    // a. Sync location & output keys:
    let {actualValue, closestMatchingElem} = syncToLocationOrOutputKey({targetElement, camelCaseKeyName, dashCaseKeyName, originalValue, dataSourceElem});

    // b. Sync input keys:
    syncToInputKeys({targetElement, camelCaseKeyName, actualValue})

    // c. Store the closestMatchingElem for later
    if (closestMatchingElem && elementsDataWasSyncedInto.indexOf(closestMatchingElem) === -1) {
      elementsDataWasSyncedInto.push(closestMatchingElem);
    }

  });

  // 3. Call after sync callbacks
  callAfterSyncCallbacks({elementsDataWasSyncedInto, sourceElement, targetElement, shouldTriggerSave, data: fullDataObject});

}

// used by saveEventListener.js
  // IMPORTANT: expects an event, not an element
export function triggerSyncAndSave (event) {
  event.preventDefault();

  // 2. find the nearest ancestor element that has the attribute `data-i-sync`
  let syncElement = event.currentTarget.closest("[data-i-sync]");

  // make sure data sync happens after all date is in place 
  //   e.g. we might want to have the switch action button also set data 
  //        (we currently do this with the inline edit revisions submit button)
  setTimeout(() => {

    // 3. copy data from the data sync element (and its children) back to the source element
    syncDataBetweenElements({
      sourceElement: syncElement, 
      targetElement: $.data(syncElement, "source"),
      shouldTriggerSave: true
    });

  });
}

function syncToLocationOrOutputKey ({targetElement, camelCaseKeyName, dashCaseKeyName, originalValue, dataSourceElem}) {

  let actualValue;

  // 1. Find _ONE_ CLOSEST matching key on the target element (L or O)
  let dataAttrSelector = `[data-l-key-${dashCaseKeyName}],[data-o-key-${dashCaseKeyName}]`;
  let closestMatchingElem = targetElement.closest(dataAttrSelector);

  // 2. If it exists, replace its value with the value from the assembled object
  if (closestMatchingElem) {
    // the default value is intended to overwrite the value immediately before it's synced into instead of when the data is originally parsed
    // -- note: it's nice having the default attr on the main data source element and it makes parsing nodes more performant
    actualValue = getValueOrDefaultValue(closestMatchingElem, originalValue, dashCaseKeyName);

    setValueForKeyName(closestMatchingElem, camelCaseKeyName, actualValue);

    // 3. Call watch functions
        // IMPORTANT: We use the element that each key is synced into as the element to search for matching watch attributes
    callWatchFunctions({dashCaseKeyName, parentOfTargetElements: closestMatchingElem, value: actualValue, dataSourceElem});
  }

  return {actualValue, closestMatchingElem};

}

function syncToInputKeys ({targetElement, camelCaseKeyName, actualValue}) {

  // 1. Find _ONE_ CHILD elements of the target element that match a `data-i`
    // options: radio, select, checkbox, input, textarea, div
    // how to find: radio.name, select.name, checkbox.name, input.name, div.customAttr
  let matchingKeyElem = targetElement.querySelector(`[data-i][name='${camelCaseKeyName}'], [data-i][data-i-key='${camelCaseKeyName}']`);

  // do nothing if not found
  if (!matchingKeyElem) {
    return;
  }

  // 2. What type of element is it?
    // options: radio, select, checkbox, input, textarea, div
    // how to tell: elem.nodeName for select, textarea, div (this will be fallback default); attr type for radio, checkbox, input (this will be the fallback default)
  let nodeName = matchingKeyElem.nodeName.toLowerCase();  // select, textarea, div, input, other

  if (nodeName === "input") {
    let inputType = matchingKeyElem.getAttribute("type"); // radio, checkbox, text, other

    if (inputType === "radio") {
      let matchingValueElem = targetElement.querySelector(`[type='radio'][name='${camelCaseKeyName}'][value='${actualValue}']`);

      if (!matchingValueElem) {
        return;
      }

      matchingValueElem.checked = true;
    } else if (inputType === "checkbox") {
      if (actualValue) {
        matchingKeyElem.checked = true;
      } else {
        matchingKeyElem.checked = false;
      }
    } else if (inputType === "text" || !inputType) {
      matchingKeyElem.value = actualValue;
    }
  } else if (nodeName === "select" || nodeName === "textarea") {
    matchingKeyElem.value = actualValue;
  }

}

export function callWatchFunctions ({dashCaseKeyName, parentOfTargetElements, value, dataSourceElem}) {
  
  let watchAttrSelector = `[data-w-key-${dashCaseKeyName}]`;

  // 1. Find ALL CHILD elements of the target element that match a `data-w-key`
  forEachMatchingElem(parentOfTargetElements, watchAttrSelector, (matchingElem) => {

    // 2. Call all the watch functions defined by this key
    callWatchFunctionsOnElem({
      watchElem: matchingElem, 
      watchAttrName: `data-w-key-${dashCaseKeyName}`, 
      value: value, 
      dataSourceElem: dataSourceElem,
      dataTargetElem: parentOfTargetElements
    });      

  });

}

function callAfterSyncCallbacks ({elementsDataWasSyncedInto, sourceElement, targetElement, shouldTriggerSave, data}) {
  if (afterSyncCallbacks.length > 0) {
    afterSyncCallbacks.forEach((afterSyncCallback) => {
      afterSyncCallback({elementsDataWasSyncedInto, sourceElement, targetElement, shouldTriggerSave, data});
    });
  }
}


// helpers 

function isValueEmpty (value) {
  return !value || /^\s*$/.test(value);
}

function getDefaultValue (elem, dashCaseKeyName) {
  return elem.getAttribute("data-o-default-" + dashCaseKeyName) || "";
}

function getValueOrDefaultValue (elem, value, dashCaseKeyName) {
  return isValueEmpty(value) ? getDefaultValue(elem, dashCaseKeyName) : value;
}







