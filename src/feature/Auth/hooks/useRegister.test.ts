import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useRegister } from "@/feature/Auth/hooks/useRegister";

const mockAuthRegister = jest.fn<(...args: unknown[]) => Promise<{ uid: string }>>();
const mockIsUsernameAvailable = jest.fn<(...args: unknown[]) => Promise<boolean>>();

jest.mock("@/feature/Auth/services/authService", () => ({
  authRegister: (...args: unknown[]) => mockAuthRegister(...args),
}));

jest.mock("@/services/user/usernameService", () => ({
  isUsernameAvailable: (...args: unknown[]) => mockIsUsernameAvailable(...args),
}));

describe("useRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthRegister.mockResolvedValue({ uid: "user-1" });
    mockIsUsernameAvailable.mockResolvedValue(true);
  });

  it("validates input locally before hitting services", async () => {
    const { result } = renderHook(() => useRegister());

    await act(async () => {
      await result.current.register(
        "bad-email",
        "weak",
        "different",
        "ab",
        false,
      );
    });

    expect(result.current.errors).toEqual({
      email: "invalid_email",
      username: "username_too_short",
      password: "password_too_weak",
      confirmPassword: "passwords_dont_match",
      terms: "must_accept_terms",
    });
    expect(mockIsUsernameAvailable).not.toHaveBeenCalled();
    expect(mockAuthRegister).not.toHaveBeenCalled();
  });

  it("registers user and leaves auth state to Firebase listener", async () => {
    const { result } = renderHook(() => useRegister());

    await act(async () => {
      await result.current.register(
        "user@example.com",
        "Strong1!",
        "Strong1!",
        "neo",
        true,
      );
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockIsUsernameAvailable).toHaveBeenCalledWith("neo");
    expect(mockAuthRegister).toHaveBeenCalledWith(
      "user@example.com",
      "Strong1!",
      "neo",
    );
    expect(result.current.errors).toEqual({});
  });

  it("surfaces username_taken without creating auth user", async () => {
    mockIsUsernameAvailable.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useRegister());

    await act(async () => {
      await result.current.register(
        "user@example.com",
        "Strong1!",
        "Strong1!",
        "neo",
        true,
      );
    });

    expect(result.current.errors).toEqual({ username: "username_taken" });
    expect(mockAuthRegister).not.toHaveBeenCalled();
  });

  it("surfaces username_taken when backend claim loses the race", async () => {
    mockAuthRegister.mockRejectedValueOnce({ code: "username/unavailable" });
    const { result } = renderHook(() => useRegister());

    await act(async () => {
      await result.current.register(
        "user@example.com",
        "Strong1!",
        "Strong1!",
        "neo",
        true,
      );
    });

    expect(result.current.errors).toEqual({ username: "username_taken" });
  });
});
