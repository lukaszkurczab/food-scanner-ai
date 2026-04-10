#!/usr/bin/env node

import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readinessLib from "./check-launch-readiness.lib.js";

const TARGET_APP_ID = "com.lkurczab.fitaly";
const MIN_ANDROID_TARGET_SDK = 35;
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

function checkAndroidTargetSdk() {
  if (platform && platform !== "android") {
    return;
  }

  const androidDir = path.join(rootDir, "android");
  const gradleUserHome = path.join(
    os.tmpdir(),
    "fitaly-gradle-launch-readiness",
  );
  fs.mkdirSync(gradleUserHome, { recursive: true });

  let propertiesOutput = "";
  try {
    propertiesOutput = execFileSync("./gradlew", ["-q", ":app:properties"], {
      cwd: androidDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GRADLE_USER_HOME: gradleUserHome,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = String(error?.stderr || error?.message || "").trim();
    errors.push(
      `Unable to resolve Android targetSdkVersion via Gradle. Ensure Java/Gradle are available. ${stderr}`,
    );
    return;
  }

  const targetSdkMatch = propertiesOutput.match(
    /(?:^|\n)\s*targetSdkVersion:\s*(\d+)/,
  );

  if (!targetSdkMatch) {
    errors.push(
      "Unable to parse Android targetSdkVersion from ./android/gradlew :app:properties output.",
    );
    return;
  }

  const targetSdkVersion = Number.parseInt(targetSdkMatch[1], 10);
  if (Number.isNaN(targetSdkVersion)) {
    errors.push("Android targetSdkVersion is not a valid integer.");
    return;
  }

  if (targetSdkVersion < MIN_ANDROID_TARGET_SDK) {
    errors.push(
      `Android targetSdkVersion must be >= ${MIN_ANDROID_TARGET_SDK} (got: ${targetSdkVersion}).`,
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

function checkSentryDsn() {
  const sentryDsn = (process.env.SENTRY_DSN ?? "").trim();
  if (!sentryDsn) {
    console.warn(
      "[launch-readiness] WARNING: SENTRY_DSN is not set — production crashes will not be tracked.",
    );
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
checkAndroidTargetSdk();
checkApiBaseUrlMapping();
checkAndroidFirebaseConfig();
checkIosFirebaseConfig();
checkProductionEasFlags();
checkProductionRuntimeFlags();
checkRevenueCatKeys();
checkSentryDsn();

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
