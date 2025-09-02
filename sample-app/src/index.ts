import { O2Api, O2Endpoint } from "@oxy2/backend";

export const sampleApp = new O2Api({
  capitalize: new O2Endpoint({
    /** Capitalizes a string. */
    async callback(input: {
      /** String to capitalize. */
      str: string;
    }) {
      const [firstLetter] = input.str;
      return {
        /** Input string with first letter capitalized. */
        strCapitalized:
          firstLetter.toUpperCase() + input.str.substring(firstLetter.length),
      };
    },
  }),
});
