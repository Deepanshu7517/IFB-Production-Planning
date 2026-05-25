import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  getGroupMessages,
  sendGroupMessage,
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/:id", protectRoute, getGroupById);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/send", protectRoute, sendGroupMessage);
router.post("/:id/add-member", protectRoute, addMemberToGroup);
router.post("/:id/remove-member", protectRoute, removeMemberFromGroup);
router.post("/:id/leave", protectRoute, leaveGroup);
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);

export default router;