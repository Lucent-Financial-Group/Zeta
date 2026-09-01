import {
  buildRootDevCatalogManifest, rootDevCatalogExcludeGlobFor,
  DEFAULT_ROOT_DEV_CATALOG,
  type AppCatalogApplicator,
  type ClusterControlPlane,
  type RootDevCatalogSpec,
} from "../ports.ts";

export function gitOpsAppCatalog(
  controlPlane: ClusterControlPlane,
  catalogDefaults: RootDevCatalogSpec = DEFAULT_ROOT_DEV_CATALOG,
): AppCatalogApplicator {
  return {
    applyRootDevCatalog: (gitRef, gitRepoUrl, provider = null) => {
      // The exclude glob is derived PER PROVIDER so it agrees with what the
      // harness asserts. Default `null` keeps the shipped glob verbatim.
      const spec: RootDevCatalogSpec = {
        ...catalogDefaults,
        gitRef,
        gitRepoUrl,
        excludeGlob: rootDevCatalogExcludeGlobFor(provider),
      };
      console.log(`Applying root App-of-Apps (git repo: ${spec.gitRepoUrl}, git ref: ${spec.gitRef}) ...`);
      controlPlane.applyInlineManifest(buildRootDevCatalogManifest(spec));
    },
  };
}
