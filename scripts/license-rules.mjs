export const ALLOWED_LICENSES = new Set(["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "BlueOak-1.0.0"]);

const PNPM_PACKAGE_PATH = /node_modules\/\.pnpm\/[^/]+\/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//;

export const listBundledPackages = (inputPaths) => {
  // Why: the dependencies are in devDependencies and bundled into dist/main.js, so only the packages the bundle read count.
  const names = inputPaths.flatMap((inputPath) => {
    const match = PNPM_PACKAGE_PATH.exec(inputPath);
    return match?.[1] === undefined ? [] : [match[1]];
  });
  return [...new Set(names)].toSorted((first, second) => first.localeCompare(second));
};

export const findLicenseProblems = (packageToLicense) => (
  Object.entries(packageToLicense)
    .filter(([, license]) => !ALLOWED_LICENSES.has(license))
    .map(([name, license]) => `${name} has the license ${license}, which is not allowed in the bundle.`)
);
