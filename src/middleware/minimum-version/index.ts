import Koa from "koa";
import convert from "koa-convert";
import semver from "semver";

// The `X-CALA-App` header takes the format `<project-name>@<semver>[ (<build-number>)]`
// e.g. `studio@1.2.3` or `pegasus-ios@1.2.3 (45678)`
//
// In exceptional cases we may want to enforce that clients upgrade from an
// older SemVer or build number, e.g. if we need to break backwards compatibility
// or mitigate a security hole.
//
// By parsing this header out, we can send a 412 response which clients should
// handle gracefully.

const MINIMUM_VERSION_BY_PROJECT: Record<string, string> = {
  "pegasus-ios": "0.0.1",
  studio: "0.0.1",
};

const MINIMUM_BUILD_BY_PROJECT: Record<string, number> = {
  "pegasus-ios": 1,
};

const pattern = /([a-zA-Z\-]+)@(\d+\.\d+\.\d+)( \((\d+)\))?/;

async function minimumVersion(ctx: Koa.Context, next: () => Promise<any>) {
  const clientId = ctx.request.headers["x-cala-app"];

  if (!clientId) {
    return await next();
  }

  const match = pattern.exec(clientId);

  if (!match) {
    return await next();
  }

  const projectName: string = match[1];
  const semanticVersion: string = match[2];
  const buildNumberString: string | undefined = match[4];

  const minimumSemanticVersion = MINIMUM_VERSION_BY_PROJECT[projectName];
  const minimumBuild = MINIMUM_BUILD_BY_PROJECT[projectName];

  if (minimumSemanticVersion) {
    if (semver.lt(semanticVersion, minimumSemanticVersion)) {
      ctx.throw(412, "Please reload or upgrade your app to access CALA");
    }
  }

  if (buildNumberString && minimumBuild) {
    const buildNumber = parseInt(buildNumberString, 10);
    if (buildNumber < minimumBuild) {
      ctx.throw(412, "Please reload or upgrade your app to access CALA");
    }
  }

  return await next();
}

export default convert.back(minimumVersion);
