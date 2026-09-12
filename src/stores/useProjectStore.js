import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export const useProjectStore = create((set) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const projects = await invoke("get_project_tree");

      set({
        projects,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: String(error),
        isLoading: false,
      });
    }
  },

  createProject: async (name) => {
    set({ error: null });

    try {
      const createdProject = await invoke("create_project", {
        name,
      });

      set((state) => ({
        projects: [...state.projects, createdProject],
      }));

      return createdProject;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  createBoard: async (projectId, name) => {
    set({ error: null });

    try {
      const createdBoard = await invoke("create_board", {
        projectId,
        name,
      });

      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                boards: [...project.boards, createdBoard],
              }
            : project,
        ),
      }));

      return createdBoard;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    set({ error: null });

    try {
      await invoke("delete_project", { projectId });

      set((state) => ({
        projects: state.projects.filter(
          (project) => project.id !== projectId,
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteBoard: async (projectId, boardId) => {
    set({ error: null });

    try {
      await invoke("delete_board", {
        projectId,
        boardId,
      });

      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                boards: project.boards.filter(
                  (board) => board.id !== boardId,
                ),
              }
            : project,
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  moveBoardToJustTasks: async (projectId, boardId) => {
    set({ error: null });

    try {
      const movedBoard = await invoke("move_board_to_just_tasks", {
        projectId,
        boardId,
      });

      set((state) => ({
        projects: state.projects.map((project) =>
          Number(project.id) === Number(projectId)
            ? {
                ...project,
                boards: project.boards.filter(
                  (board) => Number(board.id) !== Number(boardId),
                ),
              }
            : project,
        ),
      }));

      return movedBoard;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
