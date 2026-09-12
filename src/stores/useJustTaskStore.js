import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export const useJustTaskStore = create((set) => ({
  justTaskBoards: [],
  isLoading: false,
  error: null,

  loadJustTaskBoards: async () => {
    set({ isLoading: true, error: null });

    try {
      const justTaskBoards = await invoke("get_just_task_boards");
      set({ justTaskBoards, isLoading: false });
      return justTaskBoards;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  createJustTaskBoard: async (name) => {
    set({ error: null });

    try {
      const createdBoard = await invoke("create_just_task_board", { name });

      set((state) => ({
        justTaskBoards: [...state.justTaskBoards, createdBoard],
      }));

      return createdBoard;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteJustTaskBoard: async (justTaskId) => {
    set({ error: null });

    try {
      await invoke("delete_just_task_board", { justTaskId });

      set((state) => ({
        justTaskBoards: state.justTaskBoards.filter(
          (board) => Number(board.id) !== Number(justTaskId),
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  moveJustTaskBoardToProject: async (justTaskId, projectId) => {
    set({ error: null });

    try {
      const movedBoard = await invoke("move_just_task_board_to_project", {
        justTaskId,
        projectId,
      });

      set((state) => ({
        justTaskBoards: state.justTaskBoards.filter(
          (board) => Number(board.id) !== Number(justTaskId),
        ),
      }));

      return movedBoard;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
