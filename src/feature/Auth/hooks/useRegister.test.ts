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
const mockCreateDefaultKeepLoggingNotification = jest.fn<
  (...args: unknown[]) => Promise<void>
>();
const mockSetUser = jest.fn<(user: { uid: string }) => void>();

jest.mock("@/feature/Auth/services/authService", () => ({
  authRegister: (...args: unknown[]) => mockAuthRegister(...args),
}));

jest.mock("@/services/user/usernameService", () => ({
  isUsernameAvailable: (...args: unknown[]) => mockIsUsernameAvailable(...args),
}));

jest.mock("@/services/notifications/notificationsRepository", () => ({
  createDefaultKeepLoggingNotification: (...args: unknown[]) =>
    mockCreateDefaultKeepLoggingNotification(...args),
}));

describe("useRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthRegister.mockResolvedValue({ uid: "user-1" });
    mockIsUsernameAvailable.mockResolvedValue(true);
    mockCreateDefaultKeepLoggingNotification.mockResolvedValue(undefined);
  });

  it("validates input locally before hitting services", async () => {
    const { result } = renderHook(() => useRegister(mockSetUser as never));

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

  it("registers user and seeds default notification through services", async () => {
    const { result } = renderHook(() => useRegister(mockSetUser as never));

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
    expect(mockCreateDefaultKeepLoggingNotification).toHaveBeenCalledWith(
      "user-1",
    );
    expect(mockSetUser).toHaveBeenCalledWith({ uid: "user-1" });
    expect(result.current.errors).toEqual({});
  });

  it("surfaces username_taken without creating auth user", async () => {
    mockIsUsernameAvailable.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useRegister(mockSetUser as never));

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
    expect(mockCreateDefaultKeepLoggingNotification).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it("surfaces username_taken when backend claim loses the race", async () => {
    mockAuthRegister.mockRejectedValueOnce({ code: "username/unavailable" });
    const { result } = renderHook(() => useRegister(mockSetUser as never));

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
    expect(mockCreateDefaultKeepLoggingNotification).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});
