import { JsonData } from "@oxy2/utils";

export type O2EndpointInput = Record<string, JsonData>;
export type O2EndpointOutput = JsonData;

export type O2EndpointAny = O2Endpoint<O2EndpointInput, O2EndpointOutput>;

export interface O2EndpointOpts<
  Input extends O2EndpointInput,
  Output extends O2EndpointOutput
> {
  implementation(input: Input): Promise<Output>;

  /** _Service level objectives_ for the endpoint.
   *
   * These are used to automatically configure dashboards and alerts which track how well the
   * service does what it says it does.
   *
   * Note that a _successful_ request is defined as a request where there was no uncaught error
   * thrown. */
  slo?: {
    /** A target percentage of requests which must be successful to pass the SLO.
     * This should be a number between 0.0 and 100.0.
     *
     * The threshold is adaptive based on the amount of traffic, meaning the percentage
     * of passing requests required to pass the SLO is lower for endpoints which receive low traffic
     * (because false negatives are more likely with smaller sample sizes). */
    successPercentile?: number;
    /** Target number of milliseconds the service should respond in.
     * This only includes the time for _your endpoint's code_ to run.
     * The rest of the time (network and framework latency) have separate SLOs maintained by other teams.
     *
     * SLI: Number of _successful_ requests which are responded to within `latency` milliseconds. */
    latencyTarget?: number;
    /** A target percentage of requests which must be respond within `latency` milliseconds to pass the SLO.
     * This should be a number between 0.0 and 100.0.
     *
     * The threshold is adaptive based on the amount of traffic, meaning the percentage
     * of passing requests required to pass the SLO is lower for endpoints which receive low traffic
     * (because false negatives are more likely with smaller sample sizes). */
    latencyPercentile?: number;
  };
}

export class O2Endpoint<
  Input extends O2EndpointInput,
  Output extends O2EndpointOutput
> {
  constructor(public opts: O2EndpointOpts<Input, Output>) {}

  execute(input: Input): Promise<Output> {
    return this.opts.implementation(input);
  }
}
