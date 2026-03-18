import { useState } from "react";
import { v4 } from "../lib/uuid";

const STORAGE_KEY = "eumirate_local_user_id";

function getOrCreateUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = v4();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export const useLocalUser = () => {
  const [userId] = useState(getOrCreateUserId);
  return { userId };
};
