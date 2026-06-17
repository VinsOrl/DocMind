import { create } from "zustand";

const useDocumentStore = create((set) => ({
  documents: [],
  currentDocument: null,
  sessions: [],
  currentSession: null,
  messages: [],

  setDocuments: (docs) => set({ documents: docs }),
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  clearChat: () => set({ messages: [], currentSession: null }),
}));

export default useDocumentStore;
