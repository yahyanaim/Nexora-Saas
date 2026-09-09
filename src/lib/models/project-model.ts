// lib/models/project-model.ts

import mongoose, { Schema, Document, Model } from "mongoose";
import { ProjectStatus } from "@/types/projects";

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: "OWNER" | "MEMBER" | "VIEWER";
}

export interface IProjectTask {
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee?: mongoose.Types.ObjectId;
  dueDate?: Date;
}

export interface IProjectFile {
  name: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IProjectActivity {
  user: mongoose.Types.ObjectId;
  action: string;
  description: string;
  timestamp: Date;
}

export interface IProject extends Document {
  name: string;
  description?: string;
  status: ProjectStatus;
  owner: mongoose.Types.ObjectId;
  members: IProjectMember[];
  tasks: IProjectTask[];
  files: IProjectFile[];
  activities: IProjectActivity[];
  progress: number;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { 
    type: String, 
    enum: ["OWNER", "MEMBER", "VIEWER"], 
    default: "MEMBER" 
  },
});

const ProjectTaskSchema = new Schema<IProjectTask>({
  title: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["todo", "in_progress", "done"], 
    default: "todo" 
  },
  assignee: { type: Schema.Types.ObjectId, ref: "User" },
  dueDate: { type: Date },
});

const ProjectFileSchema = new Schema<IProjectFile>({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const ProjectActivitySchema = new Schema<IProjectActivity>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ProjectSchema = new Schema<IProject>(
  {
    name: { 
      type: String, 
      required: [true, "Project name is required"], 
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.ACTIVE,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [ProjectMemberSchema],
    tasks: [ProjectTaskSchema],
    files: [ProjectFileSchema],
    activities: [ProjectActivitySchema],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

ProjectSchema.index({ status: 1, owner: 1 });
ProjectSchema.index({ createdAt: -1 });

const Project: Model<IProject> =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);

export default Project;