const DEFAULT_FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";

function getRequiredEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON response but received: ${text.slice(0, 200)}`);
  }
}

export async function signInSmokeUser({
  emailEnvName = "SMOKE_EXPORT_TEST_EMAIL",
  passwordEnvName = "SMOKE_EXPORT_TEST_PASSWORD",
} = {}) {
  const apiKey = getRequiredEnv("FIREBASE_WEB_API_KEY");
  const email = getRequiredEnv(emailEnvName);
  const password = getRequiredEnv(passwordEnvName);
  const authBaseUrl = (process.env.FIREBASE_AUTH_BASE_URL || DEFAULT_FIREBASE_AUTH_BASE_URL).trim();

  const response = await fetch(
    `${authBaseUrl}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(
      `Firebase sign-in failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  const idToken = String(payload?.idToken || "").trim();
  if (!idToken) {
    throw new Error("Firebase sign-in succeeded but no idToken was returned.");
  }

  return {
    email,
    localId: String(payload?.localId || "").trim(),
    idToken,
  };
}

export async function callAuthenticatedJson(
  pathname,
  {
    method = "GET",
    body = null,
    emailEnvName = "SMOKE_EXPORT_TEST_EMAIL",
    passwordEnvName = "SMOKE_EXPORT_TEST_PASSWORD",
  } = {},
) {
  const smokeApiBaseUrl = (process.env.SMOKE_API_BASE_URL || "https://fitaly-backend-smoke.up.railway.app").trim().replace(/\/$/, "");
  const { idToken, email, localId } = await signInSmokeUser({
    emailEnvName,
    passwordEnvName,
  });
  const url = `${smokeApiBaseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  const payload = await parseJson(response);
  return {
    email,
    localId,
    method,
    payload,
    response,
    url,
  };
}
