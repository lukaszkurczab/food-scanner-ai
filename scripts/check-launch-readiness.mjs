#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readinessLib from "./check-launch-readiness.lib.js";

const TARGET_APP_ID = "com.lkurczab.fitaly";
const { PRODUCTION_BUILD_PROFILE, validateEasApiBaseUrlProfiles } = readinessLib;

const profile = (process.argv[2] ?? process.env.EAS_BUILD_PROFILE ?? "")
  .trim()
  .toLowerCase();
const platform = (process.argv[3] ?? "").trim().toLowerCase();
const rootDir = process.cwd();
const errors = [];

function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const text = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(text);
}

function isHttpUrl(value) {
  return value.startsWith("https://") || value.startsWith("http://");
}

function checkLegalUrls() {
  const termsUrl = (process.env.TERMS_URL ?? "").trim();
  const privacyUrl = (process.env.PRIVACY_URL ?? "").trim();

  if (!isHttpUrl(termsUrl)) {
    errors.push("TERMS_URL is missing or invalid (expected http/https URL).");
  }
  if (!isHttpUrl(privacyUrl)) {
    errors.push("PRIVACY_URL is missing or invalid (expected http/https URL).");
  }
}

function checkEasAndroidBuildType() {
  const eas = readJson("eas.json");
  const buildType = eas?.build?.production?.android?.buildType;
  if (buildType !== "app-bundle") {
    errors.push(
      `eas.json production android.buildType must be \"app-bundle\" (got: ${String(buildType)}).`,
    );
  }
}

function checkApiBaseUrlMapping() {
  const eas = readJson("eas.json");
  const mappingErrors = validateEasApiBaseUrlProfiles(eas);
  errors.push(...mappingErrors);
}

function checkAndroidFirebaseConfig() {
  const googleServices = readJson("google-services.json");
  const clients = Array.isArray(googleServices?.client)
    ? googleServices.client
    : [];

  const packageNames = new Set();
  for (const client of clients) {
    const androidPackage =
      client?.client_info?.android_client_info?.package_name;
    if (typeof androidPackage === "string" && androidPackage) {
      packageNames.add(androidPackage);
    }

    const oauthClients = Array.isArray(client?.oauth_client)
      ? client.oauth_client
      : [];
    for (const oauthClient of oauthClients) {
      const oauthPackage = oauthClient?.android_info?.package_name;
      if (typeof oauthPackage === "string" && oauthPackage) {
        packageNames.add(oauthPackage);
      }
    }
  }

  if (!packageNames.has(TARGET_APP_ID)) {
    errors.push(
      `google-services.json is not configured for ${TARGET_APP_ID}. Replace Firebase Android config before production release.`,
    );
  }
}

function checkIosFirebaseConfig() {
  const plistPath = path.join(rootDir, "GoogleService-Info.plist");
  const plist = fs.readFileSync(plistPath, "utf8");
  const match = plist.match(
    /<key>\s*BUNDLE_ID\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/,
  );
  const bundleId = match?.[1]?.trim() ?? "";
  if (bundleId !== TARGET_APP_ID) {
    errors.push(
      `GoogleService-Info.plist BUNDLE_ID must be ${TARGET_APP_ID} (got: ${bundleId || "missing"}). Replace Firebase iOS config before production release.`,
    );
  }
}

function checkProductionEasFlags() {
  const eas = readJson("eas.json");
  const prodEnv = eas?.build?.production?.env ?? {};

  if (String(prodEnv.EXPO_PUBLIC_ENABLE_BACKEND_LOGGING).toLowerCase() === "true") {
    errors.push(
      "eas.json production env: EXPO_PUBLIC_ENABLE_BACKEND_LOGGING must not be \"true\" in production (privacy risk).",
    );
  }
  if (String(prodEnv.DEBUG_OCR).toLowerCase() === "true") {
    errors.push(
      "eas.json production env: DEBUG_OCR must not be \"true\" in production.",
    );
  }
}

function checkProductionRuntimeFlags() {
  if (String(process.env.FORCE_PREMIUM ?? "").toLowerCase() === "true") {
    errors.push("FORCE_PREMIUM must not be \"true\" in a production build.");
  }
  if (String(process.env.DISABLE_BILLING ?? "").toLowerCase() === "true") {
    errors.push("DISABLE_BILLING must not be \"true\" in a production build.");
  }
}

function checkRevenueCatKeys() {
  if (platform === "android" || !platform) {
    if (!process.env.RC_ANDROID_API_KEY) {
      errors.push("RC_ANDROID_API_KEY is not set — RevenueCat billing will not work on Android.");
    }
  }
  if (platform === "ios" || !platform) {
    if (!process.env.RC_IOS_API_KEY) {
      errors.push("RC_IOS_API_KEY is not set — RevenueCat billing will not work on iOS.");
    }
  }
}

if (profile !== PRODUCTION_BUILD_PROFILE) {
  console.log(
    `[launch-readiness] Skipped checks for profile "${profile || "unknown"}".`,
  );
  process.exit(0);
}

checkLegalUrls();
checkEasAndroidBuildType();
checkApiBaseUrlMapping();
checkAndroidFirebaseConfig();
checkIosFirebaseConfig();
checkProductionEasFlags();
checkProductionRuntimeFlags();
checkRevenueCatKeys();

if (errors.length > 0) {
  console.error(
    `[launch-readiness] Blocking ${platform || "release"} build due to configuration errors:`,
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `[launch-readiness] Production checks passed for ${platform || "release"}.`,
);
