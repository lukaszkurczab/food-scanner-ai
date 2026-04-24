import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useLogin } from "@/feature/Auth/hooks/useLogin";

const mockAuthLogin = jest.fn<(...args: unknown[]) => Promise<{ uid: string }>>();
const mockSetFirebaseUser = jest.fn<(...args: unknown[]) => void>();

jest.mock("@/feature/Auth/services/authService", () => ({
  authLogin: (...args: unknown[]) => mockAuthLogin(...args),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => ({
    setFirebaseUser: (...args: unknown[]) => mockSetFirebaseUser(...args),
  }),
}));

describe("useLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthLogin.mockResolvedValue({ uid: "user-1" });
  });

  it("logs in through auth service and leaves Firebase user state to onAuthStateChanged", async () => {
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("user@example.com", "Strong1!");
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockAuthLogin).toHaveBeenCalledWith("user@example.com", "Strong1!");
    expect(mockSetFirebaseUser).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({});
    expect(result.current.criticalError).toBeNull();
  });

  it("maps invalid credentials without mutating Firebase user state manually", async () => {
    mockAuthLogin.mockRejectedValueOnce({ code: "auth/invalid-credential" });
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("user@example.com", "wrong-password");
    });

    expect(result.current.errors).toEqual({
      password: "invalid_email_or_password",
    });
    expect(mockSetFirebaseUser).not.toHaveBeenCalled();
  });
});
