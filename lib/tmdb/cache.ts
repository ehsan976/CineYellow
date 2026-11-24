// cacheLife only accepts literal profile names, so pick the profile here from a variable.
// Must be called inside a "use cache" function, once per call (like cacheLife itself).
import { cacheLife } from "next/cache";

export type Life = "minutes" | "hours" | "days" | "weeks";

export function setCacheLife(life: Life) {
  switch (life) {
    case "minutes":
      cacheLife("minutes");
      break;
    case "hours":
      cacheLife("hours");
      break;
    case "days":
      cacheLife("days");
      break;
    case "weeks":
      cacheLife("weeks");
      break;
  }
}
