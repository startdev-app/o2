import { O2Api, O2Endpoint } from "@oxy2/backend";

export const api = new O2Api({
  capitalize: new O2Endpoint({
    /** Capitalizes a string. */
    async implementation(input: {
      /** String to capitalize. */
      str: string;
    }) {
      const [firstLetter, ...restChars] = input.str;
      return {
        /** Input string with first letter capitalized. */
        strCapitalized: firstLetter.toLocaleUpperCase() + restChars.join(""),
      };
    },
  }),
});
