import { BackHandler } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

type BeforeRemoveListener = (event: {
  data: { action: { type: string } };
  preventDefault: () => void;
}) => void;

function createNavigationMock() {
  let beforeRemoveListener: BeforeRemoveListener | undefined;

  const navigation = {
    addListener: jest.fn(
      (_eventName: string, listener: BeforeRemoveListener) => {
        beforeRemoveListener = listener;
        return jest.fn();
      },
    ),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  return {
    navigation,
    emitBeforeRemove(actionType: string) {
      const preventDefault = jest.fn();
      beforeRemoveListener?.({
        data: { action: { type: actionType } },
        preventDefault,
      });
      return preventDefault;
    },
  };
}

describe("useUnsavedChangesGuard", () => {
  let hardwareBackListener: (() => boolean) | undefined;

  beforeEach(() => {
    hardwareBackListener = undefined;
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(
        ((_eventName: string, listener: () => boolean) => {
          hardwareBackListener = listener;
          return { remove: jest.fn() };
        }) as typeof BackHandler.addEventListener,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("blocks back removal and opens confirmation when there are unsaved changes", () => {
    const { navigation, emitBeforeRemove } = createNavigationMock();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({
        navigation,
        hasUnsavedChanges: true,
      }),
    );

    let preventDefault = jest.fn();
    act(() => {
      preventDefault = emitBeforeRemove("GO_BACK");
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.confirmVisible).toBe(true);
  });

  it("confirms exit by dispatching the pending action and invoking onDiscard", () => {
    const onDiscard = jest.fn();
    const { navigation, emitBeforeRemove } = createNavigationMock();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({
        navigation,
        hasUnsavedChanges: true,
        onDiscard,
      }),
    );

    act(() => {
      emitBeforeRemove("GO_BACK");
    });
    act(() => {
      result.current.confirmExit();
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
    expect(result.current.confirmVisible).toBe(false);
  });

  it("requests exit immediately when there are no unsaved changes", () => {
    const onExit = jest.fn();
    const { navigation } = createNavigationMock();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({
        navigation,
        hasUnsavedChanges: false,
        onExit,
      }),
    );

    act(() => {
      result.current.requestExit();
    });

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(result.current.confirmVisible).toBe(false);
  });

  it("opens and closes confirmation via Android hardware back", () => {
    const { navigation } = createNavigationMock();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({
        navigation,
        hasUnsavedChanges: true,
      }),
    );

    let handled = false;
    act(() => {
      handled = hardwareBackListener?.() ?? false;
    });
    expect(handled).toBe(true);
    expect(result.current.confirmVisible).toBe(true);

    act(() => {
      handled = hardwareBackListener?.() ?? false;
    });
    expect(handled).toBe(true);
    expect(result.current.confirmVisible).toBe(false);
  });

  it("runs pre-exit handler before showing confirmation", () => {
    const onBeforeExitAttempt = jest.fn(() => true);
    const { navigation, emitBeforeRemove } = createNavigationMock();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({
        navigation,
        hasUnsavedChanges: true,
        onBeforeExitAttempt,
      }),
    );

    let preventDefault = jest.fn();
    act(() => {
      preventDefault = emitBeforeRemove("GO_BACK");
    });
    expect(onBeforeExitAttempt).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.confirmVisible).toBe(false);

    act(() => {
      result.current.requestExit();
    });
    expect(onBeforeExitAttempt).toHaveBeenCalledTimes(2);
    expect(result.current.confirmVisible).toBe(false);
  });
});
