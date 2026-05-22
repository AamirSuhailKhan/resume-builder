/**
 * LinkedIn content script.
 * Listens for messages from the popup to trigger autofill or field detection.
 */

import { detectFormFields } from "./form-detector";
import { autofill } from "./autofill";
import { getStorage } from "../shared/storage";
import type { MessageType, MessageResponse } from "../shared/types";

chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    if (message.type === "CHECK_FIELDS") {
      const fields = detectFormFields();
      sendResponse({ fieldCount: fields.length });
      return true;
    }

    if (message.type === "AUTOFILL") {
      getStorage().then(({ user_profile }) => {
        if (!user_profile) {
          sendResponse({ filled: 0, skipped: ["Not logged in"] });
          return;
        }
        autofill(user_profile).then(sendResponse);
      });
      return true;
    }

    return false;
  }
);
