import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, members, groupPic } = req.body;
    const adminId = req.user._id;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: "Name and members are required" });
    }

    // Ensure admin is included in members
    const allMembers = [...new Set([adminId.toString(), ...members])];

    let groupPicUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      groupPicUrl = uploadResponse.secure_url;
    }

    const newGroup = new Group({
      name,
      description: description || "",
      groupPic: groupPicUrl,
      admin: adminId,
      members: allMembers,
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id)
      .populate("admin", "-password")
      .populate("members", "-password");
    // Instead of looping allMembers:
    allMembers.forEach((memberId) => {
      // Use the personal room we created in Fix 1
      io.to(memberId.toString()).emit("newGroup", populatedGroup);
    });

    // Emit to all members that a new group was created
    allMembers.forEach((memberId) => {
      io.to(memberId).emit("newGroup", populatedGroup);
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.log("Error in createGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups for the logged-in user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("admin", "-password")
      .populate("members", "-password")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getUserGroups controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single group by ID
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id)
      .populate("admin", "-password")
      .populate("members", "-password");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some((member) => member._id.toString() === userId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in getGroupById controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({ groupId: id, messageType: "group" })
      .populate("senderId", "-password")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: groupId } = req.params;
    const senderId = req.user._id;
    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    // REPLACE the member loop with a single line:
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    if (!group.members.includes(senderId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    
    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      messageType: "group",
    });
    
    await newMessage.save();
    
    const populatedMessage = await Message.findById(newMessage._id).populate(
      "senderId",
      "-password"
    );
    io.to(`group_${groupId}`).emit("newGroupMessage", {
      groupId,
      message: populatedMessage,
    });

    // Update group's updatedAt
    group.updatedAt = new Date();
    await group.save();

    // Emit to all group members except sender
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        io.to(memberId.toString()).emit("newGroupMessage", {
          groupId,
          message: populatedMessage,
        });
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add member to group
export const addMemberToGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("admin", "-password")
      .populate("members", "-password");

    // Notify all members including the new one
    updatedGroup.members.forEach((member) => {
      io.to(member._id.toString()).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in addMemberToGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove member from group
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    // Cannot remove admin
    if (userId === group.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove admin from group" });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "User is not a member" });
    }

    group.members = group.members.filter((memberId) => memberId.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("admin", "-password")
      .populate("members", "-password");

    // Notify all remaining members
    updatedGroup.members.forEach((member) => {
      io.to(member._id.toString()).emit("groupUpdated", updatedGroup);
    });

    // Notify removed user
    io.to(userId).emit("removedFromGroup", groupId);

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in removeMemberFromGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Admin cannot leave group. Transfer admin rights or delete group"
      });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    group.members = group.members.filter((memberId) => memberId.toString() !== userId.toString());
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("admin", "-password")
      .populate("members", "-password");

    // Notify all remaining members
    updatedGroup.members.forEach((member) => {
      io.to(member._id.toString()).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.log("Error in leaveGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update group details
export const updateGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { name, description, groupPic } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only admin can update group" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      group.groupPic = uploadResponse.secure_url;
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("admin", "-password")
      .populate("members", "-password");

    // Notify all members
    updatedGroup.members.forEach((member) => {
      io.to(member._id.toString()).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in updateGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    // Notify all members before deleting
    group.members.forEach((memberId) => {
      io.to(memberId.toString()).emit("groupDeleted", groupId);
    });

    // Delete all group messages
    await Message.deleteMany({ groupId });

    // Delete group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};