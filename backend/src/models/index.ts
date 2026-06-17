import sequelize    from '../config/database';
import Role         from './Role';
import User         from './User';
import Project      from './Project';
import Task         from './Task';
import TaskAssignment from './TaskAssignment';
import TaskHistory  from './TaskHistory';
import WorkLog      from './WorkLog';
import LogReply     from './LogReply';
import Notification from './Notification';
import AuditLog     from './AuditLog';

// Role ↔ User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });


// User / Project
User.hasMany(Project, { foreignKey: 'manager_id', as: 'managedProjects' });
Project.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
User.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Project ↔ Task
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// User / Task
User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'taskCreator' });

// Task ↔ TaskAssignment
Task.hasMany(TaskAssignment, { foreignKey: 'task_id', as: 'assignments' });
TaskAssignment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskAssignment, { foreignKey: 'assigned_to', as: 'taskAssignments' });
TaskAssignment.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(TaskAssignment, { foreignKey: 'assigned_by', as: 'assignmentsMade' });
TaskAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

// Task ↔ TaskHistory
Task.hasMany(TaskHistory, { foreignKey: 'task_id', as: 'history' });
TaskHistory.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskHistory, { foreignKey: 'changed_by', as: 'taskChanges' });
TaskHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedBy' });

// Task ↔ WorkLog
Task.hasMany(WorkLog, { foreignKey: 'task_id', as: 'workLogs' });
WorkLog.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(WorkLog, { foreignKey: 'user_id', as: 'workLogs' });
WorkLog.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// WorkLog ↔ LogReply
WorkLog.hasMany(LogReply, { foreignKey: 'log_id', as: 'replies' });
LogReply.belongsTo(WorkLog, { foreignKey: 'log_id', as: 'workLog' });
User.hasMany(LogReply, { foreignKey: 'user_id', as: 'logReplies' });
LogReply.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Task.hasMany(Notification, { foreignKey: 'task_id', as: 'notifications' });
Notification.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

// AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  sequelize,
  Role,
  User,
  Project,
  Task,
  TaskAssignment,
  TaskHistory,
  WorkLog,
  LogReply,
  Notification,
  AuditLog,
};