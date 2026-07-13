import { EventEmitter } from "node:events";
import { EmailEnum } from "../../enums";

export const eventEmitter = new EventEmitter();

eventEmitter.on(EmailEnum.CONFIRM_EMAIL, async (fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (err) {
    console.error("Email event error:", err);
  }
});

