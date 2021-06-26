import type { OpenAPIObject } from "openapi3-ts";

import { O2EndpointAny } from "./O2Endpoint";

export type O2ApiEndpointsAny = Record<string, O2EndpointAny | O2ApiAny>;
export type O2ApiAny = O2Api<O2ApiEndpointsAny>;

export class O2Api<Endpoints extends O2ApiEndpointsAny> {
  public openapi: OpenAPIObject;
  constructor(public endpoints: Endpoints) {}
}
